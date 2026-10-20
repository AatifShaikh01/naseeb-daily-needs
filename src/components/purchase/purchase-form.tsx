"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createPurchaseAction, updatePurchaseAction } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";

type Row = { key: number; productId: number; boxes: number; rateText: string };

type PurchaseEditData = {
  id: number;
  entryDate: string;
  supplierId: number;
  direction: "in" | "return";
  paymentStatus: "paid" | "pending" | "partial";
  paidAmount: number;
  note: string | null;
  items: { productId: number; boxes: number; ratePerBox: number }[];
};

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";
const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export function PurchaseForm({
  products,
  suppliers,
  today,
  purchase,
  onSaved,
}: {
  products: { id: number; name: string; size: string }[];
  suppliers: { id: number; name: string }[];
  today: string;
  purchase?: PurchaseEditData;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(purchase);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? 0);
  const [direction, setDirection] = useState<"in" | "return">("in");
  const [status, setStatus] = useState<"paid" | "pending" | "partial">("pending");
  const [paidInput, setPaidInput] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: 1, productId: products[0]?.id ?? 0, boxes: 1, rateText: "" }]);
  const [nextKey, setNextKey] = useState(2);

  // Pre-fill form when editing an existing purchase. Depend on the purchase id
  // (not the object) so unrelated re-renders don't wipe in-progress edits.
  const editId = purchase?.id;
  useEffect(() => {
    if (!editing || !purchase) return;
    setSupplierId(purchase.supplierId);
    setDirection(purchase.direction);
    setStatus(purchase.paymentStatus);
    setPaidInput(String(purchase.paidAmount || ""));
    setRows(
      purchase.items.map((it, i) => ({
        key: i + 1,
        productId: it.productId,
        boxes: it.boxes,
        rateText: String(it.ratePerBox),
      })),
    );
    setNextKey(purchase.items.length + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editId]);

  const addRow = useCallback(() => {
    const lastRate = rows[rows.length - 1]?.rateText ?? "";
    setRows((r) => [...r, { key: nextKey, productId: products[0]?.id ?? 0, boxes: 1, rateText: lastRate }]);
    setNextKey((k) => k + 1);
  }, [rows, nextKey, products]);

  const removeRow = useCallback((key: number) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : r)),
  []);
  const updateRow = useCallback((key: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x))),
  []);

  const rowTotal = (r: Row) => r.boxes * (Number(r.rateText) || 0);
  const total = rows.reduce((s, r) => s + rowTotal(r), 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (editing) {
      fd.set("id", String(purchase!.id));
    }
    const filled = rows.filter((r) => r.productId > 0 && r.boxes >= 1);
    if (!filled.length) {
      toast.error("Add at least one product");
      return;
    }
    const badIdx = filled.findIndex((r) => !r.rateText.trim() || (Number(r.rateText) || 0) <= 0);
    if (badIdx >= 0) {
      toast.error(`Item ${rows.indexOf(filled[badIdx]) + 1}: enter a rate per box greater than 0`);
      return;
    }
    const itemsPayload = JSON.stringify(filled.map((r) => ({ productId: r.productId, boxes: r.boxes, ratePerBox: Number(r.rateText) || 0 })));
    fd.set("items", itemsPayload);
    fd.set("supplierId", String(supplierId));
    fd.set("direction", direction);
    fd.set("paymentStatus", status);
    fd.set("paidAmount", status === "partial" ? paidInput || "0" : "0");
    startTransition(async () => {
      const res = await (editing ? updatePurchaseAction(null, fd) : createPurchaseAction(null, fd));
      if (res?.ok) {
        toast.success(editing ? "Purchase updated" : "Purchase saved");
        router.refresh();
        if (!editing) {
          setRows([{ key: Date.now(), productId: products[0]?.id ?? 0, boxes: 1, rateText: "" }]);
        }
        onSaved?.();
      } else {
        toast.error(res.error ?? `Could not ${editing ? "update" : "save"} purchase.`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date</label>
          <input type="date" name="entryDate" key={editing ? purchase!.entryDate : "new"} defaultValue={editing ? purchase!.entryDate : today} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Supplier</label>
          <select className={selectCls} value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["in", "return"] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDirection(d)}
            className={`rounded-xl border py-2.5 text-sm font-medium capitalize ${direction === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            {d === "in" ? "Stock In" : "Return"}
          </button>
        ))}
      </div>
      {/* ROWS2 */}
      {rows.map((row, i) => (
        <div key={row.key} className="space-y-2 rounded-xl border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Item {i + 1}</p>
            <button type="button" onClick={() => removeRow(row.key)} disabled={rows.length === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30" aria-label={`Remove item ${i + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <select className={selectCls} value={row.productId} onChange={(e) => updateRow(row.key, { productId: Number(e.target.value) })}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.size}</option>
            ))}
          </select>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Boxes</p>
              <NumberStepper value={row.boxes} min={1} onChange={(v) => updateRow(row.key, { boxes: v })} />
            </div>
            <div className="w-28">
              <p className="mb-1 text-xs text-muted-foreground">Rate</p>
              <input type="number" min={0} step="0.01" className={inputCls} value={row.rateText}
                onChange={(e) => updateRow(row.key, { rateText: e.target.value })} placeholder="0.00" />
            </div>
            <p className="ml-auto text-sm font-bold">₹{rowTotal(row).toFixed(2)}</p>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addRow} className="w-full">
        <Plus className="h-4 w-4" /> Add another product
      </Button>
      <div className="rounded-xl bg-muted/40 p-4">
        <div className="flex justify-between text-base"><span className="font-medium">Total</span><span className="font-bold">₹{total.toFixed(2)}</span></div>
      </div>
      {direction === "return" ? (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Return value adjusts the supplier balance directly — payment status does not apply.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {(["paid", "pending", "partial"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`rounded-xl border py-2.5 text-sm font-medium capitalize ${status === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                {s}
              </button>
            ))}
          </div>
          {status === "partial" ? (
            <input type="number" min={0} step="0.01" className={inputCls} value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)} placeholder="Amount paid" />
          ) : null}
        </>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Note</label>
        <input name="note" type="text" key={editing ? `note-${purchase!.id}` : "note-new"} defaultValue={editing ? purchase!.note ?? "" : ""} className={inputCls} placeholder="optional" />
      </div>
      {editing && <input type="hidden" name="id" value={String(purchase!.id)} />}
      <Button type="submit" disabled={pending || !suppliers.length} className="w-full" size="lg">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {editing ? "Update Purchase" : "Save Purchase"}
      </Button>
    </form>
  );
}
