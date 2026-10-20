"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PurchaseShareData = {
  id: number;
  entryDate: string;
  supplierName: string;
  direction: "in" | "return";
  paymentStatus: "paid" | "pending" | "partial";
  totalAmount: number;
  paidAmount: number;
  items: { productName: string; size: string; boxes: number; ratePerBox: number }[];
};

const money = (v: number) => `₹${v.toLocaleString("en-IN")}`;

export function SharePurchaseButton({ purchase }: { purchase: PurchaseShareData }) {
  const [busy, setBusy] = useState(false);

  const absBoxes = (b: number) => Math.abs(b);

  /* Sr | Item | Rate | Qty | Amount — monospace table, WhatsApp-friendly. */
  const padR = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));
  const padL = (s: string, n: number) => (s.length >= n ? s : " ".repeat(n - s.length) + s);
  const rows = purchase.items.map((it, i) => {
    const boxes = absBoxes(it.boxes);
    const amt = boxes * it.ratePerBox;
    return {
      sr: String(i + 1),
      name: `${it.productName} (${it.size})`.slice(0, 22),
      rate: String(it.ratePerBox),
      qty: String(boxes),
      amt: String(amt),
    };
  });
  const wSr = Math.max(2, ...rows.map((r) => r.sr.length));
  const wName = Math.max(4, ...rows.map((r) => r.name.length));
  const wRate = Math.max(4, ...rows.map((r) => r.rate.length));
  const wQty = Math.max(3, ...rows.map((r) => r.qty.length));
  const wAmt = Math.max(6, ...rows.map((r) => r.amt.length));
  const table = [
    `${padR("Sr", wSr)} ${padR("Item", wName)} ${padL("Rate", wRate)} ${padL("Qty", wQty)} ${padL("Amount", wAmt)}`,
    ...rows.map(
      (r) => `${padR(r.sr, wSr)} ${padR(r.name, wName)} ${padL(r.rate, wRate)} ${padL(r.qty, wQty)} ${padL(r.amt, wAmt)}`,
    ),
  ].join("\n");

  const msg = [
    `*Purchase #${String(purchase.id).padStart(4, "0")}*`,
    `Supplier: ${purchase.supplierName}`,
    `Date: ${purchase.entryDate}`,
    `Type: ${purchase.direction === "in" ? "Stock In" : "Return"}`,
    `Status: ${purchase.paymentStatus}`,
    "",
    "```",
    table,
    "```",
    "",
    `*Total:* ${money(Math.abs(purchase.totalAmount))}`,
    `*Paid:* ${money(Math.abs(purchase.paidAmount))}`,
    `*Due:* ${money(Math.abs(purchase.totalAmount) - Math.abs(purchase.paidAmount))}`,
    "",
    "Naseeb Daily Needs",
  ].join("\n");

  const shareOnWhatsApp = async () => {
    setBusy(true);
    try {
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      if (typeof window !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: `Purchase #${purchase.id}`,
            text: msg,
            url,
          });
          return;
        } catch {
          // fall through to wa.me link
        }
      }
      window.open(url, "_blank");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={shareOnWhatsApp}
      disabled={busy}
      size="sm"
      variant="outline"
      className="text-xs bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/30"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Share2 className="h-3 w-3 mr-1" />}
      Share
    </Button>
  );
}
