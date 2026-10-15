import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { SaleCard, type SaleCardData } from "@/components/sale/sale-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db, payments, products, saleItems, sales, staff, stockIn } from "@/db";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "Sales" };


export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    q?: string;
    staff?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  /* Staff + products (for name lookups + edit form) */
  const [staffRows, productRows, inRows, soldByProduct] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.id)),
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

  const staffMap = new Map(staffRows.map((s) => [s.id, s.name]));
  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const inMap = new Map(inRows.map((r) => [r.productId, Number(r.total)]));
  const soldMap = new Map(soldByProduct.map((r) => [r.productId, Number(r.total)]));

  const editProducts = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    size: p.size,
    defaultRatePerBox: p.defaultRatePerBox,
    stockBalance: (inMap.get(p.id) ?? 0) - (soldMap.get(p.id) ?? 0),
  }));
  const editStaff = staffRows.map((s) => ({ id: s.id, name: s.name }));

  /* Build filter conditions */
  const conds = [];
  if (params.date) conds.push(eq(sales.saleDate, params.date));
  if (params.q?.trim()) conds.push(ilike(sales.customerName, `%${params.q.trim()}%`));
  if (params.staff) conds.push(eq(sales.deliveredBy, Number(params.staff)));
  if (params.status === "paid" || params.status === "pending" || params.status === "partial")
    conds.push(eq(sales.paymentStatus, params.status));

  const saleRows = await db
    .select()
    .from(sales)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(sales.saleDate), desc(sales.id))
    .limit(200);

  /* Items + payments for these sales */
  const saleIds = saleRows.map((s) => s.id);
  let itemRows: { saleId: number; productId: number; boxes: number; ratePerBox: string }[] = [];
  let payRows: { saleId: number; amount: string; paidOn: string; mode: string; note: string }[] = [];
  if (saleIds.length > 0) {
    const [it, pm] = await Promise.all([
      db
        .select()
        .from(saleItems)
        .where(sql`${saleItems.saleId} in (${sql.join(saleIds.map((id) => sql`${id}`), sql`, `)})`),
      db
        .select()
        .from(payments)
        .where(sql`${payments.saleId} in (${sql.join(saleIds.map((id) => sql`${id}`), sql`, `)})`)
        .orderBy(desc(payments.paidOn)),
    ]);
    itemRows = it;
    payRows = pm;
  }

  const cards: SaleCardData[] = saleRows.map((s) => ({
    id: s.id,
    saleDate: s.saleDate,
    customerName: s.customerName,
    customerPhone: s.customerPhone,
    deliveredBy: s.deliveredBy,
    paymentStatus: s.paymentStatus,
    totalAmount: s.totalAmount,
    paidAmount: s.paidAmount,
    note: s.note || null,
    items: itemRows
      .filter((i) => i.saleId === s.id)
      .map((i) => {
        const p = productMap.get(i.productId);
        return {
          productId: i.productId,
          boxes: i.boxes,
          ratePerBox: i.ratePerBox,
          productName: p?.name ?? "—",
          productSize: p?.size ?? "",
        };
      }),
    payments: payRows
      .filter((p) => p.saleId === s.id)
      .map((p) => ({ amount: p.amount, paidOn: p.paidOn, mode: p.mode, note: p.note })),
  }));

  const hasFilter = Boolean(params.date || params.q || params.staff || params.status);

  return (
    <>
      <PageHeader
        title="Sales"
        description="All recorded sales — filter by date, customer, staff, or payment status."
      />

      {/* Filters */}
      <form method="get" className="mb-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="date" className="text-xs font-medium text-muted-foreground">Date</label>
            <input id="date" name="date" type="date" defaultValue={params.date ?? ""}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="q" className="text-xs font-medium text-muted-foreground">Customer</label>
            <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Search name"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="staff" className="text-xs font-medium text-muted-foreground">Delivered By</label>
            <select id="staff" name="staff" defaultValue={params.staff ?? ""}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">All</option>
              {staffRows.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="status" className="text-xs font-medium text-muted-foreground">Status</label>
            <select id="status" name="status" defaultValue={params.status ?? ""}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm">Apply</Button>
          {hasFilter ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/sales">Clear</Link>
            </Button>
          ) : null}
          <span className="ml-auto text-sm text-muted-foreground">{cards.length} sale{cards.length === 1 ? "" : "s"}</span>
        </div>
      </form>

      {/* Cards */}
      {cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No sales found.{hasFilter ? " Try clearing the filters." : " Record one from New Sale."}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {cards.map((c) => (
            <SaleCard
              key={c.id}
              sale={c}
              staffName={staffMap.get(c.deliveredBy) ?? "—"}
              products={editProducts}
              staff={editStaff}
              today={todayIST()}
            />
          ))}
        </div>
      )}
    </>
  );
}

