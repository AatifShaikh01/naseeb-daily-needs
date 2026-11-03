import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { CalendarDays, PackagePlus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { StockForm } from "@/components/stock/stock-form";
import { StockEntryList } from "@/components/stock/stock-entry-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, products, stockIn } from "@/db";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "Stock In" };


export default async function StockInPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayIST();
  const tab = params.tab === "today" ? "today" : "history";

  const productRows = await db.select().from(products).orderBy(asc(products.id));
  const productOpts = productRows.map((p) => ({ id: p.id, name: p.name, size: p.size }));

  const todayEntries = await db
    .select()
    .from(stockIn)
    .where(eq(stockIn.entryDate, today))
    .orderBy(desc(stockIn.id));

  const from = params.from ?? "";
  const to = params.to ?? "";
  const conditions = [];
  if (from) conditions.push(gte(stockIn.entryDate, from));
  if (to) conditions.push(lte(stockIn.entryDate, to));
  const historyEntries =
    tab === "history"
      ? await db
          .select()
          .from(stockIn)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(stockIn.entryDate), desc(stockIn.id))
          .limit(200)
      : [];

  return (
    <>
      <PageHeader
        title="Stock In"
        description="Record incoming stock. Add one or more products at once, then review today or older days."
      />

      <div className="mb-5 flex gap-2">
        <Link href="/stock-in?tab=today" replace>
          <Button variant={tab === "today" ? "default" : "outline"} size="sm">
            <PackagePlus /> Today
          </Button>
        </Link>
        <Link href="/stock-in?tab=history" replace>
          <Button variant={tab === "history" ? "default" : "outline"} size="sm">
            <CalendarDays /> History
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tab === "today" ? (
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Entries ({todayEntries.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <StockEntryList
                entries={todayEntries}
                products={productOpts}
                emptyMessage="No stock added today."
                showDate={false}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="tab" value="history" />
                <div className="space-y-1">
                  <label htmlFor="from" className="text-xs text-muted-foreground">From</label>
                  <input id="from" name="from" type="date" defaultValue={from}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="to" className="text-xs text-muted-foreground">To</label>
                  <input id="to" name="to" type="date" defaultValue={to}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                </div>
                <Button type="submit" variant="outline" size="sm">Filter</Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/stock-in?tab=history">Clear</Link>
                </Button>
              </form>

              <StockEntryList
                entries={historyEntries}
                products={productOpts}
                emptyMessage="No entries in this range."
                showDate
              />
            </CardContent>
          </Card>
        )}

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New Stock In</CardTitle>
          </CardHeader>
          <CardContent>
            {productRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add a product first.</p>
            ) : (
              <StockForm products={productOpts} today={today} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
