import { IndianRupee, Package, Clock, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesBarChart } from "@/components/charts/sales-bar-chart";
import { getTodaySummary, getTodayActivity, getProductStock, getLast7DaysSales, getStaffDelivery, getTopPendingCustomers } from "@/lib/analytics";
import { todayIST, formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";

const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

const boxLabel = (n: number) => `${n} ${n === 1 ? "box" : "boxes"}`;

export default function HomePage() {
  // Static shell — route prerender ho sake. Saara runtime data
  // (connection + DB queries) DashboardContent me hai, jo layout
  // wale <Suspense> ke andar render hota hai.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-8 w-48 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-muted" />
    </div>
  );
}

async function DashboardContent() {
  // Request-time render — aaj ki date build-time par freeze na ho
  await connection();
  const today = todayIST();
  const { totalSalesAmount, deliveredBoxes, salesAmount, totalPending } = await getTodaySummary(today);
  const activity = await getTodayActivity(today);
  const productStock = await getProductStock();
  const salesData = await getLast7DaysSales(today);
  const staffDelivery = await getStaffDelivery(today);
  const topPending = await getTopPendingCustomers(5);

  const stats = [
    { label: "Total Sales (overall)", value: "₹" + totalSalesAmount.toLocaleString("en-IN"), icon: Package, accentClass: "bg-primary/10 text-primary" },
    { label: "Delivered Today", value: deliveredBoxes + " boxes", icon: ShoppingCart, accentClass: "bg-secondary/10 text-secondary" },
    { label: "Today's Sales", value: "₹" + salesAmount.toLocaleString("en-IN"), icon: IndianRupee, accentClass: "bg-accent/15 text-accent-foreground" },
    { label: "Total Pending", value: "₹" + totalPending.toLocaleString("en-IN"), icon: Clock, accentClass: "bg-muted/15 text-muted-foreground" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Today overview — overall sales, delivered boxes, sales and pending payments (${formatDate(today)}).`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.accentClass}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold leading-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Today&apos;s Activity</CardTitle>
          <CardDescription>Latest stock-in and sales for {formatDate(today)}.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded today yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.kind === "stock" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"}`}
                  >
                    {item.kind === "stock" ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.kind === "stock" ? `${item.productName} (${item.size})` : item.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.kind === "stock"
                        ? `${boxLabel(item.boxes)}${item.note ? " — " + item.note : ""}`
                        : `${boxLabel(item.boxes)} — ₹${item.amount.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">{formatTime(item.time)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Product-wise current stock */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Stock (Product-wise)</CardTitle>
          <CardDescription>Boxes remaining in stock per item.</CardDescription>
        </CardHeader>
        <CardContent>
          {productStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {productStock.map((p) => (
                <Card key={p.id} className="p-3">
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.size}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold leading-tight ${p.low ? "text-destructive" : "text-foreground"}`}>
                        {p.balance}
                      </p>
                      <p className="text-xs text-muted-foreground">boxes</p>
                    </div>
                  </CardContent>
                  {p.low && <Badge variant="destructive" className="mt-2">Low stock</Badge>}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Chart section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Last 7 Days Sales</CardTitle>
          <CardDescription>Today sales trend (₹).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            <div className="text-muted-foreground">Today</div>
            <div className="font-bold">₹{salesData[salesData.length - 1]?.amount.toLocaleString("en-IN") ?? "0"}</div>
            <div className="border-l border-border/60 ml-2 pl-2 text-muted-foreground">7-day total</div>
            <div className="font-bold">₹{salesData.reduce((sum, d) => sum + d.amount, 0).toLocaleString("en-IN")}</div>
          </div>
          <SalesBarChart data={salesData} />
        </CardContent>
      </Card>

      {/* Delivered by section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Delivered By</CardTitle>
          <CardDescription>Boxes delivered today and this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {staffDelivery.map((s) => (
              <Card key={s.staffId} className="p-4">
                <CardContent className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">{s.todayBoxes}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">{s.monthBoxes}</p>
                    <p className="text-xs text-muted-foreground">Month</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top pending customers */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top 5 Pending Customers</CardTitle>
          <CardDescription>Customers with unpaid balance.</CardDescription>
        </CardHeader>
        <CardContent>
          {topPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending payments.</p>
          ) : (
            <ul className="space-y-3">
              {topPending.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">₹{c.pending.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">as of {formatDate(c.oldestDate)}</p>
                    <Link
                      href={`/pending?customer=${encodeURIComponent(c.name)}`}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}