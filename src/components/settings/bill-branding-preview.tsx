"use client";

import { BillHeader } from "@/components/bill/bill-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillReadableAccentColor, type BillBranding } from "@/lib/bill-branding";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export function BillBrandingPreview({ branding }: { branding: BillBranding }) {
  const accent = getBillReadableAccentColor(branding.color);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Live bill preview</CardTitle>
        <p className="text-xs text-muted-foreground">
          Updates as you edit. This sample shows how the printed bill will look.
        </p>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
        <div className="mx-auto max-w-[700px] overflow-hidden rounded-lg border bg-white p-3 text-gray-900 shadow-sm sm:p-5">
          <BillHeader branding={branding} billNumber="0123" />

          <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold uppercase text-gray-500">Date</p>
              <p>03 Nov 2026</p>
            </div>
            <div>
              <p className="font-semibold uppercase text-gray-500">Payment</p>
              <p>Partial</p>
            </div>
            <div>
              <p className="font-semibold uppercase text-gray-500">Customer</p>
              <p>Sample Customer</p>
            </div>
            <div>
              <p className="font-semibold uppercase text-gray-500">Phone</p>
              <p>98765 43210</p>
            </div>
          </div>

          <table className="mb-4 w-full text-xs">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase text-gray-500" style={{ borderColor: branding.color }}>
                <th className="py-2 pr-1">Item</th>
                <th className="py-2 px-1 text-right">Boxes</th>
                <th className="py-2 px-1 text-right">Rate</th>
                <th className="py-2 pl-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-1">Sample Product (Large)</td>
                <td className="py-2 px-1 text-right">2</td>
                <td className="py-2 px-1 text-right">{money(250)}</td>
                <td className="py-2 pl-1 text-right">{money(500)}</td>
              </tr>
              <tr className="border-t-2" style={{ borderColor: branding.color }}>
                <td colSpan={3} className="py-2 pr-1 text-right font-bold">Total</td>
                <td className="py-2 pl-1 text-right font-bold">{money(500)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 pr-1 text-right text-gray-500">Paid</td>
                <td className="py-1 pl-1 text-right text-emerald-700">{money(200)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 pr-1 text-right text-gray-500">Pending</td>
                <td className="py-1 pl-1 text-right text-red-700">{money(300)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-3 border-t border-gray-200 pt-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
              Payment History
            </p>
            <div className="grid grid-cols-3 text-[10px] text-gray-600">
              <span>03 Nov 2026</span>
              <span>Cash</span>
              <span className="text-right">{money(200)}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3 text-center text-[10px] text-gray-500">
            {branding.footer || " "}
            <br />
            {[branding.businessName, branding.businessPhone, branding.businessAddress].filter(Boolean).join(" · ")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
