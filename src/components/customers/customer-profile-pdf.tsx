"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buildReportPdf, downloadPdfBlob } from "@/lib/report-pdf";

type CustomerProfilePdfData = {
  customer: {
    name: string;
    phone: string | null;
    saleCount: number;
    totalBoxes: number;
    totalSales: number;
    totalPaid: number;
    pending: number;
    advance: number;
  };
  sales: {
    id: number;
    saleDate: string;
    deliveredBy: string;
    total: number;
    paid: number;
    pending: number;
    advance: number;
    status: string;
    note: string;
    items: { name: string; size: string; boxes: number; rate: number; amount: number }[];
    payments: { paidOn: string; mode: string; amount: number; note: string; receivedBy: string }[];
  }[];
};

const money = (amount: number) => `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function dateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CustomerProfilePdf({ customer, sales }: CustomerProfilePdfData) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    try {
      setBusy(true);
      const paymentRows = sales.flatMap((sale) =>
        sale.payments.map((payment) => [
          `#${sale.id}`,
          dateLabel(payment.paidOn),
          payment.mode,
          money(payment.amount),
          payment.receivedBy,
          payment.note || "—",
        ]),
      );
      const sections = [
        {
          title: "Customer Details",
          head: ["Field", "Details"],
          body: [
            ["Customer", customer.name],
            ["Phone", customer.phone || "Not provided"],
            ["Sales", String(customer.saleCount)],
            ["Boxes delivered", String(customer.totalBoxes)],
          ],
        },
        {
          title: "Sales History",
          head: ["Sale", "Date", "Delivered By", "Boxes", "Total", "Paid", "Due / Credit", "Status"],
          body: sales.length
            ? sales.map((sale) => [
                `#${sale.id}`,
                dateLabel(sale.saleDate),
                sale.deliveredBy,
                String(sale.items.reduce((total, item) => total + item.boxes, 0)),
                money(sale.total),
                money(sale.paid),
                sale.pending > 0.005 ? money(sale.pending) : sale.advance > 0.005 ? `Credit ${money(sale.advance)}` : money(0),
                sale.status,
              ])
            : [["No sales recorded", "", "", "", "", "", "", ""]],
        },
        {
          title: "Items Sold",
          head: ["Sale", "Date", "Product", "Boxes", "Rate", "Amount"],
          body: sales.flatMap((sale) =>
            sale.items.map((item) => [
              `#${sale.id}`,
              dateLabel(sale.saleDate),
              `${item.name} · ${item.size}`,
              String(item.boxes),
              money(item.rate),
              money(item.amount),
            ]),
          ),
        },
        {
          title: "Payment History",
          head: ["Sale", "Payment Date", "Method (Cash / Online)", "Amount", "Paid To / Received By", "Note"],
          body: paymentRows.length ? paymentRows : [["No payment entries recorded", "", "", "", "", ""]],
        },
      ];
      const notes = sales.filter((sale) => sale.note.trim());
      if (notes.length) {
        sections.push({
          title: "Sale Notes",
          head: ["Sale", "Date", "Note"],
          body: notes.map((sale) => [`#${sale.id}`, dateLabel(sale.saleDate), sale.note]),
        });
      }

      const blob = await buildReportPdf({
        title: `Customer Profile - ${customer.name}`,
        summaryCards: [
          ["Total Sales", money(customer.totalSales)],
          ["Total Paid", money(customer.totalPaid)],
          ["Pending", money(customer.pending)],
          ["Advance", money(customer.advance)],
        ],
        sections,
      });
      const fileName = customer.name
        .normalize("NFKD")
        .replace(/[^\w-]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
      downloadPdfBlob(blob, `customer-${fileName || "profile"}.pdf`);
    } catch {
      toast.error("Could not generate customer PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleDownload} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      {busy ? "Preparing PDF..." : "Download full profile PDF"}
    </Button>
  );
}