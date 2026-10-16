import { asc, desc, eq, sql } from "drizzle-orm";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, products, purchaseItems, purchases, supplierPayments } from "@/db";
import { SupplierPayDialog } from "./supplier-pay-dialog";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** "2026-10-16" -> "16 Oct 2026" */
function fmtDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function SupplierLedger({ suppliers }: { suppliers: { id: number; name: string; phone: string | null }[] }) {
  const [totRows, payRows, purchRows, itemRows] = await Promise.all([
    db
      .select({
        supplierId: purchases.supplierId,
        total: sql<string>`coalesce(sum(${purchases.totalAmount}),0)`,
        paid: sql<string>`coalesce(sum(${purchases.paidAmount}),0)`,
      })
      .from(purchases)
      .groupBy(purchases.supplierId),
    db
      .select({
        id: supplierPayments.id,
        supplierId: supplierPayments.supplierId,
        amount: supplierPayments.amount,
        paidOn: supplierPayments.paidOn,
        mode: supplierPayments.mode,
        note: supplierPayments.note,
      })
      .from(supplierPayments)
      .orderBy(asc(supplierPayments.paidOn), asc(supplierPayments.id)),
    db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        entryDate: purchases.entryDate,
        direction: purchases.direction,
        totalAmount: purchases.totalAmount,
        paidAmount: purchases.paidAmount,
        note: purchases.note,
      })
      .from(purchases)
      .orderBy(desc(purchases.entryDate), desc(purchases.id)),
    db
      .select({
        purchaseId: purchaseItems.purchaseId,
        productName: products.name,
        size: products.size,
        boxes: purchaseItems.boxes,
        ratePerBox: purchaseItems.ratePerBox,
      })
      .from(purchaseItems)
      .innerJoin(products, eq(purchaseItems.productId, products.id)),
  ]);

  const totMap = new Map(totRows.map((r) => [r.supplierId, r]));
  const payMap = new Map<number, typeof payRows>();
  for (const p of payRows) {
    const arr = payMap.get(p.supplierId) ?? [];
    arr.push(p);
    payMap.set(p.supplierId, arr);
  }
  const purchMap = new Map<number, typeof purchRows>();
  for (const p of purchRows) {
    const arr = purchMap.get(p.supplierId) ?? [];
    arr.push(p);
    purchMap.set(p.supplierId, arr);
  }
  const itemMap = new Map<number, typeof itemRows>();
  for (const it of itemRows) {
    const arr = itemMap.get(it.purchaseId) ?? [];
    arr.push(it);
    itemMap.set(it.purchaseId, arr);
  }

  if (!suppliers.length) {
    return <p className="text-sm text-muted-foreground">No suppliers yet — add one above.</p>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Supplier Ledger</h2>
      {suppliers.map((s) => {
        const t = totMap.get(s.id);
        const total = Number(t?.total ?? 0);
        const paidTotal = Number(t?.paid ?? 0);
        const due = round2(total - paidTotal);
        const pays = payMap.get(s.id) ?? [];
        const supPurchases = purchMap.get(s.id) ?? [];
        let boxesReceived = 0;
        for (const p of supPurchases) {
          if (p.direction !== "in") continue;
          for (const it of itemMap.get(p.id) ?? []) boxesReceived += Math.max(it.boxes, 0);
        }
        return (
          <Card key={s.id}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {s.phone || "No phone"} · Total {inr(total)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${due > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {due > 0 ? `Due ${inr(due)}` : "Clear"}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <details className="group rounded-xl border border-border/60">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  Poori history — maal, payments, balance
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-border/60 px-3 py-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span>Boxes received: <b>{boxesReceived}</b></span>
                    <span>Paid: <b>{inr(paidTotal)}</b></span>
                    <span className={due > 0 ? "text-destructive" : ""}>Balance: <b>{inr(Math.abs(due))}</b></span>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Kab kitna saaman aaya</h4>
                    {supPurchases.length ? (
                      <ul className="space-y-2">
                        {supPurchases.map((p) => {
                          const its = itemMap.get(p.id) ?? [];
                          const bal = round2(Number(p.totalAmount) - Number(p.paidAmount));
                          return (
                            <li key={p.id} className="rounded-xl border border-border/50 p-2.5 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{fmtDate(p.entryDate)}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.direction === "in" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}>
                                  {p.direction === "in" ? "Stock In" : "Return"}
                                </span>
                              </div>
                              {its.length ? (
                                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                                  {its.map((it, i) => (
                                    <li key={i}>
                                      {it.productName} ({it.size}) × {Math.abs(it.boxes)} @ {inr(Math.abs(Number(it.ratePerBox)))}/box ={" "}
                                      <span className="text-foreground">{inr(Math.abs(it.boxes * Number(it.ratePerBox)))}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                <span>Total <b>{inr(Math.abs(Number(p.totalAmount)))}</b></span>
                                <span>Paid <b>{inr(Math.abs(Number(p.paidAmount)))}</b></span>
                                {bal > 0 ? (
                                  <span className="font-semibold text-destructive">Baki {inr(bal)}</span>
                                ) : bal < 0 ? (
                                  <span className="font-semibold text-primary">Advance {inr(Math.abs(bal))}</span>
                                ) : (
                                  <span className="text-primary">Clear</span>
                                )}
                                {p.note ? <span className="text-muted-foreground">· {p.note}</span> : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Koi purchase record nahi hai.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Payments (kitna pay kiya)</h4>
                    {pays.length ? (
                      <ul className="divide-y divide-border/60 text-sm">
                        {pays.map((p) => (
                          <li key={p.id} className="flex justify-between py-1.5">
                            <span className="text-muted-foreground">
                              {fmtDate(p.paidOn)} · {p.mode}
                              {p.note ? ` · ${p.note}` : ""}
                            </span>
                            <span className="font-semibold">{inr(Number(p.amount))}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Abhi tak koi payment nahi.</p>
                    )}
                  </div>
                </div>
              </details>
              <SupplierPayDialog supplierId={s.id} supplierName={s.name} due={due} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
