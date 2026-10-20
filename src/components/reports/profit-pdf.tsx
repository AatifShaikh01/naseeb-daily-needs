"use client";

import { useState } from "react";

import { SHOP, buildReportPdf, downloadPdfBlob, sharePdfFile, type ProfitPdfRow } from "@/lib/report-pdf";

/** Monthly profit ka PDF — DIRECT download, koi print dialog nahi. */
export function ProfitPdfDownload({
  month,
  monthLabel,
  totals,
  rows,
}: {
  month: string;
  monthLabel: string;
  totals: { revenue: number; cost: number; profit: number };
  rows: ProfitPdfRow[];
}) {
  const [busy, setBusy] = useState(false);

  const onDownload = async () => {
    try {
      setBusy(true);
      const blob = await buildReportPdf({
        title: `Monthly Profit Report - ${monthLabel}`,
        summaryCards: [
          ["Total Revenue", `Rs.${totals.revenue.toLocaleString("en-IN")}`],
          ["Total Cost", `Rs.${totals.cost.toLocaleString("en-IN")}`],
          ["Total Profit", `Rs.${totals.profit.toLocaleString("en-IN")}`],
        ],
        sections: [
          {
            title: "Product-wise Profit",
            head: ["Product", "Buy Rate", "Sell Rate", "Sold", "Profit (Rs.)"],
            body:
              rows.length > 0
                ? rows.map((r) => [
                    `${r.name} (${r.size})`,
                    r.buyRate != null ? `Rs.${r.buyRate.toLocaleString("en-IN")}` : "-",
                    `Rs.${r.sellRate.toLocaleString("en-IN")}`,
                    String(r.sellBoxes),
                    `Rs.${r.profit.toLocaleString("en-IN")}`,
                  ])
                : [["No sales this month", "", "", "", ""]],
          },
        ],
      });
      downloadPdfBlob(blob, `naseeb-profit-${month}.pdf`);
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

/** Monthly profit PDF — app se seedha WhatsApp share (mobile) ya download + wa.me (desktop). */
export function ProfitPdfShare({
  month,
  monthLabel,
  totals,
  rows,
}: {
  month: string;
  monthLabel: string;
  totals: { revenue: number; cost: number; profit: number };
  rows: ProfitPdfRow[];
}) {
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    try {
      setBusy(true);
      const blob = await buildReportPdf({
        title: `Monthly Profit Report - ${monthLabel}`,
        summaryCards: [
          ["Total Revenue", `Rs.${totals.revenue.toLocaleString("en-IN")}`],
          ["Total Cost", `Rs.${totals.cost.toLocaleString("en-IN")}`],
          ["Total Profit", `Rs.${totals.profit.toLocaleString("en-IN")}`],
        ],
        sections: [
          {
            title: "Product-wise Profit",
            head: ["Product", "Buy Rate", "Sell Rate", "Sold", "Profit (Rs.)"],
            body:
              rows.length > 0
                ? rows.map((r) => [
                    `${r.name} (${r.size})`,
                    r.buyRate != null ? `Rs.${r.buyRate.toLocaleString("en-IN")}` : "-",
                    `Rs.${r.sellRate.toLocaleString("en-IN")}`,
                    String(r.sellBoxes),
                    `Rs.${r.profit.toLocaleString("en-IN")}`,
                  ])
                : [["No sales this month", "", "", "", ""]],
          },
        ],
      });
      const fileName = `naseeb-profit-${month}.pdf`;
      await sharePdfFile(
        blob,
        fileName,
        `${SHOP.name} - Profit ${monthLabel} - Profit Rs.${totals.profit.toLocaleString("en-IN")} (Revenue Rs.${totals.revenue.toLocaleString("en-IN")})\nPDF download ho gayi hai - yahi attach karke bhej raha hoon.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={busy}
      className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1DA851] disabled:opacity-50"
    >
      {busy ? "Preparing..." : "Share on WhatsApp"}
    </button>
  );
}
