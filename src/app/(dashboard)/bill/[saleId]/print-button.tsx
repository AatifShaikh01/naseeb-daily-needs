﻿"use client";

import { useState } from "react";
import { Printer, ArrowLeft, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getBillContrastColor,
  getBillReadableAccentColor,
  type BillBranding,
} from "@/lib/bill-branding";

export type BillPageProps = {
  id: number;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  paymentMode: string;
  totalAmount: number;
  paidAmount: number;
  branding: BillBranding;
  items: { productName: string; productSize: string; boxes: number; ratePerBox: number; amount: number }[];
  payments: { id: number; amount: number; paidOn: string; mode: string; note: string }[];
};

export async function appendBillToPdf(doc: import("jspdf").jsPDF, bill: BillPageProps): Promise<void> {
  const pending = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
  const billNo = `${bill.branding.billNumberPrefix.toUpperCase()}-${String(bill.id).padStart(4, "0")}`;
  const { default: autoTable } = await import("jspdf-autotable");

      const hex = bill.branding.color.slice(1);
      const accent: [number, number, number] = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
      const inr = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;
      const pageW = doc.internal.pageSize.getWidth();
      const M = 40;
      const C = pageW - M;
      const green = accent;
      const grey: [number, number, number] = [110, 110, 110];
      const dark: [number, number, number] = [30, 30, 30];
      const inverseHeader = bill.branding.template === "bold";
      const titleHex =
        inverseHeader
          ? getBillContrastColor(bill.branding.color)
          : getBillReadableAccentColor(bill.branding.color);
      const businessHex =
        bill.branding.template === "bold"
          ? getBillContrastColor(bill.branding.color)
          : getBillReadableAccentColor(bill.branding.color);
      const businessColor: [number, number, number] = [
        parseInt(businessHex.slice(1, 3), 16),
        parseInt(businessHex.slice(3, 5), 16),
        parseInt(businessHex.slice(5, 7), 16),
      ];
      const titleColor: [number, number, number] = [
        parseInt(titleHex.slice(1, 3), 16),
        parseInt(titleHex.slice(3, 5), 16),
        parseInt(titleHex.slice(5, 7), 16),
      ];

      let y = 52;
      const LOGO = 52;
      const minimal = bill.branding.template === "minimal";
      const billColumnWidth = 124;
      const tx = minimal ? pageW / 2 : M + LOGO + 14;
      const textWidth = minimal
        ? pageW - M * 2 - (billColumnWidth + 10) * 2
        : C - tx - billColumnWidth - 18;
      const businessDetails = [
        bill.branding.businessPhone,
        bill.branding.businessAddress,
        bill.branding.gstin ? `GSTIN: ${bill.branding.gstin}` : "",
      ].filter(Boolean).join(" · ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const nameLines = doc.splitTextToSize(bill.branding.businessName || "Business name", textWidth);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const detailLines = businessDetails ? doc.splitTextToSize(businessDetails, textWidth) : [];
      const contentY = minimal ? y + 34 : y - 7;
      const detailsY = contentY + nameLines.length * 21;
      const panelX = C - billColumnWidth;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const billTitleLines = doc.splitTextToSize(bill.branding.billTitle.toUpperCase(), billColumnWidth - 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const billNumberLines = doc.splitTextToSize(billNo, billColumnWidth - 12);
      const billNumberY = y - 14 + billTitleLines.length * 12;
      const billContentBottom = billNumberY + billNumberLines.length * 17 + 5;
      const headerBottom = Math.max(y + 42, detailsY + detailLines.length * 12 + 7, billContentBottom);

      if (bill.branding.template === "bold") {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(M, y - 32, pageW - M * 2, headerBottom - y + 44, 8, 8, "F");
      } else if (bill.branding.template === "modern") {
        doc.setFillColor(245, 248, 247);
        doc.roundedRect(M, y - 30, pageW - M * 2, headerBottom - y + 42, 8, 8, "F");
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(M, y - 30, 5, headerBottom - y + 42, "F");
      } else if (bill.branding.template === "elegant") {
        doc.setDrawColor(green[0], green[1], green[2]);
        doc.setLineWidth(0.7);
        doc.line(M, y - 30, C, y - 30);
      } else if (bill.branding.template === "split") {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(panelX - 8, y - 28, billColumnWidth + 8, Math.max(68, headerBottom - y + 28), 7, 7, "F");
      } else {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(M, y - 30, pageW - M * 2, 3, 1, 1, "F");
      }

      try {
        let dataUrl = bill.branding.logoDataUrl;
        if (dataUrl === "/image.png") {
          const blob = await fetch("/image.png").then((response) => {
            if (!response.ok) throw new Error("logo");
            return response.blob();
          });
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        if (dataUrl) {
          const logoX = minimal ? pageW / 2 - LOGO / 2 : M;
          const logoY = y - 26;
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(229, 234, 232);
          doc.roundedRect(logoX, logoY, LOGO, LOGO, 6, 6, "FD");
          const image = doc.getImageProperties(dataUrl);
          const maxLogoSize = LOGO - 12;
          const scale = Math.min(maxLogoSize / image.width, maxLogoSize / image.height);
          const logoWidth = image.width * scale;
          const logoHeight = image.height * scale;
          doc.addImage(
            dataUrl,
            dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG",
            logoX + (LOGO - logoWidth) / 2,
            logoY + (LOGO - logoHeight) / 2,
            logoWidth,
            logoHeight,
          );
        }
      } catch { /* logo optional — text header hi rahega */ }

      const boldHeader = bill.branding.template === "bold";
      const align = minimal ? "center" : "left";
      doc.setTextColor(businessColor[0], businessColor[1], businessColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(nameLines, tx, contentY, { align });
      doc.setTextColor(boldHeader ? titleColor[0] : grey[0], boldHeader ? titleColor[1] : grey[1], boldHeader ? titleColor[2] : grey[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      if (detailLines.length) doc.text(detailLines, tx, detailsY, { align });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (bill.branding.template === "split") {
        doc.setTextColor(255, 255, 255);
      } else if (inverseHeader) {
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      } else {
        doc.setTextColor(grey[0], grey[1], grey[2]);
      }
      doc.text(billTitleLines, C - 8, y - 14, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      if (bill.branding.template === "split") {
        doc.setTextColor(255, 255, 255);
      } else if (inverseHeader) {
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      } else {
        doc.setTextColor(dark[0], dark[1], dark[2]);
      }
      doc.text(billNumberLines, C - 8, billNumberY, { align: "right" });

      if (bill.branding.template === "elegant") {
        doc.setDrawColor(green[0], green[1], green[2]);
        doc.line(M, headerBottom, C, headerBottom);
      }

      // Accent divider
      y = headerBottom + 12;
      doc.setDrawColor(green[0], green[1], green[2]);
      doc.setLineWidth(2.5);
      doc.line(M, y, C, y);
      y += 22;

      const metaCard = (title: string, text: string, x: number, yy: number, width: number) => {
        const lines = doc.splitTextToSize(text || "—", width - 16);
        const height = Math.max(42, 27 + lines.length * 11);
        doc.setFillColor(247, 249, 248);
        doc.setDrawColor(229, 234, 232);
        doc.roundedRect(x, yy - 8, width, height, 4, 4, "FD");
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(x, yy - 8, width, 2, 1, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(grey[0], grey[1], grey[2]);
        doc.text(title, x + 8, yy + 3);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text(lines, x + 8, yy + 18);
        return height;
      };

      const metaWidth = (C - M - 12) / 2;
      const midX = M + metaWidth + 12;
      const firstMetaRowHeight = Math.max(
        metaCard("DATE", bill.saleDate, M, y, metaWidth),
        metaCard("PAYMENT", bill.paymentMode, midX, y, metaWidth),
      );
      y += firstMetaRowHeight + 10;
      const secondMetaRowHeight = Math.max(
        metaCard("CUSTOMER", bill.customerName, M, y, metaWidth),
        metaCard("PHONE", bill.customerPhone ?? "—", midX, y, metaWidth),
      );
      y += secondMetaRowHeight + 8;

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
        headStyles: {
          fillColor: bill.branding.template === "bold" ? green : [255, 255, 255],
          textColor: bill.branding.template === "bold" ? [255, 255, 255] : titleColor,
          fontSize: 9.5,
        },
        alternateRowStyles: { fillColor: [249, 250, 249] },
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

      y += 58;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.text("PAYMENT HISTORY", M, y);
      if (bill.payments.length) {
        autoTable(doc, {
          startY: y + 6,
          head: [["DATE", "MODE", "AMOUNT (Rs.)", "NOTE"]],
          body: bill.payments.map((payment) => [
            payment.paidOn,
            payment.mode,
            inr(payment.amount),
            payment.note,
          ]),
          styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5, textColor: [30, 30, 30] },
          headStyles: {
            fillColor: bill.branding.template === "bold" ? green : [255, 255, 255],
            textColor: bill.branding.template === "bold" ? [255, 255, 255] : titleColor,
            fontSize: 8.5,
          },
          bodyStyles: { lineWidth: { bottom: 0.5 }, lineColor: [235, 235, 235] },
          columnStyles: { 2: { halign: "right" } },
          margin: { left: M, right: M },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(grey[0], grey[1], grey[2]);
        doc.text("No payment entries recorded.", M, y + 16);
        y += 40;
      }

      // Footer — centered thank-you + shop line
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(grey[0], grey[1], grey[2]);
      doc.text(bill.branding.footer || " ", pageW / 2, y, { align: "center" });
      doc.setFontSize(8.5);
      const foot = [
        bill.branding.businessName,
        bill.branding.businessPhone,
        bill.branding.businessAddress,
        bill.branding.gstin ? `GSTIN: ${bill.branding.gstin}` : "",
      ].filter(Boolean).join(" · ");
      doc.text(doc.splitTextToSize(foot, C - M), pageW / 2, y + 14, { align: "center" });

}

async function buildPdfBlob(bill: BillPageProps): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await appendBillToPdf(doc, bill);
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

export function PrintButton({ bill }: { bill: BillPageProps }) {
  const [busy, setBusy] = useState(false);


  const pdfFileName = `sale-${String(bill.id).padStart(4, "0")}-bill.pdf`;


  const downloadPDF = async () => {
    try {
      setBusy(true);
      saveBlob(await buildPdfBlob(bill), pdfFileName);
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

export function ShareBillButton({ bill }: { bill: BillPageProps }) {
  const [busy, setBusy] = useState(false);
  const pending = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
  const money = (v: number) => `₹${v.toLocaleString("en-IN")}`;
  const billNo = `${bill.branding.billNumberPrefix.toUpperCase()}-${String(bill.id).padStart(4, "0")}`;
  const pdfFileName = `sale-${String(bill.id).padStart(4, "0")}-bill.pdf`;

  const shareOnWhatsApp = async () => {
    try {
      setBusy(true);
      const blob = await buildPdfBlob(bill);
      const file = new File([blob], pdfFileName, { type: "application/pdf" });
      const paymentLines = bill.payments.map(
        (payment) => `${payment.paidOn} · ${money(payment.amount)} · ${payment.mode}`,
      );
      const shareText = [
        `Bill ${billNo} - ${bill.customerName} - Total ${money(bill.totalAmount)}`,
        "Payments:",
        ...(paymentLines.length ? paymentLines : ["No payment entries recorded"]),
      ].join("\n");
      // Mobile: system share sheet - WhatsApp select karo, PDF attached jayegi
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill ${billNo} - ${bill.branding.businessName}`,
          text: shareText,
        });
        return;
      }
      // Desktop / purana browser: pehle download karo, phir wa.me khol do
      saveBlob(blob, pdfFileName);
      const phone = (bill.customerPhone || "").replace(/\D/g, "");
      const msg = encodeURIComponent(
        `Bill ${billNo} - ${bill.branding.businessName}\nCustomer: ${bill.customerName}\nTotal: ${money(pending)} pending (Total ${money(bill.totalAmount)}, Paid ${money(bill.paidAmount)})\nPayment history:\n${paymentLines.length ? paymentLines.join("\n") : "No payment entries recorded"}\nPDF abhi download ho gayi hai - yahi attach karke bhej raha hoon.`
      );
      window.open(`https://wa.me/${phone ? `91${phone.slice(-10)}` : ""}?text=${msg}`, "_blank");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print mt-6 flex justify-center">
      <Button
        size="lg"
        onClick={shareOnWhatsApp}
        disabled={busy}
        className="w-full sm:w-auto bg-[#25D366] text-white hover:bg-[#1DA851]"
      >
        {busy ? "Preparing..." : <MessageCircle className="mr-2 h-5 w-5" />}
        Share Bill on WhatsApp
      </Button>
    </div>
  );
}
