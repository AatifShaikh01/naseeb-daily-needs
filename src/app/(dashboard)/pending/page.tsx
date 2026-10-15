import { asc } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { PendingView } from "@/components/pending/pending-view";
import { db, payments, products, saleItems, sales, staff } from "@/db";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "Pending" };
// DB-backed live page — build time pe prerender mat karo (data hamesha fresh chahiye).
export const dynamic = "force-dynamic";

type ItemLine = {
  productId: number;
  name: string;
  size: string;
  boxes: number;
  ratePerBox: number;
  lineTotal: number;
};

type SaleRow = {
  id: number;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  deliveredBy: string;
  totalAmount: number;
  paidAmount: number;
  pending: number;
  items: ItemLine[];
  payments: { id: number; amount: number; paidOn: string; mode: string; note: string }[];
};

type CustomerGroup = {
  key: string;
  name: string;
  phone: string | null;
  totalPending: number;
  oldestPendingDate: string | null;
  sales: SaleRow[];
};

export default async function PendingPage() {
  const [saleRows, itemRows, payRows, staffRows, prodRows] = await Promise.all([
    db.select().from(sales).orderBy(asc(sales.saleDate), asc(sales.id)),
    db.select().from(saleItems),
    db.select().from(payments).orderBy(asc(payments.paidOn), asc(payments.id)),
    db.select().from(staff),
    db.select().from(products),
  ]);

  const staffMap = new Map(staffRows.map((s) => [s.id, s.name]));
  const prodMap = new Map(prodRows.map((p) => [p.id, p]));

  const itemsBySale = new Map<number, ItemLine[]>();
  for (const it of itemRows) {
    const p = prodMap.get(it.productId);
    const rate = Number(it.ratePerBox);
    const line: ItemLine = {
      productId: it.productId,
      name: p?.name ?? "",
      size: p?.size ?? "",
      boxes: it.boxes,
      ratePerBox: rate,
      lineTotal: Math.round(it.boxes * rate * 100) / 100,
    };
    const arr = itemsBySale.get(it.saleId);
    if (arr) arr.push(line);
    else itemsBySale.set(it.saleId, [line]);
  }

  const paysBySale = new Map<number, { id: number; amount: number; paidOn: string; mode: string; note: string }[]>();
  for (const py of payRows) {
    const rec = { id: py.id, amount: Number(py.amount), paidOn: py.paidOn, mode: py.mode, note: py.note };
    const arr = paysBySale.get(py.saleId);
    if (arr) arr.push(rec);
    else paysBySale.set(py.saleId, [rec]);
  }

  const normName = (s: string) => s.trim().toLowerCase();
  const normPhone = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

  const groups = new Map<string, CustomerGroup>();
  for (const s of saleRows) {
    const key = `${normName(s.customerName)}|${normPhone(s.customerPhone)}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, name: s.customerName, phone: s.customerPhone, totalPending: 0, oldestPendingDate: null, sales: [] };
      groups.set(key, g);
    }
    const total = Number(s.totalAmount);
    const paid = Number(s.paidAmount);
    const pending = Math.round((total - paid) * 100) / 100;
    g.sales.push({
      id: s.id,
      saleDate: s.saleDate,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      deliveredBy: staffMap.get(s.deliveredBy) ?? "—",
      totalAmount: total,
      paidAmount: paid,
      pending,
      items: itemsBySale.get(s.id) ?? [],
      payments: paysBySale.get(s.id) ?? [],
    });
    if (pending > 0.005) {
      g.totalPending = Math.round((g.totalPending + pending) * 100) / 100;
      if (!g.oldestPendingDate || s.saleDate < g.oldestPendingDate) g.oldestPendingDate = s.saleDate;
    }
  }

  const customers = [...groups.values()]
    .filter((c) => c.totalPending > 0.005)
    .sort((a, b) => b.totalPending - a.totalPending);

  return (
    <>
      <PageHeader
        title="Pending Payments"
        description="Who owes how much, payment history, reminders and payment recording."
      />
      <PendingView customers={customers} today={todayIST()} />
    </>
  );
}

