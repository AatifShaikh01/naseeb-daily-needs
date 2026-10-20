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

const money = (v: number) => `Rs.${v.toLocaleString("en-IN")}`;

async function buildPdfBlob(purchase: PurchaseShareData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const purchaseNo = `PUR-${String(purchase.id).padStart(4, "0")}`;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 40;
  const C = pageW - M;
  const green: [number, number, number] = [15, 118, 110];
  const grey: [number, number, number] = [110, 110, 110];
  const dark: [number, number, number] = [30, 30, 30];

  let y = 48;

  // Logo + shop header (sales bill jaisa)
  const LOGO = 52;
  try {
    const blob = await fetch("/image.png").then((r) => {
      if (!r.ok) throw new Error("logo");
      return r.blob();
    });
    const dataUrl: string = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    doc.addImage(dataUrl, "PNG", M, y - 28, LOGO, LOGO);
  } catch { /* logo optional — text header hi rahega */ }

  const tx = M + LOGO + 12;
  doc.setTextColor(green[0], green[1], green[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Naseeb Daily Needs & Agencies", tx, y - 6);
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("shaikh shahbaz : 9049642155", tx, y + 10);
  doc.text("tipu sultan chawk momin pura deulghat", tx, y + 24);

  // PURCHASE NO. top-right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.text("PURCHASE NO.", C, y - 18, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(purchaseNo, C, y + 2, { align: "right" });

  // green divider
  y += 30;
  doc.setDrawColor(green[0], green[1], green[2]);
  doc.setLineWidth(2.5);
  doc.line(M, y, C, y);
  y += 22;

  // Meta rows (DATE / TYPE, SUPPLIER / STATUS)
  const label = (t: string, x: number, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text(t, x, yy);
  };
  const value = (t: string, x: number, yy: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(t, x, yy);
  };

  const midX = pageW / 2 + 20;
  label("DATE", M, y);
  value(purchase.entryDate, M, y + 15, true);
  label("TYPE", midX, y);
  value(purchase.direction === "in" ? "Stock In" : "Return", midX, y + 15, true);
  y += 34;
  label("SUPPLIER", M, y);
  value(purchase.supplierName, M, y + 15, true);
  label("STATUS", midX, y);
  value(purchase.paymentStatus.toUpperCase(), midX, y + 15, true);
  y += 34;

  // Items table (SR | ITEM | RATE | QTY | AMOUNT)
  autoTable(doc, {
    startY: y,
    head: [["SR", "ITEM", "RATE (Rs.)", "QTY", "AMOUNT (Rs.)"]],
    body: purchase.items.map((it, i) => {
      const boxes = Math.abs(it.boxes);
      return [
        String(i + 1),
        `${it.productName} (${it.size})`,
        money(it.ratePerBox),
        String(boxes),
        money(boxes * it.ratePerBox),
      ];
    }),
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6, textColor: dark },
    headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 34 },
      2: { halign: "right" },
      3: { halign: "right", cellWidth: 44 },
      4: { halign: "right" },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Totals — right aligned
  const total = Math.abs(purchase.totalAmount);
  const paid = Math.abs(purchase.paidAmount);
  const due = Math.round((total - paid) * 100) / 100;
  const tot = (t: string, v: string, yy: number, bold = false, color: [number, number, number] = dark) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 13 : 11);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(t, C - 150, yy, { align: "left" });
    doc.text(v, C, yy, { align: "right" });
  };
  y += 14;
  tot("Total:", money(total), y, true);
  y += 18;
  tot("Paid:", money(paid), y);
  y += 18;
  tot("Due:", money(due), y, true, due > 0 ? [190, 30, 30] : green);

  y += 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.text("Naseeb Daily Needs — purchase record", pageW / 2, y, { align: "center" });

  return doc.output("blob");
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function SharePurchaseButton({ purchase }: { purchase: PurchaseShareData }) {
  const [busy, setBusy] = useState(false);
  const pdfFileName = `purchase-${String(purchase.id).padStart(4, "0")}.pdf`;

  const shareOnWhatsApp = async () => {
    setBusy(true);
    try {
      const blob = await buildPdfBlob(purchase);
      const file = new File([blob], pdfFileName, { type: "application/pdf" });
      // Mobile: system share sheet — WhatsApp select karo, PDF attached jayegi
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Purchase PUR-${String(purchase.id).padStart(4, "0")} - Naseeb Daily Needs`,
            text: `Purchase - ${purchase.supplierName} - Total ${money(Math.abs(purchase.totalAmount))}`,
          });
          return;
        } catch {
          return; // user ne share cancel kiya — kuch mat karo
        }
      }
      // Desktop / purana browser: pehle download karo, phir wa.me khol do
      saveBlob(blob, pdfFileName);
      const total = Math.abs(purchase.totalAmount);
      const paid = Math.abs(purchase.paidAmount);
      const msg = encodeURIComponent(
        `Purchase PUR-${String(purchase.id).padStart(4, "0")} - Naseeb Daily Needs\nSupplier: ${purchase.supplierName}\nTotal: ${money(total)}, Paid: ${money(paid)}, Due: ${money(Math.round((total - paid) * 100) / 100)}\nPDF abhi download ho gayi hai - yahi attach karke bhej raha hoon.`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
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
      {busy ? "Preparing..." : "Share"}
    </Button>
  );
}
