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

type BillPageProps = {
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

async function buildPdfBlob(bill: BillPageProps): Promise<Blob> {
  const pending = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
  const billNo = `${bill.branding.billNumberPrefix.toUpperCase()}-${String(bill.id).padStart(4, "0")}`;
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const hex = bill.branding.color.slice(1);
      const accent: [number, number, number] = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
      const inr = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const M = 40;
      const C = pageW - M;
      const green = accent;
      const grey: [number, number, number] = [110, 110, 110];
      const dark: [number, number, number] = [30, 30, 30];
      const inverseHeader = bill.branding.template === "bold" || bill.branding.template === "split";
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
      const tx = minimal ? pageW / 2 : M + LOGO + 12;
      const textWidth = minimal ? pageW - M * 2 - 130 : C - tx - 105;
      const businessDetails = [
        bill.branding.businessPhone,
        bill.branding.businessAddress,
        bill.branding.gstin ? `GSTIN: ${bill.branding.gstin}` : "",
      ].filter(Boolean).join(" · ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      const nameLines = doc.splitTextToSize(bill.branding.businessName, textWidth);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const detailLines = businessDetails ? doc.splitTextToSize(businessDetails, textWidth) : [];
      const contentY = minimal ? y + 34 : y - 6;
      const detailsY = contentY + nameLines.length * 22;
      const headerBottom = Math.max(
        y + 42,
        detailsY + detailLines.length * 13 + (minimal ? 12 : 0),
      );

      if (bill.branding.template === "bold") {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(M, y - 34, pageW - M * 2, headerBottom - y + 40, 8, 8, "F");
      } else if (bill.branding.template === "modern") {
        doc.setFillColor(245, 248, 248);
        doc.roundedRect(M, y - 30, pageW - M * 2, headerBottom - y + 36, 8, 8, "F");
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(M, y - 30, 5, headerBottom - y + 36, "F");
      } else if (bill.branding.template === "elegant") {
        doc.setDrawColor(green[0], green[1], green[2]);
        doc.setLineWidth(0.7);
        doc.line(M, y - 30, C, y - 30);
      } else if (bill.branding.template === "split") {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(C - 112, y - 30, 112, 72, 8, 8, "F");
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
          doc.addImage(
            dataUrl,
            dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG",
            minimal ? pageW / 2 - LOGO / 2 : M,
            y - 24,
            LOGO,
            LOGO,
          );
        }
      } catch { /* logo optional — text header hi rahega */ }

      const boldHeader = bill.branding.template === "bold";
      const align = minimal ? "center" : "left";
      doc.setTextColor(businessColor[0], businessColor[1], businessColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(nameLines, tx, contentY, { align });
      doc.setTextColor(boldHeader ? titleColor[0] : grey[0], boldHeader ? titleColor[1] : grey[1], boldHeader ? titleColor[2] : grey[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      if (detailLines.length) doc.text(detailLines, tx, detailsY, { align });

      // Bill label and number stay visible across every template.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(inverseHeader ? titleColor[0] : grey[0], inverseHeader ? titleColor[1] : grey[1], inverseHeader ? titleColor[2] : grey[2]);
      doc.text(bill.branding.billTitle.toUpperCase(), C - (bill.branding.template === "split" ? 8 : 0), y - 18, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(inverseHeader ? titleColor[0] : dark[0], inverseHeader ? titleColor[1] : dark[1], inverseHeader ? titleColor[2] : dark[2]);
      doc.text(
        doc.splitTextToSize(billNo, 96),
        C - (bill.branding.template === "split" ? 8 : 0),
        y + 2,
        { align: "right" },
      );

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
        headStyles: {
          fillColor: bill.branding.template === "bold" ? green : [255, 255, 255],
          textColor: bill.branding.template === "bold" ? [255, 255, 255] : titleColor,
          fontSize: 9.5,
        },
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
