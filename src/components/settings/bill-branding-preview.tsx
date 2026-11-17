"use client";

import { BillHeader } from "@/components/bill/bill-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillContrastColor, type BillBranding } from "@/lib/bill-branding";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export function BillBrandingPreview({ branding }: { branding: BillBranding }) {
  const coloredHeader = branding.template === "bold" || branding.template === "split";
  const tableHeaderStyle = coloredHeader
    ? { backgroundColor: branding.color, color: getBillContrastColor(branding.color) }
    : branding.template === "modern"
      ? { backgroundColor: `${branding.color}14`, borderColor: branding.color }
      : branding.template === "elegant"
        ? { borderColor: branding.color }
        : undefined;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Live bill preview</CardTitle>
        <p className="text-xs text-muted-foreground">
          Updates as you edit. This sample shows how the printed bill will look.
        </p>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
        <div className="mx-auto max-w-[700px] border border-gray-200 bg-white p-3 text-gray-900 shadow-sm sm:p-5">
          <BillHeader branding={branding} billNumber="0123" billDate="03 Nov 2026" />

          <div className="mb-3 grid grid-cols-2 border-l border-t border-gray-400 text-xs sm:grid-cols-3">
            {[
              ["Customer", "Sample Customer"],
              ["Phone", "98765 43210"],
              ["Payment", "Partial"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 border-b border-r border-gray-400 px-2 py-1.5"
              >
                <p className="text-[9px] font-semibold uppercase text-gray-500">{label}</p>
                <p className="break-words font-medium capitalize">{value}</p>
              </div>
            ))}
          </div>

          <table className="mb-3 w-full table-fixed border-collapse text-[10px] sm:text-xs">
            <thead>
              <tr
                className={`text-left text-[9px] uppercase sm:text-[10px] ${
                  coloredHeader || branding.template === "modern" || branding.template === "elegant"
                    ? ""
                    : "bg-gray-100"
                }`}
                style={tableHeaderStyle}
              >
                <th className="w-[9%] border border-gray-500 px-1 py-1.5 text-center">Sr.</th>
                <th className="w-[43%] border border-gray-500 px-2 py-1.5">Description</th>
                <th className="w-[13%] border border-gray-500 px-1 py-1.5 text-right">Qty</th>
                <th className="w-[16%] border border-gray-500 px-1 py-1.5 text-right">Rate</th>
                <th className="w-[19%] border border-gray-500 px-1 py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`${branding.template === "modern" || branding.template === "split" ? "bg-gray-50" : ""} ${branding.template === "elegant" ? "font-serif" : ""}`}>
                <td className={`border border-gray-400 px-1 text-center ${branding.template === "minimal" ? "h-5" : "h-7"}`}>1</td>
                <td className={`border border-gray-400 px-2 ${branding.template === "minimal" ? "h-5" : "h-7"}`}>Sample Product (Large)</td>
                <td className={`border border-gray-400 px-1 text-right ${branding.template === "minimal" ? "h-5" : "h-7"}`}>2</td>
                <td className={`border border-gray-400 px-1 text-right ${branding.template === "minimal" ? "h-5" : "h-7"}`}>{money(250)}</td>
                <td className={`border border-gray-400 px-1 text-right ${branding.template === "minimal" ? "h-5" : "h-7"}`}>{money(500)}</td>
              </tr>
              {Array.from({ length: 3 }, (_, index) => (
                <tr key={`blank-${index}`} aria-hidden="true">
                  <td className="h-7 border border-gray-400" />
                  <td className="h-7 border border-gray-400" />
                  <td className="h-7 border border-gray-400" />
                  <td className="h-7 border border-gray-400" />
                  <td className="h-7 border border-gray-400" />
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="border border-gray-500 px-2 py-1.5 text-right font-bold">Total</td>
                <td className="border border-gray-500 px-1 py-1.5 text-right font-bold">{money(500)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="border border-gray-400 px-2 py-1 text-right text-gray-500">Paid</td>
                <td className="border border-gray-400 px-1 py-1 text-right">{money(200)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="border border-gray-400 px-2 py-1 text-right text-gray-500">Balance Due</td>
                <td className="border border-gray-400 px-1 py-1 text-right">{money(300)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-4">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-600">Payment History</p>
            <div className="grid grid-cols-3 border border-gray-400 text-[9px] text-gray-600">
              <span className="border-r border-gray-400 px-2 py-1">03 Nov 2026</span>
              <span className="border-r border-gray-400 px-2 py-1">Cash</span>
              <span className="px-2 py-1 text-right">{money(200)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-gray-400 pt-2 text-[9px] text-gray-500">
            <p>{branding.footer || " "}</p>
            <div className="w-28 border-t border-gray-500 pt-1 text-center">Authorized Signature</div>
          </div>
          <div className="mt-3 flex h-1 overflow-hidden" aria-hidden="true">
            <span className="w-1/3" style={{ backgroundColor: branding.color }} />
            <span className="w-1/3 bg-cyan-500" />
            <span className="w-1/3 bg-rose-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
