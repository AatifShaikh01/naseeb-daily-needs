import { asc, sql } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, purchases, supplierPayments } from "@/db";
import { SupplierPayDialog } from "./supplier-pay-dialog";

export async function SupplierLedger({ suppliers }: { suppliers: { id: number; name: string; phone: string | null }[] }) {
  const [totRows, payRows] = await Promise.all([
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
        supplierId: supplierPayments.supplierId,
        amount: supplierPayments.amount,
        paidOn: supplierPayments.paidOn,
        mode: supplierPayments.mode,
      })
      .from(supplierPayments)
      .orderBy(asc(supplierPayments.paidOn)),
  ]);

  const totMap = new Map(totRows.map((r) => [r.supplierId, r]));
  const payMap = new Map<number, typeof payRows>();
  for (const p of payRows) {
    const arr = payMap.get(p.supplierId) ?? [];
    arr.push(p);
    payMap.set(p.supplierId, arr);
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
        const due = Math.round((total - Number(t?.paid ?? 0)) * 100) / 100;
        const pays = payMap.get(s.id) ?? [];
        return (
          <Card key={s.id}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{s.phone || "No phone"} · Total ₹{total.toLocaleString("en-IN")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${due > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {due > 0 ? `Due ₹${due.toLocaleString("en-IN")}` : "Clear"}
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {pays.length ? (
                <ul className="divide-y divide-border/60 text-sm">
                  {pays.slice(-5).reverse().map((p, i) => (
                    <li key={i} className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">{p.paidOn} · {p.mode}</span>
                      <span className="font-semibold">₹{Number(p.amount).toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
              )}
              <SupplierPayDialog supplierId={s.id} supplierName={s.name} due={due} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
