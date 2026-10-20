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

  const sign = purchase.direction === "return" ? -1 : 1;
  const absBoxes = (b: number) => Math.abs(b);

  const msg = [
    `*Purchase #${String(purchase.id).padStart(4, "0")}*`,
    `Supplier: ${purchase.supplierName}`,
    `Date: ${purchase.entryDate}`,
    `Type: ${purchase.direction === "in" ? "Stock In" : "Return"}`,
    `Status: ${purchase.paymentStatus}`,
    "",
    "*Items:*",
    ...purchase.items.map(
      (it) =>
        `• ${it.productName} (${it.size}) × ${absBoxes(it.boxes)} @ ${money(it.ratePerBox)}/box = ${money(absBoxes(it.boxes) * it.ratePerBox)}`,
    ),
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
