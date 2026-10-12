"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

const modes: { key: "cash" | "upi" | "bank"; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
  { key: "bank", label: "Bank" },
];

export type PaymentValues = {
  amount: number;
  paidOn: string;
  mode: "cash" | "upi" | "bank";
  note: string;
};

/** Reusable receive-payment dialog (customer-level ya sale-level). */
export function PaymentDialog({
  open,
  onClose,
  title,
  defaultAmount,
  today,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  defaultAmount: number;
  today: string;
  submitting: boolean;
  onSubmit: (vals: PaymentValues) => void;
}) {
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [paidOn, setPaidOn] = useState(today);
  const [mode, setMode] = useState<"cash" | "upi" | "bank">("cash");
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="pay-amount" className="text-sm font-medium">Amount (₹)</label>
          <input
            id="pay-amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pay-date" className="text-sm font-medium">Date</label>
          <input
            id="pay-date"
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Mode</p>
          <div className="flex gap-2">
            {modes.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === m.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pay-note" className="text-sm font-medium">Note (optional)</label>
          <input
            id="pay-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={submitting || !amount || Number(amount) <= 0}
            onClick={() => onSubmit({ amount: Number(amount), paidOn, mode, note })}
          >
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Save Payment
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
