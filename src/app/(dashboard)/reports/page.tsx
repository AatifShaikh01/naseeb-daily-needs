import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { getDailyReport, getMonthlyProfit, getMonthlyReport } from "@/lib/analytics";
import { todayIST } from "@/lib/dates";
import { ReportCsvExport, MonthlyPdfExport, DailyPdfExport } from "@/components/reports/report-export";
import { ProfitCard } from "@/components/reports/profit-card";

import type { MonthlyProfit } from "@/lib/analytics";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  const params = await searchParams;

  const defaultDate = todayIST();
  const defaultMonth = defaultDate.slice(0, 7);

  const dailyDate = params.date ?? defaultDate;
  const daily = await getDailyReport(dailyDate);

  const month = params.month ?? defaultMonth;
  const monthly = await getMonthlyReport(month);
  const profit = await getMonthlyProfit(month);

  const dailyCsvRows: (string | number | null)[][] = [
    ["Date", daily.date],
    ["Stock In Boxes", daily.stockInBoxes],
    ["Sales Boxes", daily.salesBoxes],
    ["Sales Count", daily.salesCount],
    ["Sales Amount (₹)", daily.salesAmount],
    ["Payments Received (₹)", daily.paymentsReceived],
    ["Pending at Date (₹)", daily.pendingAtDate],
    [],
    ["Product", "Size", "Boxes"],
    ...daily.stockInRows.map((r) => [r.productName, r.size, r.boxes] as [string, string, number]),
  ];

  const dailyFileName = `naseeb-report-${dailyDate}.csv`;

  const monthlyCsvRows: (string | number | null)[][] = [
    ["Month", monthly.month],
    ["Total Sales Amount (₹)", monthly.totalSalesAmount],
    ["Total Boxes Sold", monthly.totalBoxesSold],
    ["Total Pending (₹)", monthly.totalPending],
    [],
    ["Product", "Size", "Boxes Sold", "Amount (₹)"],
    ...monthly.productSales.map((r) => [r.name, r.size, r.boxes, r.amount] as [string, string, number, number]),
    [],
    ["Customer", "Boxes Sold", "Amount (₹)"],
    ...monthly.customerSales.map((r) => [r.name, r.boxes, r.amount]),
    [],
    ["Staff", "Boxes Delivered"],
    ...monthly.staffDelivered.map((r) => [r.name, r.boxes] as [string, number]),
  ];

  const monthlyFileName = `naseeb-report-${monthly.month}.csv`;

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-page, #report-page * { visibility: visible; }
          #report-page { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div id="report-page" className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Daily and monthly overview with CSV export.</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Daily Report Section */}
          <div id="daily-section" className="min-w-0">
            
            <Card className="mt-6">
              <CardHeader>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Daily Report</CardTitle>
                  <form method="get" className="no-print flex max-w-full flex-wrap items-center gap-2">
                    <label htmlFor="date" className="text-sm text-muted-foreground">
                      Date
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      defaultValue={dailyDate}
                      className="min-w-0 max-w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Update
                    </button>
                  </form>
                </div>
              </CardHeader>
              <CardContent>
                {daily.stockInRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stock-in records for this date.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Stock In Boxes</span>
                      <span className="tabular-nums">{daily.stockInBoxes}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Sales Boxes</span>
                      <span className="tabular-nums">{daily.salesBoxes}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Sales Count</span>
                      <span className="tabular-nums">{daily.salesCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Sales Amount</span>
                      <span className="tabular-nums">₹{daily.salesAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Payments Received</span>
                      <span className="tabular-nums">₹{daily.paymentsReceived.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-destructive">Pending at Date</span>
                      <span className="tabular-nums text-destructive">₹{daily.pendingAtDate.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 border-t border-border/60 pt-4">
                  <h3 className="text-sm font-semibold mb-2">Stock In Detail (Date)</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Product</th>
                        <th className="py-2 pr-2 font-medium">Size</th>
                        <th className="py-2 font-medium">Boxes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.stockInRows.map((r) => (
                        <tr key={`${r.productName}-${r.size}`} className="border-b border-border/40">
                          <td className="py-2 pr-2">{r.productName}</td>
                          <td className="py-2 pr-2">{r.size}</td>
                          <td className="py-2 pr-2 tabular-nums">{r.boxes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ReportCsvExport filename={dailyFileName} rows={dailyCsvRows} />
                  <DailyPdfExport
                    date={daily.date}
                    summary={{
                      stockInBoxes: daily.stockInBoxes,
                      salesBoxes: daily.salesBoxes,
                      salesCount: daily.salesCount,
                      salesAmount: daily.salesAmount,
                      paymentsReceived: daily.paymentsReceived,
                      pendingAtDate: daily.pendingAtDate,
                    }}
                    stockInRows={daily.stockInRows}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Report Section */}
          <div id="monthly-section" className="min-w-0">
            
            <Card className="mt-6">
              <CardHeader>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Monthly Report</CardTitle>
                  <form method="get" className="no-print flex max-w-full flex-wrap items-center gap-2">
                    <label htmlFor="month" className="text-sm text-muted-foreground">
                      Month
                    </label>
                    <input
                      id="month"
                      name="month"
                      type="month"
                      defaultValue={month}
                      className="min-w-0 max-w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Update
                    </button>
                  </form>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Month</span>
                    <span className="tabular-nums">{monthLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total Sales Amount</span>
                    <span className="tabular-nums">₹{monthly.totalSalesAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total Boxes Sold</span>
                    <span className="tabular-nums">{monthly.totalBoxesSold}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-destructive">Total Pending</span>
                    <span className="tabular-nums text-destructive">₹{monthly.totalPending.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border/60 pt-4">
                  <h3 className="text-sm font-semibold mb-2">Product Sales</h3>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Product</th>
                        <th className="py-2 pr-2 font-medium">Size</th>
                        <th className="py-2 font-medium">Boxes Sold</th>
                        <th className="py-2 font-medium">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.productSales.map((r) => (
                        <tr key={`${r.name}-${r.size}`} className="border-b border-border/40">
                          <td className="py-2 pr-2">{r.name}</td>
                          <td className="py-2 pr-2">{r.size}</td>
                          <td className="py-2 pr-2 tabular-nums">{r.boxes}</td>
                          <td className="py-2 pr-2 tabular-nums">₹{r.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                <div className="mt-4 border-t border-border/60 pt-4">
                  <h3 className="text-sm font-semibold mb-2">Customer Sales</h3>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[380px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Customer</th>
                        <th className="py-2 font-medium">Boxes Sold</th>
                        <th className="py-2 font-medium">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.customerSales.map((r) => (
                        <tr key={r.name} className="border-b border-border/40">
                          <td className="py-2 pr-2">{r.name}</td>
                          <td className="py-2 pr-2 tabular-nums">{r.boxes}</td>
                          <td className="py-2 tabular-nums">₹{r.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                <div className="mt-4 border-t border-border/60 pt-4">
                  <h3 className="text-sm font-semibold mb-2">Staff Delivery</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Staff</th>
                        <th className="py-2 font-medium">Boxes Delivered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.staffDelivered.map((r) => (
                        <tr key={r.name} className="border-b border-border/40">
                          <td className="py-2 pr-2">{r.name}</td>
                          <td className="py-2 tabular-nums">{r.boxes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="no-print mt-4 flex flex-wrap gap-2">
                  <ReportCsvExport filename={monthlyFileName} rows={monthlyCsvRows} />
                  <MonthlyPdfExport
                    monthLabel={monthLabel}
                    totals={{
                      totalSalesAmount: monthly.totalSalesAmount,
                      totalBoxesSold: monthly.totalBoxesSold,
                      totalPending: monthly.totalPending,
                    }}
                    productSales={monthly.productSales}
                    customerSales={monthly.customerSales}
                    staffDelivered={monthly.staffDelivered}
                  />
                </div>
              </CardContent>
            </Card>
            <ProfitCard month={month} monthLabel={monthLabel} profit={profit} />
          </div>
        </div>
      </div>
    </>
  );
}
