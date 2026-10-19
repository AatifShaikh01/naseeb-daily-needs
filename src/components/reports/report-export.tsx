"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";

/** Server component passes CSV rows; button triggers browser download. */
export function ReportCsvExport({
  filename,
  rows,
}: {
  filename: string;
  rows: (string | number | null)[][];
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, rows)}
      className="rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      Download CSV
    </button>
  );
}

type Totals = { totalSalesAmount: number; totalBoxesSold: number; totalPending: number };
type PRow = { name: string; size: string; boxes: number; amount: number };
type CRow = { name: string; boxes: number; amount: number };
type SRow = { name: string; boxes: number };

/** Shop identity printed on every bill / report header. */
const SHOP = {
  name: "Naseeb Daily Needs & Agencies",
  contact: "shaikh shahbaz : 9049642155",
  address: "tipu sultan chawk momin pura deulghat",
} as const;

/** Load a public image as a base64 data URL for jsPDF addImage. */
async function loadLogoDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Monthly report ka formatted PDF — DIRECT download, koi print dialog nahi.
 *  Text bada rakha hai (12-22pt) taaki phone/print dono me saaf dikhe. */
export function MonthlyPdfExport({
  monthLabel,
  totals,
  productSales,
  customerSales,
  staffDelivered,
}: {
  monthLabel: string;
  totals: Totals;
  productSales: PRow[];
  customerSales: CRow[];
  staffDelivered: SRow[];
}) {
  const [busy, setBusy] = useState(false);

  const onDownload = async () => {
    try {
      setBusy(true);
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const green: [number, number, number] = [15, 118, 110];
      const inr = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;

      // Logo + header
      const logoData = await loadLogoDataUrl("/image.png");
      doc.addImage(logoData, "PNG", 40, 25, 45, 45);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(green[0], green[1], green[2]);
      doc.text(SHOP.name, 100, 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(90, 90, 90);
      doc.text(SHOP.contact, 100, 64);
      doc.text(SHOP.address, 100, 76);
      doc.setFontSize(14);
      doc.text(`Monthly Sales Report - ${monthLabel}`, 100, 92);
      doc.setDrawColor(green[0], green[1], green[2]);
      doc.setLineWidth(2.5);
      doc.line(40, 108, pageW - 40, 108);

      // Summary cards
      let y = 126;
      const cardW = (pageW - 80 - 20) / 3;
      const cards: [string, string][] = [
        ["Total Sales", inr(totals.totalSalesAmount)],
        ["Total Boxes Sold", String(totals.totalBoxesSold)],
        ["Total Pending", inr(totals.totalPending)],
      ];
      cards.forEach(([lbl, val], i) => {
        const x = 40 + i * (cardW + 10);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.roundedRect(x, y, cardW, 58, 6, 6);
        doc.setTextColor(110, 110, 110);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(lbl, x + 10, y + 22);
        doc.setTextColor(20, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(val, x + 10, y + 44);
      });
      y += 78;

      const base = {
        styles: { fontSize: 13, cellPadding: 9 },
        headStyles: { fillColor: green, textColor: 255, fontSize: 13, fontStyle: "bold" as const },
        alternateRowStyles: { fillColor: [246, 250, 249] as [number, number, number] },
        margin: { left: 40, right: 40 },
      };
      const lastY = () =>
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      const section = (title: string, head: string[], body: string[][]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(green[0], green[1], green[2]);
        if (y > doc.internal.pageSize.getHeight() - 140) {
          doc.addPage();
          y = 50;
        }
        doc.text(title, 40, y);
        autoTable(doc, {
          ...base,
          startY: y + 10,
          head: [head],
          body: body.length > 0 ? body : [head.map(() => "No data")],
        });
        y = lastY() + 30;
      };

      section(
        "Product-wise Sales",
        ["Product", "Size", "Boxes", "Amount"],
        productSales.map((r) => [r.name, r.size, String(r.boxes), inr(r.amount)]),
      );
      section(
        "Customer-wise Sales",
        ["Customer", "Boxes", "Amount"],
        customerSales.map((r) => [r.name, String(r.boxes), inr(r.amount)]),
      );
      section(
        "Staff Delivery",
        ["Staff", "Boxes Delivered"],
        staffDelivered.map((r) => [r.name, String(r.boxes)]),
      );

      const gen = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Generated on ${gen} IST - Naseeb Daily Needs & Agencies`,
        40,
        doc.internal.pageSize.getHeight() - 30,
      );

      const fileMonth = monthLabel.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
      doc.save(`naseeb-monthly-report-${fileMonth}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={busy}
      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
    >
      {busy ? "Preparing PDF..." : "Download PDF"}
    </button>
  );
}

type DailySummary = {
  stockInBoxes: number;
  salesBoxes: number;
  salesCount: number;
  salesAmount: number;
  paymentsReceived: number;
  pendingAtDate: number;
};

/** Daily report ka formatted PDF — DIRECT download, monthly report jaisa hi clean layout.
 *  Summary cards (2 rows x 3) + product-wise stock-in table. */
export function DailyPdfExport({
  date,
  summary,
  stockInRows,
}: {
  date: string;
  summary: DailySummary;
  stockInRows: { productName: string; size: string; boxes: number }[];
}) {
  const [busy, setBusy] = useState(false);

  const onDownload = async () => {
    try {
      setBusy(true);
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const green: [number, number, number] = [15, 118, 110];
      const inr = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;

      // "YYYY-MM-DD" -> "Friday, 16 October 2026" (invalid date pe raw string)
      const parts = date.split("-").map(Number);
      const dateLabel =
        parts.length === 3 && parts.every((n) => Number.isFinite(n))
          ? new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : date;

      // Logo + header
      const logoData = await loadLogoDataUrl("/image.png");
      doc.addImage(logoData, "PNG", 40, 25, 45, 45);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(green[0], green[1], green[2]);
      doc.text(SHOP.name, 100, 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(90, 90, 90);
      doc.text(SHOP.contact, 100, 64);
      doc.text(SHOP.address, 100, 76);
      doc.setFontSize(14);
      doc.text(`Daily Report - ${dateLabel}`, 100, 92);
      doc.setDrawColor(green[0], green[1], green[2]);
      doc.setLineWidth(2.5);
      doc.line(40, 108, pageW - 40, 108);

      // Summary cards — 2 rows x 3
      let y = 126;
      const cardW = (pageW - 80 - 20) / 3;
      const cardRows: [string, string][][] = [
        [
          ["Sales Amount", inr(summary.salesAmount)],
          ["Payments Received", inr(summary.paymentsReceived)],
          ["Pending at Date", inr(summary.pendingAtDate)],
        ],
        [
          ["Sales Boxes", String(summary.salesBoxes)],
          ["Sales Count", String(summary.salesCount)],
          ["Stock In Boxes", String(summary.stockInBoxes)],
        ],
      ];
      cardRows.forEach((row, ri) => {
        row.forEach(([lbl, val], i) => {
          const x = 40 + i * (cardW + 10);
          const cy = y + ri * 68;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(1);
          doc.roundedRect(x, cy, cardW, 58, 6, 6);
          doc.setTextColor(110, 110, 110);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.text(lbl, x + 10, cy + 22);
          doc.setTextColor(20, 20, 20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.text(val, x + 10, cy + 44);
        });
      });
      y += 146;

      const base = {
        styles: { fontSize: 13, cellPadding: 9 },
        headStyles: { fillColor: green, textColor: 255, fontSize: 13, fontStyle: "bold" as const },
        alternateRowStyles: { fillColor: [246, 250, 249] as [number, number, number] },
        margin: { left: 40, right: 40 },
      };
      const lastY = () =>
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      const section = (title: string, head: string[], body: string[][]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(green[0], green[1], green[2]);
        if (y > pageH - 140) {
          doc.addPage();
          y = 50;
        }
        doc.text(title, 40, y);
        autoTable(doc, {
          ...base,
          startY: y + 10,
          head: [head],
          body: body.length > 0 ? body : [head.map(() => "No data")],
        });
        y = lastY() + 30;
      };

      section(
        "Stock In - Product-wise",
        ["Product", "Size", "Boxes"],
        stockInRows.map((r) => [r.productName, r.size, String(r.boxes)]),
      );

      const gen = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(140, 140, 140);
      doc.text(`Generated on ${gen} IST - Naseeb Daily Needs & Agencies`, 40, pageH - 30);

      doc.save(`naseeb-daily-report-${date}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={busy}
      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
    >
      {busy ? "Preparing PDF..." : "Download PDF"}
    </button>
  );
}
