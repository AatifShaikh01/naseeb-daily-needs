import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db, payments, products, purchaseItems, purchases, saleItems, sales, staff, stockIn } from "@/db";
import { addDays, todayIST } from "@/lib/dates";
import { lowStockThreshold } from "@/lib/config";

/* numeric/bigint → number (pg string deta hai) */
const num = (v: string | number | null | undefined) => Number(v ?? 0);
export const money = (v: string | number | null | undefined) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------------- Today summary ---------------- */
export type TodaySummary = {
  totalSalesAmount: number;
  deliveredBoxes: number;
  salesAmount: number;
  salesCount: number;
  totalPending: number;
  paymentsToday: number;
};

export async function getTodaySummary(today = todayIST()): Promise<TodaySummary> {
  const [totalSalesRows, deliveredRows, salesRows, pendingRows, payRows] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${sales.totalAmount}),0)`,
      })
      .from(sales),
    db
      .select({ total: sql<string>`coalesce(sum(${saleItems.boxes}),0)` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(eq(sales.saleDate, today)),
    db
      .select({
        count: sql<string>`count(*)`,
        total: sql<string>`coalesce(sum(${sales.totalAmount}),0)`,
      })
      .from(sales)
      .where(eq(sales.saleDate, today)),
    db
      .select({
        total: sql<string>`coalesce(sum(${sales.totalAmount} - ${sales.paidAmount}),0)`,
      })
      .from(sales),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}),0)` })
      .from(payments)
      .where(eq(payments.paidOn, today)),
  ]);

  return {
    totalSalesAmount: num(totalSalesRows[0]?.total),
    deliveredBoxes: num(deliveredRows[0]?.total),
    salesAmount: num(salesRows[0]?.total),
    salesCount: num(salesRows[0]?.count),
    totalPending: num(pendingRows[0]?.total),
    paymentsToday: num(payRows[0]?.total),
  };
}

/* ---------------- Today activity (stock in + sales) ---------------- */
export type ActivityItem =
  | { kind: "stock"; id: number; time: Date; productName: string; size: string; boxes: number; note: string }
  | { kind: "sale"; id: number; time: Date; customerName: string; boxes: number; amount: number };

export async function getTodayActivity(today = todayIST()): Promise<ActivityItem[]> {
  const [stockRows, saleRows] = await Promise.all([
    db
      .select({
        id: stockIn.id,
        createdAt: stockIn.createdAt,
        boxes: stockIn.boxes,
        note: stockIn.note,
        productName: products.name,
        size: products.size,
      })
      .from(stockIn)
      .innerJoin(products, eq(stockIn.productId, products.id))
      .where(eq(stockIn.entryDate, today)),
    db
      .select({
        id: sales.id,
        createdAt: sales.createdAt,
        customerName: sales.customerName,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .where(eq(sales.saleDate, today)),
  ]);

  // Aaj ki sales ke boxes alag query me — subquery wala raw SQL
  // Neon HTTP driver par 0 de raha tha, isliye JS me sum kar rahe hain
  const saleIds = saleRows.map((s) => s.id);
  const boxesBySale = new Map<number, number>();
  if (saleIds.length > 0) {
    const itemRows = await db
      .select({ saleId: saleItems.saleId, boxes: saleItems.boxes })
      .from(saleItems);
    for (const it of itemRows) {
      if (saleIds.includes(it.saleId)) boxesBySale.set(it.saleId, (boxesBySale.get(it.saleId) ?? 0) + it.boxes);
    }
  }

  const items: ActivityItem[] = [
    ...stockRows.map((r) => ({
      kind: "stock" as const,
      id: r.id,
      time: r.createdAt,
      productName: r.productName,
      size: r.size,
      boxes: r.boxes,
      note: r.note,
    })),
    ...saleRows.map((r) => ({
      kind: "sale" as const,
      id: r.id,
      time: r.createdAt,
      customerName: r.customerName,
      boxes: boxesBySale.get(r.id) ?? 0,
      amount: num(r.totalAmount),
    })),
  ];

  items.sort((a, b) => b.time.getTime() - a.time.getTime());
  return items;
}

/* ---------------- Product-wise current stock ---------------- */
export type ProductStock = {
  id: number;
  name: string;
  size: string;
  balance: number;
  inBoxes: number;
  soldBoxes: number;
  low: boolean;
};

export async function getProductStock(): Promise<ProductStock[]> {
  const [productRows, inRows, soldRows] = await Promise.all([
    db.select().from(products).orderBy(asc(products.id)),
    db
      .select({ productId: stockIn.productId, total: sql<string>`coalesce(sum(${stockIn.boxes}),0)` })
      .from(stockIn)
      .groupBy(stockIn.productId),
    db
      .select({ productId: saleItems.productId, total: sql<string>`coalesce(sum(${saleItems.boxes}),0)` })
      .from(saleItems)
      .groupBy(saleItems.productId),
  ]);

  const inMap = new Map(inRows.map((r) => [r.productId, num(r.total)]));
  const soldMap = new Map(soldRows.map((r) => [r.productId, num(r.total)]));
  const threshold = lowStockThreshold();

  return productRows.map((p) => {
    const inBoxes = inMap.get(p.id) ?? 0;
    const soldBoxes = soldMap.get(p.id) ?? 0;
    const balance = inBoxes - soldBoxes;
    return { id: p.id, name: p.name, size: p.size, balance, inBoxes, soldBoxes, low: balance < threshold };
  });
}

/* ---------------- Last 7 days sales (bar chart) ---------------- */
export type DailySalesPoint = { date: string; label: string; amount: number };

export async function getLast7DaysSales(today = todayIST()): Promise<DailySalesPoint[]> {
  const start = addDays(today, -6);
  const rows = await db
    .select({ date: sales.saleDate, total: sql<string>`coalesce(sum(${sales.totalAmount}),0)` })
    .from(sales)
    .where(and(gte(sales.saleDate, start), lte(sales.saleDate, today)))
    .groupBy(sales.saleDate);

  const map = new Map(rows.map((r) => [r.date, num(r.total)]));
  const points: DailySalesPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const label = new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    points.push({ date: d, label, amount: map.get(d) ?? 0 });
  }
  return points;
}

/** Total sales for the previous 7-day window (day -13 through day -7) —
 *  used to show the % change vs the current period. */
export async function getPrevious7DaysSales(today = todayIST()): Promise<number> {
  const start = addDays(today, -13);
  const end = addDays(today, -7);
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${sales.totalAmount}),0)` })
    .from(sales)
    .where(and(gte(sales.saleDate, start), lte(sales.saleDate, end)));
  return num(rows[0]?.total);
}

/* ---------------- Staff delivery (Delivered By) ---------------- */
export type StaffDelivery = { staffId: number; name: string; todayBoxes: number; monthBoxes: number };

export async function getStaffDelivery(today = todayIST()): Promise<StaffDelivery[]> {
  const monthStart = `${today.slice(0, 7)}-01`;
  const rows = await db
    .select({
      staffId: staff.id,
      name: staff.name,
      todayBoxes: sql<string>`coalesce(sum(case when ${sales.saleDate} = ${today} then ${saleItems.boxes} else 0 end),0)`,
      monthBoxes: sql<string>`coalesce(sum(case when ${sales.saleDate} >= ${monthStart} then ${saleItems.boxes} else 0 end),0)`,
    })
    .from(staff)
    .leftJoin(sales, eq(sales.deliveredBy, staff.id))
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .groupBy(staff.id, staff.name)
    .orderBy(asc(staff.id));

  return rows.map((r) => ({
    staffId: r.staffId,
    name: r.name,
    todayBoxes: num(r.todayBoxes),
    monthBoxes: num(r.monthBoxes),
  }));
}

/* ---------------- Top pending customers ---------------- */
export type PendingCustomer = { key: string; name: string; phone: string; pending: number; oldestDate: string };

export async function getTopPendingCustomers(limit = 5): Promise<PendingCustomer[]> {
  const rows = await db
    .select({
      name: sales.customerName,
      phone: sales.customerPhone,
      pending: sql<string>`coalesce(sum(${sales.totalAmount} - ${sales.paidAmount}),0)`,
      oldestDate: sql<string>`min(${sales.saleDate})`,
    })
    .from(sales)
    .groupBy(sales.customerName, sales.customerPhone);

  const merged = new Map<string, PendingCustomer>();
  for (const r of rows) {
    const key = `${(r.name ?? "").trim().toLowerCase()}|${(r.phone ?? "").replace(/\D/g, "")}`;
    const pending = num(r.pending);
    const existing = merged.get(key);
    if (existing) {
      existing.pending += pending;
      if (r.oldestDate < existing.oldestDate) existing.oldestDate = r.oldestDate;
    } else {
      merged.set(key, {
        key,
        name: (r.name ?? "").trim(),
        phone: r.phone ?? "",
        pending,
        oldestDate: r.oldestDate,
      });
    }
  }

  return [...merged.values()]
    .filter((c) => c.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, limit);
}

/* ---------------- Daily report (date picker) ---------------- */
export type DailyReport = {
  date: string;
  stockInBoxes: number;
  stockInRows: { productName: string; size: string; boxes: number }[];
  salesAmount: number;
  salesBoxes: number;
  salesCount: number;
  paymentsReceived: number;
  pendingAtDate: number;
};

export async function getDailyReport(date: string): Promise<DailyReport> {
  const [stockRows, saleRows, itemRows, payRows, pendRows] = await Promise.all([
    db
      .select({ boxes: sql<string>`coalesce(sum(${stockIn.boxes}),0)` })
      .from(stockIn)
      .where(eq(stockIn.entryDate, date)),
    db
      .select({ count: sql<string>`count(*)`, amount: sql<string>`coalesce(sum(${sales.totalAmount}),0)` })
      .from(sales)
      .where(eq(sales.saleDate, date)),
    db
      .select({ boxes: sql<string>`coalesce(sum(${saleItems.boxes}),0)` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(eq(sales.saleDate, date)),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}),0)` })
      .from(payments)
      .where(eq(payments.paidOn, date)),
    // pending at end of that date: all sales up to & including date
    db
      .select({ total: sql<string>`coalesce(sum(${sales.totalAmount} - ${sales.paidAmount}),0)` })
      .from(sales)
      .where(lte(sales.saleDate, date)),
  ]);

  // product-wise stock-in for that date
  const stockInProducts = await db
    .select({
      name: products.name,
      size: products.size,
      boxes: sql<string>`coalesce(sum(${stockIn.boxes}),0)`,
    })
    .from(stockIn)
    .innerJoin(products, eq(stockIn.productId, products.id))
    .where(eq(stockIn.entryDate, date))
    .groupBy(products.name, products.size);

  return {
    date,
    stockInBoxes: num(stockRows[0]?.boxes),
    stockInRows: stockInProducts.map((r) => ({
      productName: r.name,
      size: r.size,
      boxes: num(r.boxes),
    })),
    salesAmount: num(saleRows[0]?.amount),
    salesBoxes: num(itemRows[0]?.boxes),
    salesCount: num(saleRows[0]?.count),
    paymentsReceived: num(payRows[0]?.total),
    pendingAtDate: num(pendRows[0]?.total),
  };
}

/* ---------------- Monthly profit ----------------
 * Har product: kitne me aaya (purchase avg rate) vs kitne me bika (sale avg
 * rate) — sirf beche gaye boxes par profit.
 * Cost basis: us MAHINE ki khareed ka weighted avg; agar us mahine khareed
 * nahi hui to pichli sabse recent khareed ka rate (fallback). */

export type ProfitRow = {
  name: string;
  size: string;
  buyRate: number | null; // avg khareed rate (null = no purchase history)
  buyBoxes: number; // us mahine khareede gaye boxes
  sellRate: number;
  sellBoxes: number;
  revenue: number;
  cost: number; // sellBoxes * buyRate
  profit: number; // revenue - cost
};

export type MonthlyProfit = {
  month: string;
  rows: ProfitRow[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
};

export async function getMonthlyProfit(month: string): Promise<MonthlyProfit> {
  const start = `${month}-01`;
  const end = `${month}-31`;
  const saleRange = and(gte(sales.saleDate, start), lte(sales.saleDate, end));
  const purchRange = and(gte(purchases.entryDate, start), lte(purchases.entryDate, end));

  const [soldRows, monthBuyRows, historyRows] = await Promise.all([
    // Us mahine ki bikri — product-wise
    db
      .select({
        productId: products.id,
        name: products.name,
        size: products.size,
        boxes: sql<string>`coalesce(sum(${saleItems.boxes}),0)`,
        revenue: sql<string>`coalesce(sum(${saleItems.boxes} * ${saleItems.ratePerBox}),0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(saleRange)
      .groupBy(products.id, products.name, products.size),
    // Us mahine ki khareed — product-wise
    db
      .select({
        productId: products.id,
        boxes: sql<string>`coalesce(sum(${purchaseItems.boxes}),0)`,
        cost: sql<string>`coalesce(sum(${purchaseItems.boxes} * ${purchaseItems.ratePerBox}),0)`,
      })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .where(and(purchRange, eq(purchases.direction, "in")))
      .groupBy(products.id),
    // Har product ki pichli khareed (fallback rate) — latest purchase first
    db
      .select({
        productId: purchaseItems.productId,
        rate: purchaseItems.ratePerBox,
        entryDate: purchases.entryDate,
      })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .where(eq(purchases.direction, "in"))
      .orderBy(desc(purchases.entryDate), desc(purchases.id)),
  ]);

  const monthBuy = new Map<number, { boxes: number; cost: number }>();
  for (const r of monthBuyRows) monthBuy.set(r.productId, { boxes: num(r.boxes), cost: num(r.cost) });

  // Latest purchase rate per product (fallback)
  const latestRate = new Map<number, number>();
  for (const r of historyRows) {
    if (!latestRate.has(r.productId)) latestRate.set(r.productId, num(r.rate));
  }

  const rows: ProfitRow[] = soldRows.map((s) => {
    const sellBoxes = num(s.boxes);
    const revenue = num(s.revenue);
    const sellRate = sellBoxes > 0 ? revenue / sellBoxes : 0;
    const mb = monthBuy.get(s.productId);
    let buyRate: number | null = null;
    let buyBoxes = 0;
    if (mb && mb.boxes > 0) {
      buyBoxes = mb.boxes;
      buyRate = mb.cost / mb.boxes;
    } else if (latestRate.has(s.productId)) {
      buyRate = latestRate.get(s.productId)!;
    }
    const cost = buyRate != null ? sellBoxes * buyRate : 0;
    return {
      name: s.name,
      size: s.size,
      buyRate: buyRate != null ? Math.round(buyRate * 100) / 100 : null,
      buyBoxes,
      sellRate: Math.round(sellRate * 100) / 100,
      sellBoxes,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round((revenue - cost) * 100) / 100,
    };
  });
  rows.sort((a, b) => b.profit - a.profit);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  return {
    month,
    rows,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
  };
}

/* ---------------- Monthly report ---------------- */
export type MonthlyReport = {
  month: string; // YYYY-MM
  productSales: { name: string; size: string; boxes: number; amount: number }[];
  customerSales: { name: string; boxes: number; amount: number }[];
  staffDelivered: { name: string; boxes: number }[];
  totalSalesAmount: number;
  totalBoxesSold: number;
  totalPending: number;
};

export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const start = `${month}-01`;
  const end = `${month}-31`;
  const range = and(gte(sales.saleDate, start), lte(sales.saleDate, end));

  const [productSales, perSaleRows, staffDelivered, totals] = await Promise.all([
    db
      .select({
        name: products.name,
        size: products.size,
        boxes: sql<string>`coalesce(sum(${saleItems.boxes}),0)`,
        amount: sql<string>`coalesce(sum(${saleItems.boxes} * ${saleItems.ratePerBox}),0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(range)
      .groupBy(products.name, products.size)
      .orderBy(desc(sql`sum(${saleItems.boxes})`)),
    db
      .select({
        customerName: sales.customerName,
        totalAmount: sales.totalAmount,
        boxes: sql<string>`coalesce(sum(${saleItems.boxes}),0)`,
      })
      .from(sales)
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .where(range)
      .groupBy(sales.id),
    db
      .select({
        name: staff.name,
        boxes: sql<string>`coalesce(sum(${saleItems.boxes}),0)`,
      })
      .from(staff)
      .leftJoin(sales, and(eq(sales.deliveredBy, staff.id), range))
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .groupBy(staff.id, staff.name)
      .orderBy(desc(sql`sum(${saleItems.boxes})`)),
    db
      .select({
        amount: sql<string>`coalesce(sum(${sales.totalAmount}),0)`,
        pending: sql<string>`coalesce(sum(${sales.totalAmount} - ${sales.paidAmount}),0)`,
      })
      .from(sales)
      .where(range),
  ]);

  // Customer-wise: aggregate per sale FIRST, then merge by normalized name.
  // Summing totalAmount directly over the sale_items join multiplied each
  // sale's amount by its item count — that was the big report bug.
  const custMap = new Map<string, { name: string; boxes: number; amount: number }>();
  for (const s of perSaleRows) {
    const key = (s.customerName ?? "").trim().toLowerCase();
    const ex = custMap.get(key);
    if (ex) {
      ex.boxes += num(s.boxes);
      ex.amount += num(s.totalAmount);
    } else {
      custMap.set(key, { name: (s.customerName ?? "").trim(), boxes: num(s.boxes), amount: num(s.totalAmount) });
    }
  }

  return {
    month,
    productSales: productSales.map((r) => ({
      name: r.name,
      size: r.size,
      boxes: num(r.boxes),
      amount: num(r.amount),
    })),
    customerSales: [...custMap.values()].sort((a, b) => b.amount - a.amount),
    staffDelivered: staffDelivered.map((r) => ({ name: r.name, boxes: num(r.boxes) })),
    totalSalesAmount: num(totals[0]?.amount),
    totalBoxesSold: productSales.reduce((s, r) => s + num(r.boxes), 0),
    totalPending: num(totals[0]?.pending),
  };
}
