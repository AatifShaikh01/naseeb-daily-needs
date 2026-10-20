"use client";

import { ReportCsvExport } from "@/components/reports/report-export";
import { ProfitPdfDownload, ProfitPdfShare } from "@/components/reports/profit-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyProfit } from "@/lib/analytics";

/** Monthly profit card — khareed vs bikri, product-wise table + CSV. */
export function ProfitCard({ month, monthLabel, profit }: { month: string; monthLabel: string; profit: MonthlyProfit }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Monthly Profit — {monthLabel}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Har product kitne me aaya vs kitne me bika — sirf beche gaye boxes par profit.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-lg font-bold tabular-nums">₹{profit.totalRevenue.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="text-lg font-bold tabular-nums">₹{profit.totalCost.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className={`text-lg font-bold tabular-nums ${profit.totalProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              ₹{profit.totalProfit.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        {profit.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Is mahine koi sale nahi hui.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Product</th>
                  <th className="py-2 pr-2 text-right font-medium">Buy rate</th>
                  <th className="py-2 pr-2 text-right font-medium">Sell rate</th>
                  <th className="py-2 pr-2 text-right font-medium">Sold</th>
                  <th className="py-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {profit.rows.map((r) => (
                  <tr key={`${r.name}-${r.size}`} className="border-b border-border/40">
                    <td className="py-2 pr-2">
                      {r.name} <span className="text-muted-foreground">({r.size})</span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {r.buyRate != null ? `₹${r.buyRate.toLocaleString("en-IN")}` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">₹{r.sellRate.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.sellBoxes}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${r.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                      ₹{r.profit.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {profit.rows.some((r) => r.buyRate == null) ? (
          <p className="mt-2 text-xs text-muted-foreground">— = is product ki khareed entry nahi mili.</p>
        ) : null}
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <ProfitPdfDownload
            month={month}
            monthLabel={monthLabel}
            totals={{ revenue: profit.totalRevenue, cost: profit.totalCost, profit: profit.totalProfit }}
            rows={profit.rows}
          />
          <ProfitPdfShare
            month={month}
            monthLabel={monthLabel}
            totals={{ revenue: profit.totalRevenue, cost: profit.totalCost, profit: profit.totalProfit }}
            rows={profit.rows}
          />
          <ReportCsvExport
            filename={`naseeb-profit-${month}.csv`}
            rows={[
              ["Month", monthLabel],
              ["Total Revenue (Rs.)", profit.totalRevenue],
              ["Total Cost (Rs.)", profit.totalCost],
              ["Total Profit (Rs.)", profit.totalProfit],
              [],
              ["Product", "Size", "Buy Rate", "Buy Boxes", "Sell Rate", "Sold", "Revenue", "Cost", "Profit"],
              ...profit.rows.map((r) => [r.name, r.size, r.buyRate, r.buyBoxes, r.sellRate, r.sellBoxes, r.revenue, r.cost, r.profit]),
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
