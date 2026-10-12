"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createSaleAction,
  updateSaleAction,
  getCustomerSuggestions,
  type ActionResult,
} from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";

export type SaleProduct = {
  id: number;
  name: string;
  size: string;
  defaultRatePerBox: string | null;
  stockBalance: number;
};
export type SaleStaff = { id: number; name: string };

type ItemRow = {
  key: number;
  productId: number;
  boxes: number;
  rateText: string;
  rateTouched: boolean;
};

const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";
const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export type InitialSale = {
  id: number;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  deliveredBy: number;
  paymentStatus: "paid" | "pending" | "partial";
  paidAmount: number;
  note: string | null;
  items: { productId: number; boxes: number; ratePerBox: number }[];
};

export function SaleForm(props: SaleFormProps) {
  const [nonce, setNonce] = useState(0);
  return (
    <SaleFormFields
      key={nonce}
      {...props}
      onCreated={() => setNonce((n) => n + 1)}
    />
  );
}

type SaleFormProps = {
  products: SaleProduct[];
  staff: SaleStaff[];
  today: string;
  /** Edit mode — jab maujood ho to form prefill + update action use karega. */
  sale?: InitialSale;
  onSaved?: () => void;
};

function SaleFormFields({
  products,
  staff,
  today,
  sale,
  onSaved,
  onCreated,
}: SaleFormProps & { onCreated: () => void }) {
  const router = useRouter();
  const editing = Boolean(sale);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    editing ? updateSaleAction : createSaleAction,
    null,
  );

  /* customer + autosuggest */
  const [name, setName] = useState(sale?.customerName ?? "");
  const [phone, setPhone] = useState(sale?.customerPhone ?? "");
  const [suggestions, setSuggestions] = useState<{ name: string; phone: string | null }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* header */
  const [saleDate, setSaleDate] = useState(sale?.saleDate ?? today);
  const [deliveredBy, setDeliveredBy] = useState<number>(sale?.deliveredBy ?? staff[0]?.id ?? 0);

  /* items */
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const defaultRate = (pid: number) => {
    const v = productMap.get(pid)?.defaultRatePerBox;
    const n = Number(v ?? 0);
    return Number.isFinite(n) && n > 0 ? String(n) : "";
  };
  const [rows, setRows] = useState<ItemRow[]>(() => {
    if (sale?.items?.length) {
      return sale.items.map((it, i) => ({
        key: i + 1,
        productId: it.productId,
        boxes: it.boxes,
        rateText: String(it.ratePerBox),
        rateTouched: true,
      }));
    }
    return [
      { key: 1, productId: products[0]?.id ?? 0, boxes: 1, rateText: defaultRate(products[0]?.id ?? 0), rateTouched: false },
    ];
  });
  const [nextKey, setNextKey] = useState((sale?.items?.length ?? 1) + 1);

  /* payment */
  const [status, setStatus] = useState<"paid" | "pending" | "partial">(
    sale?.paymentStatus ?? "pending",
  );
  const [paidInput, setPaidInput] = useState(
    sale && sale.paymentStatus === "partial" ? String(sale.paidAmount) : "",
  );
  const [note, setNote] = useState(sale?.note ?? "");

  /* totals */
  const totalBoxes = rows.reduce((s, r) => s + r.boxes, 0);
  const totalAmount = Math.round(rows.reduce((s, r) => s + r.boxes * (Number(r.rateText) || 0), 0) * 100) / 100;

  /* low-stock warnings (non-blocking) */
  const lowStockRows = rows.filter(
    (r) => r.productId > 0 && (productMap.get(r.productId)?.stockBalance ?? 0) < r.boxes,
  );

  /* submit → toast + refresh (+ reset on create / close on edit) */
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(editing ? "Sale updated" : "Sale saved");
      router.refresh();
      if (editing) {
        onSaved?.();
      } else {
        // Create-mode reset wrapper ke key-remount se hota hai (cascading renders avoid)
        onCreated();
      }
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /* autosuggest fetch (debounced) */
  const fetchSuggestions = useCallback((q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    getCustomerSuggestions(q).then(setSuggestions).catch(() => setSuggestions([]));
  }, []);

  const onNameChange = (v: string) => {
    setName(v);
    setShowSug(true);
    fetchSuggestions(v);
  };

  const chooseSuggestion = (s: { name: string; phone: string | null }) => {
    setName(s.name);
    setPhone(s.phone ?? "");
    setSuggestions([]);
    setShowSug(false);
  };

  const addRow = () => {
    const pid = products[0]?.id ?? 0;
    setRows((r) => [...r, { key: nextKey, productId: pid, boxes: 1, rateText: defaultRate(pid), rateTouched: false }]);
    setNextKey((k) => k + 1);
  };
  const removeRow = (key: number) => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : r));
  const updateRow = (key: number, patch: Partial<ItemRow>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const onProductChange = (key: number, pid: number) => {
    setRows((prev) => {
      const row = prev.find((x) => x.key === key);
      // Rate ko sirf tab reset karo jab user ne us row ka rate manually
      // change NAHI kiya ho. Manual rate ko product badalne par bhi rakho —
      // warna lagta hai "ek ka rate badla, sab ka badal gaya".
      if (row?.rateTouched) return prev.map((x) => (x.key === key ? { ...x, productId: pid } : x));
      return prev.map((x) =>
        x.key === key ? { ...x, productId: pid, rateText: defaultRate(pid), rateTouched: false } : x,
      );
    });
  };

  /* hidden payload */
  const itemsPayload = JSON.stringify(
    rows
      .filter((r) => r.productId > 0 && r.boxes >= 1)
      .map((r) => ({ productId: r.productId, boxes: r.boxes, ratePerBox: Number(r.rateText) || 0 })),
  );

  return (
    <form action={formAction} className="space-y-5">
      {editing ? <input type="hidden" name="id" value={sale!.id} /> : null}
      <input type="hidden" name="items" value={itemsPayload} />
      <input type="hidden" name="saleDate" value={saleDate} />
      <input type="hidden" name="deliveredBy" value={deliveredBy} />
      <input type="hidden" name="paymentStatus" value={status} />
      <input type="hidden" name="paidAmount" value={status === "partial" ? paidInput : status === "paid" ? totalAmount : 0} />
      <input type="hidden" name="note" value={note} />

      {/* Date */}
      <div className="space-y-1.5">
        <label htmlFor="saleDate" className="text-sm font-medium">Date</label>
        <input id="saleDate" type="date" required value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)} className={inputCls} />
      </div>

      {/* Customer name + autosuggest */}
      <div className="relative space-y-1.5">
        <label htmlFor="customerName" className="text-sm font-medium">Customer Name *</label>
        <input
          id="customerName"
          name="customerName"
          required
          autoComplete="off"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={() => setShowSug(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setShowSug(false), 150);
          }}
          placeholder="Type a name..."
          className={inputCls}
        />
        {showSug && suggestions.length > 0 ? (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-float">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => chooseSuggestion(s)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{s.name}</span>
                  {s.phone ? <span className="text-xs text-muted-foreground">{s.phone}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label htmlFor="customerPhone" className="text-sm font-medium">Phone Number</label>
        <input id="customerPhone" name="customerPhone" type="tel" autoComplete="off"
          value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="optional" className={inputCls} />
      </div>

      {/* Delivered By — chips */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Delivered By</p>
        <div className="flex flex-wrap gap-2">
          {staff.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setDeliveredBy(s.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                deliveredBy === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Items ({rows.length})</p>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus /> Add item
          </Button>
        </div>

        {rows.map((row, i) => (
          <div key={row.key} className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Product</label>
              <select
                className={selectCls}
                value={row.productId}
                onChange={(e) => onProductChange(row.key, Number(e.target.value))}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <div className="w-36 shrink-0 space-y-1">
                <label className="text-xs text-muted-foreground">Boxes</label>
                <NumberStepper
                  value={row.boxes}
                  min={1}
                  onChange={(n) => updateRow(row.key, { boxes: n })}
                />
              </div>
              <div className="w-28 shrink-0 space-y-1">
                <label className="text-xs text-muted-foreground">Rate / Box (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={row.rateText}
                  onChange={(e) => updateRow(row.key, { rateText: e.target.value, rateTouched: true })}
                />
              </div>
              <div className="w-24 text-right space-y-1">
                <span className="text-xs text-muted-foreground">Total</span>
                <p className="h-11 flex items-center justify-end text-sm font-semibold whitespace-nowrap">
                  ₹{(row.boxes * (Number(row.rateText) || 0)).toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length === 1}
                className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                aria-label={`Remove item ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {lowStockRows.some((r) => r.key === row.key) ? (
              <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                <TriangleAlert className="h-3.5 w-3.5" /> Only {productMap.get(row.productId)?.stockBalance ?? 0} in stock
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Boxes</span>
          <span className="font-semibold">{totalBoxes}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="font-medium">Total Amount</span>
          <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Status */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Payment Status</p>
        <div className="grid grid-cols-3 gap-2">
          {(["paid", "pending", "partial"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-xl border py-2.5 text-sm font-medium capitalize transition-colors ${
                status === s
                  ? s === "paid"
                    ? "border-primary bg-primary text-primary-foreground"
                    : s === "pending"
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {status === "partial" ? (
          <div className="space-y-1.5 pt-1">
            <label htmlFor="paidAmount" className="text-sm font-medium">Amount Received (₹)</label>
            <input
              id="paidAmount"
              type="number"
              min={0}
              max={totalAmount}
              step="0.01"
              className={inputCls}
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              placeholder={`max ₹${totalAmount.toFixed(2)}`}
            />
          </div>
        ) : null}
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <label htmlFor="note" className="text-sm font-medium">Note</label>
        <input id="note" type="text" className={inputCls} value={note}
          onChange={(e) => setNote(e.target.value)} placeholder="optional" />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save Sale
      </Button>
    </form>
  );
}


