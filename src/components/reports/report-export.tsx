"use client";

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

/** Monthly report ka formatted PDF — alag print-only layout kholke print dialog.
 *  User "Save as PDF" chune to saaf-suthra A4 PDF mil jayega. */
export function MonthlyPdfExport({
  monthLabel,
  totals,
  productSales,
  customerSales,
  staffDelivered,
}: {
  monthLabel: string;
  totals: { totalSalesAmount: number; totalBoxesSold: number; totalPending: number };
  productSales: { name: string; size: string; boxes: number; amount: number }[];
  customerSales: { name: string; boxes: number; amount: number }[];
  staffDelivered: { name: string; boxes: number }[];
}) {
  const onPrint = () => {
    const inr = (n: number) => `Rs.${n.toLocaleString("en-IN")}`;
    const row = (cells: string[]) =>
      `<tr>${cells.map((c, i) => `<td class="${i > 0 ? "num" : ""}">${c}</td>`).join("")}</tr>`;
    const table = (heads: string[], body: string) =>
      `<table><thead><tr>${heads.map((h, i) => `<th class="${i > 0 ? "num" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${heads.length}" class="muted">No data</td></tr>`}</tbody></table>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Monthly Report — ${monthLabel}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;font-size:12px}
      .head{border-bottom:3px solid #0F766E;padding-bottom:12px;margin-bottom:16px}
      .head h1{font-size:20px;color:#0F766E}
      .head p{color:#555;margin-top:4px}
      .cards{display:flex;gap:12px;margin:16px 0}
      .card{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px 12px}
      .card .lbl{font-size:11px;color:#666}
      .card .val{font-size:16px;font-weight:bold;margin-top:2px}
      h2{font-size:14px;margin:20px 0 8px;color:#0F766E}
      table{width:100%;border-collapse:collapse;margin-top:4px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}
      th{background:#0F766E;color:#fff}
      tr:nth-child(even) td{background:#f6faf9}
      .num{text-align:right;font-variant-numeric:tabular-nums}
      .muted{color:#777;text-align:center}
      .foot{margin-top:20px;color:#777;font-size:11px;border-top:1px solid #ddd;padding-top:8px}
      @media print{body{padding:0}}
    </style></head><body>
      <div class="head"><h1>Naseeb Daily Needs &amp; Agencies</h1><p>Monthly Sales Report — ${monthLabel}</p></div>
      <div class="cards">
        <div class="card"><div class="lbl">Total Sales</div><div class="val">${inr(totals.totalSalesAmount)}</div></div>
        <div class="card"><div class="lbl">Total Boxes Sold</div><div class="val">${totals.totalBoxesSold}</div></div>
        <div class="card"><div class="lbl">Total Pending</div><div class="val">${inr(totals.totalPending)}</div></div>
      </div>
      <h2>Product-wise Sales</h2>
      ${table(["Product", "Size", "Boxes", "Amount"], productSales.map((r) => row([`${r.name}`, `${r.size}`, `${r.boxes}`, inr(r.amount)])).join(""))}
      <h2>Customer-wise Sales</h2>
      ${table(["Customer", "Boxes", "Amount"], customerSales.map((r) => row([`${r.name}`, `${r.boxes}`, inr(r.amount)])).join(""))}
      <h2>Staff Delivery</h2>
      ${table(["Staff", "Boxes Delivered"], staffDelivered.map((r) => row([`${r.name}`, `${r.boxes}`])).join(""))}
      <div class="foot">Generated on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · Naseeb Daily Needs &amp; Agencies</div>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // Content load hone ke baad print dialog
    w.onload = () => {
      w.print();
    };
  };

  return (
    <button
      type="button"
      onClick={onPrint}
      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
    >
      Download PDF
    </button>
  );
}
