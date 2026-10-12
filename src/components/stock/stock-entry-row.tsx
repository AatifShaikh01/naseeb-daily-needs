"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteStockEntryAction, updateStockEntryAction } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";

type Opt = { id: number; name: string; size: string };
type Entry = { id: number; entryDate: string; productId: number; boxes: number; note: string };

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

/** Ek stock entry row — inline edit dialog + delete with confirm + toast. */
export function StockEntryRow({
  entry,
  products,
}: {
  entry: Entry;
  products: Opt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  const product = products.find((p) => p.id === entry.productId);
  const label = product ? `${product.name} · ${product.size}` : "—";

  const handleDelete = () => {
    const fd = new FormData();
    fd.set("id", String(entry.id));
    startTransition(async () => {
      const res = await deleteStockEntryAction(fd);
      if (res?.ok) {
        toast.success("Entry deleted");
        router.refresh();
      } else {
        toast.error(res?.error ?? "Could not delete entry");
        setConfirming(false);
      }
    });
  };

  return (
    <>
      <li className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {entry.boxes} boxes{entry.note ? ` · ${entry.note}` : ""}
          </p>
        </div>

        {confirming ? (
          <span className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-2 py-1">
            <span className="text-[11px] font-medium text-destructive">Delete?</span>
            <Button type="button" size="sm" variant="destructive" className="h-7 px-2 text-[11px]"
              disabled={pending} onClick={handleDelete}>
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
              onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setEditing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Edit ${label}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setConfirming(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${label}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </li>

      {editing ? (
        <EditStockDialog
          entry={entry}
          products={products}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function EditStockDialog({
  entry,
  products,
  onClose,
  onSaved,
}: {
  entry: Entry;
  products: Opt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [boxes, setBoxes] = useState(entry.boxes);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("boxes", String(boxes));
    startTransition(async () => {
      const res = await updateStockEntryAction(null, fd);
      if (res?.ok) {
        toast.success("Entry updated");
        onSaved();
      } else {
        toast.error(res?.error ?? "Could not update entry");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-bold">Edit Entry</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="id" value={entry.id} />
          <div className="space-y-1.5">
            <label htmlFor="ed-date" className="text-sm font-medium">Date</label>
            <input id="ed-date" name="entryDate" type="date" required
              defaultValue={entry.entryDate} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ed-product" className="text-sm font-medium">Product</label>
            <select id="ed-product" name="productId" defaultValue={entry.productId} className={inputCls}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.size}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ed-boxes" className="text-sm font-medium">Boxes</label>
            <NumberStepper value={boxes} min={1} onChange={setBoxes} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ed-note" className="text-sm font-medium">Note</label>
            <input id="ed-note" name="note" defaultValue={entry.note}
              placeholder="optional" className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

