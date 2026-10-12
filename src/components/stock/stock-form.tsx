"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createStockEntriesAction } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";

type Row = { key: number; productId: number; boxes: number };

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";
const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

/** Stock In — date (default today), multi product rows, optional note. */
export function StockForm({
  products,
  today,
}: {
  products: { id: number; name: string; size: string }[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>([{ key: 1, productId: products[0]?.id ?? 0, boxes: 1 }]);
  const [nextKey, setNextKey] = useState(2);

  const addRow = () => {
    setRows((r) => [...r, { key: nextKey, productId: products[0]?.id ?? 0, boxes: 1 }]);
    setNextKey((k) => k + 1);
  };
  const removeRow = (key: number) => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : r));
  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valid = rows.filter((r) => r.productId > 0 && r.boxes >= 1);
    fd.set(
      "entries",
      JSON.stringify(valid.map((r) => ({ productId: r.productId, boxes: r.boxes }))),
    );
    startTransition(async () => {
      const res = await createStockEntriesAction(null, fd);
      if (res?.ok) {
        toast.success(`Stock in saved (${valid.length} product${valid.length > 1 ? "s" : ""})`);
        router.refresh();
        setRows([{ key: Date.now(), productId: products[0]?.id ?? 0, boxes: 1 }]);
        setNextKey((k) => k + 1);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="entryDate" className="text-sm font-medium">Date</label>
        <input id="entryDate" name="entryDate" type="date" required defaultValue={today} className={inputCls} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Products ({rows.length})</p>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus /> Add another product
          </Button>
        </div>

        {rows.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-end gap-x-2 gap-y-2 rounded-xl border border-border bg-card p-3">
            <div className="min-w-40 flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Product</label>
              <select
                className={selectCls}
                value={row.productId}
                onChange={(e) => updateRow(row.key, { productId: Number(e.target.value) })}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.size}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-36 shrink-0 space-y-1">
              <label className="text-xs text-muted-foreground">Boxes</label>
              <NumberStepper value={row.boxes} min={1} onChange={(n) => updateRow(row.key, { boxes: n })} />
            </div>
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              disabled={rows.length === 1}
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
              aria-label={`Remove row ${i + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="note" className="text-sm font-medium">Note (optional)</label>
        <input id="note" name="note" placeholder="e.g. Truck no, invoice" className={inputCls} />
      </div>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save Stock In
      </Button>
    </form>
  );
}

