"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Pencil, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSaleAction } from "@/lib/actions/sales";
import { SaleForm, type SaleProduct, type SaleStaff, type InitialSale } from "@/components/sale/sale-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/dates";

export type SaleItemView = {
  productId: number;
  boxes: number;
  ratePerBox: string;
  productName: string;
  productSize: string;
};
export type SalePaymentView = {
  amount: string;
  paidOn: string;
  mode: string;
  note: string;
};

export type SaleCardData = {
  id: number;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  deliveredBy: number;
  paymentStatus: "paid" | "pending" | "partial";
  totalAmount: string;
  paidAmount: string;
  note: string | null;
  items: SaleItemView[];
  payments: SalePaymentView[];
};

const money = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;

function StatusBadge({ status }: { status: SaleCardData["paymentStatus"] }) {
  if (status === "paid")
    return <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>;
  if (status === "partial")
    return <Badge className="bg-amber-100 text-amber-700">Partial</Badge>;
  return <Badge className="bg-red-100 text-red-700">Pending</Badge>;
}

export function SaleCard({
  sale,
  staffName,
  products,
  staff,
  today,
}: {
  sale: SaleCardData;
  staffName: string;
  products: SaleProduct[];
  staff: SaleStaff[];
  today: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalBoxes = sale.items.reduce((s, it) => s + it.boxes, 0);
  const itemsSummary = sale.items
    .map((it) => `${it.boxes} × ${it.productName} ${it.productSize}`)
    .join(", ");

  async function onDelete() {
    setDeleting(true);
    const fd = new FormData();
    fd.append("id", String(sale.id));
    const res = await deleteSaleAction(fd);
    setDeleting(false);
    if (res.ok) {
      toast.success("Sale deleted");
      setConfirming(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete sale.");
    }
  }

  function toInitial(): InitialSale {
    return {
      id: sale.id,
      saleDate: sale.saleDate,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      deliveredBy: sale.deliveredBy,
      paymentStatus: sale.paymentStatus,
      paidAmount: Number(sale.paidAmount),
      note: sale.note,
      items: sale.items.map((it) => ({
        productId: it.productId,
        boxes: it.boxes,
        ratePerBox: Number(it.ratePerBox),
      })),
    };
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      {/* Header row — tap to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{sale.customerName}</p>
            <StatusBadge status={sale.paymentStatus} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(sale.saleDate)}
            {sale.customerPhone ? ` · ${sale.customerPhone}` : ""} · by {staffName}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{itemsSummary || "—"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="text-right">
            <p className="font-bold">{money(sale.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">
              {totalBoxes} box{totalBoxes === 1 ? "" : "es"}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
            <ul className="space-y-1 text-sm">
              {sale.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    {it.productName} {it.productSize} × {it.boxes} box{it.boxes > 1 ? "es" : ""}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {money(Number(it.boxes) * Number(it.ratePerBox))}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{money(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Paid</span>
            <span>{money(sale.paidAmount)}</span>
          </div>

          {/* Payment history */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments</p>
            {sale.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {sale.payments.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="capitalize">{p.mode}</span>
                    <span>
                      {money(p.amount)} <span className="text-muted-foreground">· {formatDate(p.paidOn)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {sale.note ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{sale.note}</p>
          ) : null}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a href={`/bill/${sale.id}`} className="rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground flex items-center gap-1.5">
              <Receipt className="mr-1 h-3 w-3" /> Generate Bill
            </a>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
            {!confirming ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirming(true)}
              >
                <Trash2 /> Delete
              </Button>
            ) : (
              <span className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-1.5">
                <span className="text-xs font-medium text-destructive">Delete this sale?</span>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="animate-spin" /> : null} Yes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  No
                </Button>
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Edit dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} title={`Edit: ${sale.customerName}`}>
        <SaleForm
          products={products}
          staff={staff}
          today={today}
          sale={toInitial()}
          onSaved={() => setEditing(false)}
        />
      </Dialog>
    </div>
  );
}
