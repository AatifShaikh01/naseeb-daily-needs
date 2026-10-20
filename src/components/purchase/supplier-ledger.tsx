"use client";

import { useState, Dispatch, SetStateAction } from "react";
import { ChevronDown, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePurchaseAction } from "@/lib/actions/purchases";
import { SharePurchaseButton } from "./share-purchase-button";
import { SupplierPayDialog } from "./supplier-pay-dialog";

const inr = (n: number) => "\u20B9" + n.toLocaleString("en-IN");
const round2 = (n: number) => Math.round(n * 100) / 100;

function fmtDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function SupplierLedger({ suppliers, purchases, purchaseItems, supplierPayments, editingId, setEditingId }: { suppliers: { id: number; name: string; phone: string | null }[]; purchases: { id: number; supplierId: number; entryDate: string; direction: "in" | "return"; totalAmount: string; paidAmount: string; note: string | null }[]; purchaseItems: { purchaseId: number; productId: number; productName: string; size: string; boxes: number; ratePerBox: string }[]; supplierPayments: { id: number; supplierId: number; amount: string; paidOn: string; mode: string; note: string | null }[]; editingId: number | null; setEditingId: Dispatch<SetStateAction<number | null>>; }) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const totMap = new Map<number, { total: string; paid: string }>();
  for (const p of purchases) {
    const e = totMap.get(p.supplierId);
    if (e) { e.total = (Number(e.total) + Number(p.totalAmount)).toString(); e.paid = (Number(e.paid) + Number(p.paidAmount)).toString(); }
    else { totMap.set(p.supplierId, { total: p.totalAmount, paid: p.paidAmount }); }
  }

  const payMap = new Map<number, { id: number; supplierId: number; amount: string; paidOn: string; mode: string; note: string | null }[]>();
  for (const p of supplierPayments) { const a = payMap.get(p.supplierId) || []; a.push(p); payMap.set(p.supplierId, a); }

  const purchMap = new Map<number, { id: number; supplierId: number; entryDate: string; direction: "in" | "return"; totalAmount: string; paidAmount: string; note: string | null }[]>();
  for (const p of purchases) { const a = purchMap.get(p.supplierId) || []; a.push(p); purchMap.set(p.supplierId, a); }

  const itemMap = new Map<number, { purchaseId: number; productId: number; productName: string; size: string; boxes: number; ratePerBox: string }[]>();
  for (const it of purchaseItems) { const a = itemMap.get(it.purchaseId) || []; a.push(it); itemMap.set(it.purchaseId, a); }

  if (!suppliers.length) return <p className="text-sm text-muted-foreground">No suppliers yet — add one above.</p>;

  async function handleDelete(id: number) {
    const fd = new FormData();
    fd.append("id", String(id));
    const res = await deletePurchaseAction(fd);
    if (res.ok) {
      setDeletingId(null);
      setConfirmingDelete(false);
      toast.success("Purchase deleted");
      window.dispatchEvent(new CustomEvent("purchases-changed"));
    } else {
      setConfirmingDelete(false);
      toast.error(res.error ?? "Could not delete purchase.");
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Supplier Ledger</h2>
      {suppliers.map((s) => {
        const t = totMap.get(s.id);
        const total = Number(t?.total ?? 0);
        const paidTotal = Number(t?.paid ?? 0);
        const due = round2(total - paidTotal);
        const pays = payMap.get(s.id) || [];
        return (
          <Card key={s.id} className="rounded-2xl border border-border bg-card shadow-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base">{s.name}</CardTitle>
                {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{inr(total)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-semibold text-muted-foreground">{inr(paidTotal)}</span>
                  {due > 0 ? <span className="font-semibold text-destructive">{inr(due)} due</span> : due < 0 ? <span className="font-semibold text-primary">{inr(Math.abs(due))} advance</span> : <span className="text-primary">Clear</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <details className="group">
                <summary className="cursor-pointer list-none font-medium py-2">
                  <span>Purchases · Payments</span>
                  <ChevronDown className="ml-1 h-3 w-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border/60 pt-3">
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Purchases</h4>
                  <ul className="divide-y divide-border/60">
                    {purchMap.get(s.id)?.length ? purchMap.get(s.id)!.map((p) => {
                      const its = itemMap.get(p.id) || [];
                      const bal = round2(Number(p.totalAmount) - Number(p.paidAmount));
                      const isEditing = editingId === p.id;
                      const isDeleting = deletingId === p.id;
                      return (
                        <li key={p.id} className="py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold">{fmtDate(p.entryDate)}</span>
                                <span className={rb(p.direction)}>{p.direction === "in" ? "Stock In" : "Return"}</span>
                              </div>
                              {its.length ? <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">{its.map((it, i) => <li key={i}>{it.productName} ({it.size}) × {Math.abs(it.boxes)} @ {inr(Math.abs(Number(it.ratePerBox)))}/box = <span className="text-foreground">{inr(Math.abs(it.boxes * Number(it.ratePerBox)))}</span></li>)}</ul> : null}
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                <span>Total <b>{inr(Math.abs(Number(p.totalAmount)))}</b></span>
                                <span>Paid <b>{inr(Math.abs(Number(p.paidAmount)))}</b></span>
                                {bal > 0 ? <span className="font-semibold text-destructive">Due {inr(bal)}</span> : bal < 0 ? <span className="font-semibold text-primary">Advance {inr(Math.abs(bal))}</span> : <span className="text-primary">Clear</span>}
                                {p.note ? <span className="text-muted-foreground">· {p.note}</span> : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button variant="outline" size="sm" disabled={isDeleting} onClick={() => setEditingId(isEditing ? null : p.id)} className="text-xs">{isEditing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Pencil className="h-3 w-3 mr-1" />}{isEditing ? "Editing…" : "Edit"}</Button>
                              <SharePurchaseButton purchase={{ id: p.id, entryDate: p.entryDate, supplierName: s.name, direction: p.direction, paymentStatus: ps(p.totalAmount, p.paidAmount), totalAmount: Math.abs(Number(p.totalAmount)), paidAmount: Math.abs(Number(p.paidAmount)), items: its.map(it => ({ productName: it.productName, size: it.size, boxes: Math.abs(it.boxes), ratePerBox: Number(it.ratePerBox) })) }} />
                              {!confirmingDelete ? <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => { setDeletingId(p.id); setConfirmingDelete(true); }} className="text-xs">{isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}Delete</Button> : <span className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-1.5"><span className="text-xs font-medium text-destructive">Delete this purchase?</span><Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} disabled={isDeleting}>{isDeleting ? <Loader2 className="animate-spin" /> : null} Yes</Button><Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>No</Button></span>}
                            </div>
                          </div>
                        </li>
                      );
                    }) : <p className="text-xs text-muted-foreground">No purchases recorded yet.</p>}
                  </ul>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payments</h4>
                    {pays.length ? <ul className="divide-y divide-border/60 text-sm">{pays.map((p) => <li key={p.id} className="flex justify-between py-1.5"><span className="text-muted-foreground">{fmtDate(p.paidOn)} · {p.mode}{pn(p.note)}</span><span className="font-semibold">{inr(Number(p.amount))}</span></li>)}</ul> : <p className="text-xs text-muted-foreground">No payments yet.</p>}
                  </div>
                </div>
              </details>
            </CardContent>
            {due > 0 ? <SupplierPayDialog supplierId={s.id} supplierName={s.name} due={due} /> : null}
          </Card>
        );
      })}
    </div>
  );
}


const rb = (dir: "in" | "return") => dir === "in" ? "rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary" : "rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600";
const ps = (t: string, p: string) => { const T = Number(t); const P = Number(p); return P <= 0 ? "pending" : P >= T ? "paid" : "partial"; };
const pn = (note: string | null) => note ? ` · ${note}` : "";

