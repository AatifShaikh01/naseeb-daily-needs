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