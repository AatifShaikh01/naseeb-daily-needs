"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { appendBillToPdf, type BillPageProps } from "@/app/(dashboard)/bill/[saleId]/print-button";
import { formatDate } from "@/lib/dates";
import type { SaleCardData } from "@/components/sale/sale-card";
import type { SaleProduct, SaleStaff } from "@/components/sale/sale-form";
import { SaleCard } from "@/components/sale/sale-card";

type PacketSale = Omit<BillPageProps, "items" | "payments" | "totalAmount" | "paidAmount"> &
  Omit<SaleCardData, "items" | "payments" | "totalAmount" | "paidAmount"> & {
  totalAmount: number;
  paidAmount: number;
  items: (BillPageProps["items"][number] & { productId: number })[];
  payments: BillPageProps["payments"];
};

type SalesSelectionListProps = {
  sales: PacketSale[];
  staffNameById: Map<number, string>;
  products: SaleProduct[];
  staff: SaleStaff[];
  today: string;
};

const money = (amount: number) => `Rs.${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function drawCheckbox(doc: import("jspdf").jsPDF, x: number, y: number, size = 9) {
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.8);
  doc.rect(x, y, size, size);
}

function packetHeading(
  doc: import("jspdf").jsPDF,
  businessName: string,
  title: string,
  date: string,
) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 75, 70);
  doc.text(businessName, 30, 30);
  doc.setFontSize(13);
  doc.text(title, width - 30, 30, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Delivery date: ${date}`, 30, 46);
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(1.5);
  doc.line(30, 56, width - 30, 56);
}

async function buildDeliveryPacket(sales: PacketSale[], date: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  for (const [index, sale] of sales.entries()) {
    if (index > 0) doc.addPage("a4", "portrait");
    await appendBillToPdf(doc, sale);
  }

  doc.addPage("a4", "landscape");
  packetHeading(doc, sales[0].branding.businessName, "DELIVERY CHECKLIST", formatDate(date));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`Driver: __________________________    Vehicle: __________________________`, 30, 72);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const checklistRows = sales.map((sale, index) => [
    String(index + 1),
    sale.customerName,
    sale.customerPhone ?? "—",
    String(sale.items.reduce((sum, item) => sum + item.boxes, 0)),
    money(sale.totalAmount),
    "",
    "",
  ]);
  const totalBoxes = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.boxes, 0),
    0,
  );
  checklistRows.push(["", "TOTAL", "", String(totalBoxes), money(sales.reduce((sum, sale) => sum + sale.totalAmount, 0)), "", ""]);
  autoTable(doc, {
    startY: 82,
    head: [["#", "Customer", "Phone", "Total boxes", "Amount", "Payment (Paid / Partial / Pending)", "Delivered ✓"]],
    body: checklistRows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, minCellHeight: 25, textColor: [35, 35, 35] },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontSize: 8, minCellHeight: 30 },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 155 },
      2: { cellWidth: 90 },
      3: { cellWidth: 60, halign: "center" },
      4: { cellWidth: 75, halign: "right" },
      5: { cellWidth: 150 },
      6: { cellWidth: 68, halign: "center" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 6 && data.row.index < sales.length) {
        drawCheckbox(doc, data.cell.x + data.cell.width / 2 - 4.5, data.cell.y + data.cell.height / 2 - 4.5);
      }
    },
    margin: { left: 30, right: 30, bottom: 32 },
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Driver signature: ______________________________", pageWidth - 30, pageHeight - 18, { align: "right" });

  const productLabels = [...new Set(sales.flatMap((sale) =>
    sale.items.map((item) => `${item.productName}${item.productSize ? ` (${item.productSize})` : ""}`),
  ))];
  const productIndex = new Map(productLabels.map((label, index) => [label, index]));
  const loadTotals = Array.from({ length: productLabels.length }, () => 0);
  const loadRows = sales.map((sale, index) => {
    const quantities = Array.from({ length: productLabels.length }, () => 0);
    for (const item of sale.items) {
      const label = `${item.productName}${item.productSize ? ` (${item.productSize})` : ""}`;
      const column = productIndex.get(label)!;
      quantities[column] += item.boxes;
      loadTotals[column] += item.boxes;
    }
    return [
      String(index + 1),
      sale.customerName,
      ...quantities.map((quantity) => quantity ? String(quantity) : "—"),
      String(quantities.reduce((sum, quantity) => sum + quantity, 0)),
      "",
    ];
  });
  loadRows.push(["", "TOTAL LOAD", ...loadTotals.map(String), String(totalBoxes), ""]);

  doc.addPage("a4", "landscape");
  packetHeading(doc, sales[0].branding.businessName, "VEHICLE LOAD SHEET", formatDate(date));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Customers: ${sales.length}     Total boxes to load: ${totalBoxes}`, 30, 74);
  const fixedWidth = 28 + 130 + 48 + 28;
  const productWidth = Math.max(34, Math.min(74, (pageWidth - 60 - fixedWidth) / Math.max(1, productLabels.length)));
  autoTable(doc, {
    startY: 84,
    head: [["#", "Customer", ...productLabels, "Total boxes", "Loaded ✓"]],
    body: loadRows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, minCellHeight: 23, textColor: [35, 35, 35], halign: "center" },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontSize: 7.5, minCellHeight: 32 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 130, halign: "left" },
      ...Object.fromEntries(productLabels.map((_, index) => [index + 2, { cellWidth: productWidth }])),
      [productLabels.length + 2]: { cellWidth: 48 },
      [productLabels.length + 3]: { cellWidth: 60 },
    },
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 1],
    didDrawCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === productLabels.length + 3 &&
        data.row.index < sales.length
      ) {
        drawCheckbox(doc, data.cell.x + data.cell.width / 2 - 4.5, data.cell.y + data.cell.height / 2 - 4.5);
      }
    },
    margin: { left: 30, right: 30, bottom: 30 },
  });

  return doc.output("blob");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function SalesSelectionList({
  sales,
  staffNameById,
  products,
  staff,
  today,
}: SalesSelectionListProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const eligible = useMemo(
    () => sales.filter((sale) => sale.items.length > 0 && sale.approvalStatus === "approved"),
    [sales],
  );
  const selected = eligible.filter((sale) => selectedIds.includes(sale.id));

  const toggle = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const selectAll = () => {
    setSelectedIds((current) =>
      current.length === eligible.length && eligible.every((sale) => current.includes(sale.id))
        ? []
        : eligible.map((sale) => sale.id),
    );
  };

  const createPacket = async (print: boolean) => {
    if (!selected.length) {
      toast.error("Select at least one approved order.");
      return;
    }
    let printWindow: Window | null = null;
    if (print) printWindow = window.open("", "_blank");
    setBusy(true);
    try {
      const blob = await buildDeliveryPacket(selected, today);
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
        window.setTimeout(() => printWindow?.print(), 1200);
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        saveBlob(blob, `delivery-packet-${today}.pdf`);
        if (print) toast.message("PDF downloaded. Open it and print the single combined packet.");
      }
      toast.success(print ? "Delivery packet is ready to print." : "Combined delivery PDF downloaded.");
    } catch (error) {
      printWindow?.close();
      toast.error(error instanceof Error ? error.message : "Could not create the delivery PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {eligible.length ? (
        <div className="sticky top-20 z-20 rounded-2xl border border-primary/20 bg-card p-3 shadow-float">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selected.length === eligible.length && eligible.length > 0}
                onChange={selectAll}
                className="h-4 w-4 accent-primary"
              />
              Select all approved orders ({eligible.length})
            </label>
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void createPacket(true)} disabled={busy || !selected.length}>
              {busy ? <Loader2 className="animate-spin" /> : <Printer />}
              Create &amp; print packet
            </Button>
            <Button type="button" variant="outline" onClick={() => void createPacket(false)} disabled={busy || !selected.length}>
              <Download /> Download combined PDF
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Includes one bill page per order, a payment checklist and a product-wise vehicle load sheet.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {sales.map((sale) => {
          const canSelect = sale.items.length > 0 && sale.approvalStatus === "approved";
          return (
            <div key={sale.id} className="space-y-2">
              {canSelect ? (
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(sale.id)}
                    onChange={() => toggle(sale.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  Include in delivery packet
                </label>
              ) : null}
              <SaleCard
                sale={{
                  ...sale,
                  totalAmount: String(sale.totalAmount),
                  paidAmount: String(sale.paidAmount),
                  items: sale.items.map((item) => ({
                    ...item,
                    ratePerBox: String(item.ratePerBox),
                  })),
                  payments: sale.payments.map((payment) => ({
                    ...payment,
                    amount: String(payment.amount),
                  })),
                }}
                staffName={staffNameById.get(sale.deliveredBy) ?? "—"}
                products={products}
                staff={staff}
                today={today}
                canEdit
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
