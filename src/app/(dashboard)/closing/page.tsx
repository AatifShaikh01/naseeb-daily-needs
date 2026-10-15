import { Suspense } from "react";
import { IndianRupee, Package, ShoppingCart, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getClosingSummary } from "@/lib/analytics";
import { formatDate, todayIST } from "@/lib/dates";

export const metadata = { title: "Daily Closing" };

export default async function ClosingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : todayIST();

  return (
    <>
      <PageHeader title="Daily Closing" description="Din bhar ka hisaab — cash in, supplier out, sales, pending." />
      <form method="get" className="mb-4 flex items-center gap-2">
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
        />
        <button type="submit" className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          View
        </button>
      </form>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ClosingBody date={date} />
      </Suspense>
    </>
  );
}

async function ClosingBody({ date }: { date: string }) {
  const c = await getClosingSummary(date);
  const cards = [
    { label: "Cash In", value: c.cashIn, icon: Wallet, cls: "bg-primary/10 text-primary" },
    { label: "UPI In", value: c.upiIn, icon: IndianRupee, cls: "bg-secondary/10 text-secondary" },
    { label: "Bank In", value: c.bankIn, icon: IndianRupee, cls: "bg-accent/15 text-accent-foreground" },
    { label: "Total In", value: c.totalIn, icon: IndianRupee, cls: "bg-primary/10 text-primary" },
    { label: "Supplier Out", value: c.supplierOut, icon: Package, cls: "bg-destructive/10 text-destructive" },
    { label: "Net Cash", value: c.netCash, icon: Wallet, cls: "bg-primary text-primary-foreground" },
    { label: "Sales Amount", value: c.salesAmount, icon: ShoppingCart, cls: "bg-muted/20 text-foreground" },
    { label: "Pending Today", value: c.pendingToday, icon: IndianRupee, cls: "bg-destructive/10 text-destructive" },
  ];
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{formatDate(date)} — {c.salesCount} sales, {c.boxesSold} boxes sold, {c.boxesStockIn} boxes stock-in.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold leading-tight">₹{s.value.toLocaleString("en-IN")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hisaab Summary</CardTitle>
          <CardDescription>Cash in minus supplier out = net cash in hand for the day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Cash + UPI + Bank</span><span className="font-semibold">₹{c.totalIn.toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Supplier paid</span><span className="font-semibold text-destructive">− ₹{c.supplierOut.toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-medium">Net Cash</span><span className="font-bold">₹{c.netCash.toLocaleString("en-IN")}</span></div>
        </CardContent>
      </Card>
    </>
  );
}
