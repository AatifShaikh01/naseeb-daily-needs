﻿"use client";

import { useState } from "react";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type BillPageProps = {
  id: number;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  paymentMode: string;
  totalAmount: number;
  paidAmount: number;
  items: { productName: string; productSize: string; boxes: number; ratePerBox: number; amount: number }[];
};

export function PrintButton({ bill }: { bill: BillPageProps }) {
  const [busy, setBusy] = useState(false);
  const pending = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
  const money = (v: number) => `₹${v.toLocaleString("en-IN")}`;
  const billNo = `SALE-${String(bill.id).padStart(4, "0")}`;

  const downloadPDF = async () => {
    try {
      setBusy(true);
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const inr = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const M = 40;
      const C = pageW - M;
      const green: [number, number, number] = [15, 118, 110];
      const grey: [number, number, number] = [110, 110, 110];
      const dark: [number, number, number] = [30, 30, 30];

      let y = 48;

      // Logo + shop header (web bill jaisa)
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

      // BILL NO. top-right (screenshot jaisa)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(grey[0], grey[1], grey[2]);
      doc.text("BILL NO.", C, y - 18, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.text(doc.splitTextToSize(billNo, 130), C, y + 2, { align: "right" });

      // green divider
      y += 30;
      doc.setDrawColor(green[0], green[1], green[2]);
      doc.setLineWidth(2.5);
      doc.line(M, y, C, y);
      y += 22;

      // Meta rows (DATE / PAYMENT, CUSTOMER / PHONE)
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

      const midX = (M + C) / 2;
      label("DATE", M, y);
      value(bill.saleDate, M, y + 15);
      label("PAYMENT", midX, y);
      value(bill.paymentMode, midX, y + 15);
      y += 40;

      label("CUSTOMER", M, y);
      value(bill.customerName, M, y + 15, true);
      label("PHONE", midX, y);
      value(bill.customerPhone ?? "—", midX, y + 15);
      y += 36;

      // Items table (ITEM | BOXES | RATE | AMOUNT)
      autoTable(doc, {
        startY: y,
        head: [["ITEM", "BOXES", "RATE (Rs.)", "AMOUNT (Rs.)"]],
        body: bill.items.map((it) => [
          it.productName + (it.productSize ? ` (${it.productSize})` : ""),
          String(it.boxes),
          inr(it.ratePerBox),
          inr(it.amount),
        ]),
        styles: { font: "helvetica", fontSize: 10.5, cellPadding: 8, textColor: [30, 30, 30] },
        headStyles: { fillColor: [255, 255, 255], textColor: [120, 120, 120], fontSize: 9.5 },
        bodyStyles: { lineWidth: { bottom: 0.5 }, lineColor: [235, 235, 235] },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: M, right: M },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

      // Totals — right aligned
      doc.setDrawColor(green[0], green[1], green[2]);
      doc.setLineWidth(2);
      doc.line(M, y, C, y);
      y += 18;

      const emerald: [number, number, number] = [4, 120, 87];
      const red: [number, number, number] = [185, 28, 28];
      const tot = (t: string, v: string, yy: number, col: [number, number, number], bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(11.5);
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text(t, C - 170, yy, { align: "right" });
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(v, C, yy, { align: "right" });
      };
      tot("Total", inr(bill.totalAmount), y, dark, true);
      tot("Paid", inr(bill.paidAmount), y + 19, emerald);
      tot("Pending", inr(pending), y + 38, red);

      // Footer — centered thank-you + shop line
      y += 78;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(grey[0], grey[1], grey[2]);
      doc.text("Thank you for your business!", pageW / 2, y, { align: "center" });
      doc.setFontSize(8.5);
      const foot = "Naseeb Daily Needs & Agencies · shaikh shahbaz : 9049642155 · tipu sultan chawk momin pura deulghat";
      doc.text(doc.splitTextToSize(foot, C - M), pageW / 2, y + 14, { align: "center" });

      doc.save(`sale-${String(bill.id).padStart(4, "0")}-bill.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print flex justify-between items-center mb-6 gap-3">
      <Link href="/sales" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Sales
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print Bill
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadPDF}
          disabled={busy}
        >
          {busy ? "Preparing..." : <Download className="mr-2 h-4 w-4" />}
          Download PDF
        </Button>
      </div>
    </div>
  );
}


