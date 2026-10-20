"use client";

/** Shop identity printed on every bill / report header. */
export const SHOP = {
  name: "Naseeb Daily Needs & Agencies",
  contact: "shaikh shahbaz : 9049642155",
  address: "tipu sultan chawk momin pura deulghat",
} as const;

export type ProfitPdfRow = {
  name: string;
  size: string;
  buyRate: number | null;
  sellRate: number;
  sellBoxes: number;
  profit: number;
};

type PdfSection = { title: string; head: string[]; body: string[][] };

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

/** Common A4 report PDF builder — logo + header, summary cards, tables. */
export async function buildReportPdf({
  title,
  summaryCards,
  sections,
}: {
  title: string;
  summaryCards: [string, string][];
  sections: PdfSection[];
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const green: [number, number, number] = [15, 118, 110];

  // Logo + header
  try {
    const logoData = await loadLogoDataUrl("/image.png");
    doc.addImage(logoData, "PNG", 40, 25, 45, 45);
  } catch { /* logo optional */ }
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
  doc.text(title, 100, 92);
  doc.setDrawColor(green[0], green[1], green[2]);
  doc.setLineWidth(2.5);
  doc.line(40, 108, pageW - 40, 108);

  // Summary cards
  let y = 126;
  const cardW = (pageW - 80 - (summaryCards.length - 1) * 10) / summaryCards.length;
  summaryCards.forEach(([lbl, val], i) => {
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
  y += 76;

  const base = {
    styles: { fontSize: 13, cellPadding: 9 },
    headStyles: { fillColor: green, textColor: 255, fontSize: 13, fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: [246, 250, 249] as [number, number, number] },
    margin: { left: 40, right: 40 },
  };
  const lastY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  for (const s of sections) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(green[0], green[1], green[2]);
    if (y > pageH - 140) {
      doc.addPage();
      y = 50;
    }
    doc.text(s.title, 40, y);
    autoTable(doc, { ...base, startY: y + 10, head: [s.head], body: s.body });
    y = lastY() + 30;
  }

  const gen = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(140, 140, 140);
  doc.text(`Generated on ${gen} IST - ${SHOP.name}`, 40, pageH - 30);

  return doc.output("blob");
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Mobile: share sheet me PDF attach · Desktop: download + wa.me kholo. */
export async function sharePdfFile(blob: Blob, filename: string, message: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text: message });
      return;
    } catch {
      return; // user ne cancel kiya
    }
  }
  downloadPdfBlob(blob, filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}
