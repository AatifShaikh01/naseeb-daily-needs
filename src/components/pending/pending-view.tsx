"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Share2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  recordCustomerPaymentAction,
  recordSalePaymentAction,
} from "@/lib/actions/payments";
import { PaymentDialog, type PaymentValues } from "@/components/pending/payment-dialog";
import { WhatsAppDialog } from "@/components/pending/whatsapp-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";

export type ItemLine = {
  productId: number;
  name: string;
  size: string;
  boxes: number;
  ratePerBox: number;
  lineTotal: number;
};

export type SaleRow = {
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

export type CustomerGroup = {
  key: string;
  name: string;
  phone: string | null;
  totalPending: number;
  oldestPendingDate: string | null;
  sales: SaleRow[];
};

const money = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

function itemsSummary(items: ItemLine[]): string {
  return items
    .map((i) => `${i.boxes} x ${i.name}${i.size ? " " + i.size : ""}`)
    .join(", ");
}

function statusOf(sale: SaleRow): "paid" | "pending" | "partial" {
  if (sale.paidAmount >= sale.totalAmount - 0.005) return "paid";
  if (sale.paidAmount <= 0.005) return "pending";
  return "partial";
}

function statusBadge(status: "paid" | "pending" | "partial") {
  if (status === "paid") return <Badge className="bg-green-600 text-white">Paid</Badge>;
  if (status === "partial") return <Badge className="bg-amber-500 text-white">Partial</Badge>;
  return <Badge variant="destructive">Pending</Badge>;
}

function buildReminderMessage(c: CustomerGroup): string {
  const pendingSales = c.sales.filter((s) => s.pending > 0.005);
  const lines = pendingSales.map(
    (s) => `- ${formatDate(s.saleDate)}: ${itemsSummary(s.items)} - Rs. ${s.pending.toLocaleString("en-IN")}`,
  );
  return [
    `Hello ${c.name},`,
    "This is a reminder from NASEEB DAILY NEEDS & AGENCIES.",
    `Your pending payment: Rs. ${c.totalPending.toLocaleString("en-IN")}`,
    "Details:",
    ...lines,
    "Kindly clear the payment at your earliest. Thank you.",
  ].join("\n");
}

function buildShareAllMessage(customers: CustomerGroup[]): string {
  const lines = customers.map(
    (c) => `${c.name}${c.phone ? " (" + c.phone + ")" : ""}: Rs. ${c.totalPending.toLocaleString("en-IN")}`,
  );
  const total = customers.reduce((s, c) => s + c.totalPending, 0);
  return [
    "Pending payments — NASEEB DAILY NEEDS & AGENCIES",
    "",
    ...lines,
    "",
    `Total: Rs. ${total.toLocaleString("en-IN")}`,
  ].join("\n");
}

type PayTarget =
  | { kind: "customer"; customer: CustomerGroup }
  | { kind: "sale"; customer: CustomerGroup; sale: SaleRow };

type WaState = { message: string; phone: string | null } | null;

export function PendingView({
  customers,
  today,
}: {
  customers: CustomerGroup[];
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [wa, setWa] = useState<WaState>(null);

  const fd = (vals: PaymentValues) => {
    const form = new FormData();
    form.set("amount", String(vals.amount));
    form.set("paidOn", vals.paidOn);
    form.set("mode", vals.mode);
    form.set("note", vals.note);
    return form;
  };

  const submitCustomerPayment = (vals: PaymentValues) => {
    if (payTarget?.kind !== "customer") return;
    const c = payTarget.customer;
    const form = fd(vals);
    form.set("customerName", c.name);
    form.set("customerPhone", c.phone ?? "");
    startTransition(async () => {
      const res = await recordCustomerPaymentAction(null, form);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment recorded");
      setPayTarget(null);
      router.refresh();
    });
  };

  const submitSalePayment = (vals: PaymentValues) => {
    if (payTarget?.kind !== "sale") return;
    const form = fd(vals);
    form.set("saleId", String(payTarget.sale.id));
    startTransition(async () => {
      const res = await recordSalePaymentAction(null, form);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment recorded");
      setPayTarget(null);
      router.refresh();
    });
  };

  const shareAll = () => {
    const msg = buildShareAllMessage(customers);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text: msg }).catch(() => window.open(url, "_blank"));
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {customers.length > 0 ? (
        <Button variant="accent" className="w-full" size="lg" onClick={shareAll}>
          <Share2 /> Share All Pending ({customers.length})
        </Button>
      ) : null}

      {customers.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No pending payments</p>
            <p className="text-xs text-muted-foreground">All settled up.</p>
          </div>
        </Card>
      ) : null}

      {customers.map((c) => {
        const open = openKey === c.key;
        return (
          <Card key={c.key} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : c.key)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.phone ?? "No phone"}
                  {c.oldestPendingDate ? ` · since ${formatDate(c.oldestPendingDate)}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-destructive">{money(c.totalPending)}</p>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {open ? (
              <div className="space-y-3 border-t border-border p-4">
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => setPayTarget({ kind: "customer", customer: c })}>
                    <Wallet /> Receive Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setWa({ message: buildReminderMessage(c), phone: c.phone })}
                  >
                    <MessageCircle /> WhatsApp Reminder
                  </Button>
                </div>

                <ul className="space-y-2">
                  {c.sales.map((s) => (
                    <li key={s.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(s.saleDate)} · {s.deliveredBy}
                          </p>
                          <p className="text-sm font-medium">{itemsSummary(s.items)}</p>
                        </div>
                        {statusBadge(statusOf(s))}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total {money(s.totalAmount)} · Paid {money(s.paidAmount)}</span>
                        <span className="font-semibold text-foreground">Pending {money(s.pending)}</span>
                      </div>
                      {s.pending > 0.005 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => setPayTarget({ kind: "sale", customer: c, sale: s })}
                        >
                          <Wallet /> Receive on this sale
                        </Button>
                      ) : null}
                      {s.payments.length > 0 ? (
                        <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
                          {s.payments.map((p) => (
                            <li key={p.id}>
                              {formatDate(p.paidOn)} · {money(p.amount)} · {p.mode}
                              {p.note ? ` · ${p.note}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        );
      })}

      <PaymentDialog
        key={payTarget ? (payTarget.kind === "sale" ? `sale-${payTarget.sale.id}` : `cust-${payTarget.customer.key}`) : "none"}
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={payTarget?.kind === "sale" ? "Receive Payment (Sale)" : "Receive Payment"}
        defaultAmount={
          payTarget
            ? payTarget.kind === "sale"
              ? payTarget.sale.pending
              : payTarget.customer.totalPending
            : 0
        }
        today={today}
        submitting={isPending}
        onSubmit={payTarget?.kind === "sale" ? submitSalePayment : submitCustomerPayment}
      />

      <WhatsAppDialog
        key={wa ? `wa-${wa.phone}-${wa.message.length}` : "wa-none"}
        open={!!wa}
        onClose={() => setWa(null)}
        defaultMessage={wa?.message ?? ""}
        phone={wa?.phone ?? null}
      />
    </div>
  );
}
