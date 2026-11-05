import { IndianRupee, Package, Clock, ShoppingCart, Banknote, Boxes, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesOverviewCard } from "@/components/charts/sales-overview";
import { getTodaySummary, getTodayActivity, getProductStock, getLast7DaysSales, getPrevious7DaysSales, getStaffDelivery, getTopPendingCustomers } from "@/lib/analytics";
import { todayIST, formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/actions/auth";
import { isStaffSession } from "@/lib/authorization";
import { db, payments, saleItems, sales } from "@/db";

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
  const session = await getSession();
  if (!session) redirect("/login");
  if (isStaffSession(session)) return <StaffDashboard staffId={session.uid} staffName={session.name} />;

  const today = todayIST();
  const [summary, activity, productStock, salesData, prev7Total, staffDelivery, topPending] =
    await Promise.all([
      getTodaySummary(today),
      getTodayActivity(today),
      getProductStock(),
      getLast7DaysSales(today),
      getPrevious7DaysSales(today),
      getStaffDelivery(today),
      getTopPendingCustomers(5),
    ]);
  const { totalSalesAmount, deliveredBoxes, salesAmount, totalPending } = summary;

  const stats = [
    { label: "Total Sales (overall)", value: "₹" + totalSalesAmount.toLocaleString("en-IN"), icon: Package, accentClass: "bg-primary/10 text-primary", href: "/sales" },
    { label: "Delivered Today", value: deliveredBoxes + " boxes", icon: ShoppingCart, accentClass: "bg-secondary/10 text-secondary", href: `/sales?date=${today}` },
    { label: "Today's Sales", value: "₹" + salesAmount.toLocaleString("en-IN"), icon: IndianRupee, accentClass: "bg-accent/15 text-accent-foreground", href: `/sales?date=${today}` },
    { label: "Total Pending", value: "₹" + totalPending.toLocaleString("en-IN"), icon: Clock, accentClass: "bg-muted/15 text-muted-foreground", href: "/pending" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Today overview — overall sales, delivered boxes, sales and pending payments (${formatDate(today)}).`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${stat.label}: ${stat.value}. Open details`}
          >
          <Card className="h-full transition-shadow hover:shadow-float">
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
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <Link
          href={`/staff/daily?date=${today}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileText className="h-4 w-4 text-primary" />
          Open today&apos;s staff sales &amp; payment report
        </Link>
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
                    ) : item.kind === "visit" ? (
                      <UserRound className="h-4 w-4" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                  </div>
                  <Link
                    href={item.kind === "stock" ? "/stock" : `/customers/${item.id}`}
                    className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="truncate text-sm font-medium">
                      {item.kind === "stock" ? `${item.productName} (${item.size})` : item.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.kind === "stock"
                        ? `${boxLabel(item.boxes)}${item.note ? " — " + item.note : ""}`
                        : item.kind === "visit"
                          ? "Shop visit — no order"
                          : `${boxLabel(item.boxes)} — ₹${item.amount.toLocaleString("en-IN")}`}
                    </p>
                  </Link>
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
                <Link
                  key={p.id}
                  href="/stock"
                  className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`View stock for ${p.name} ${p.size}`}
                >
                <Card className="h-full p-3 transition-shadow hover:shadow-float">
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Chart section — Sales Overview */}
      <SalesOverviewCard data={salesData} previousTotal={prev7Total} />

      {/* Delivered by section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Delivered By</CardTitle>
          <CardDescription>Boxes delivered today and this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {staffDelivery.map((s) => (
              <Link
                key={s.staffId}
                href={`/staff/${s.staffId}`}
                className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View ${s.name}'s staff report`}
              >
              <Card className="h-full p-4 transition-shadow hover:shadow-float">
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
              </Link>
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
                    <Link
                      href={`/pending?customer=${encodeURIComponent(c.name)}`}
                      className="block truncate font-medium hover:text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
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

async function StaffDashboard({ staffId, staffName }: { staffId: number; staffName: string }) {
  const today = todayIST();
  const monthStart = `${today.slice(0, 7)}-01`;
  const scope = or(eq(sales.staffId, staffId), eq(sales.deliveredBy, staffId));
  const [createdToday, createdThisMonth, pendingRows, collectedToday, collectedMonth, recentSales] =
    await Promise.all([
      db
        .select({
          count: sql<number>`count(*) filter (where exists (select 1 from ${saleItems} where ${saleItems.saleId} = ${sales.id}))`,
          amount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        })
        .from(sales)
        .where(and(eq(sales.staffId, staffId), eq(sales.saleDate, today))),
      db
        .select({
          count: sql<number>`count(*) filter (where exists (select 1 from ${saleItems} where ${saleItems.saleId} = ${sales.id}))`,
          amount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        })
        .from(sales)
        .where(and(eq(sales.staffId, staffId), gte(sales.saleDate, monthStart), lte(sales.saleDate, today))),
      db
        .select({
          amount: sql<string>`coalesce(sum(${sales.totalAmount} - ${sales.paidAmount}), 0)`,
        })
        .from(sales)
        .where(and(scope, sql`${sales.totalAmount} > ${sales.paidAmount}`)),
      db
        .select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(and(eq(payments.staffId, staffId), eq(payments.paidOn, today))),
      db
        .select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(and(eq(payments.staffId, staffId), gte(payments.paidOn, monthStart), lte(payments.paidOn, today))),
      db
        .select({
          id: sales.id,
          saleDate: sales.saleDate,
          customerName: sales.customerName,
          totalAmount: sales.totalAmount,
          paidAmount: sales.paidAmount,
          paymentStatus: sales.paymentStatus,
          hasItems: sql<boolean>`exists (select 1 from ${saleItems} where ${saleItems.saleId} = ${sales.id})`,
        })
        .from(sales)
        .where(scope)
        .orderBy(desc(sales.saleDate), desc(sales.id))
        .limit(10),
    ]);

  const cards = [
    { label: "My sales today", value: `₹${Number(createdToday[0]?.amount ?? 0).toLocaleString("en-IN")}`, detail: `${createdToday[0]?.count ?? 0} bills`, icon: ShoppingCart },
    { label: "My sales this month", value: `₹${Number(createdThisMonth[0]?.amount ?? 0).toLocaleString("en-IN")}`, detail: `${createdThisMonth[0]?.count ?? 0} bills`, icon: IndianRupee },
    { label: "Pending on my sales / deliveries", value: `₹${Number(pendingRows[0]?.amount ?? 0).toLocaleString("en-IN")}`, detail: "Related outstanding", icon: Clock },
    { label: "Collected today", value: `₹${Number(collectedToday[0]?.amount ?? 0).toLocaleString("en-IN")}`, detail: "Payments recorded by you", icon: Banknote },
    { label: "Collected this month", value: `₹${Number(collectedMonth[0]?.amount ?? 0).toLocaleString("en-IN")}`, detail: "Payments recorded by you", icon: Boxes },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${staffName}`} description={`Your field sales and collections · ${formatDate(today)}.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <card.icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 truncate text-lg font-bold">{card.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/sale" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Record a Sale</Link>
        <Link href="/pending" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">My Pending</Link>
        <Link href="/customers" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">My Customers</Link>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent related sales</CardTitle>
          <CardDescription>Your sales and sales assigned to you for delivery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentSales.length ? recentSales.map((sale) => (
            <Link
              key={sale.id}
              href={`/customers/${sale.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-muted/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{sale.customerName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(sale.saleDate)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold">₹{Number(sale.totalAmount).toLocaleString("en-IN")}</span>
                <span className="text-xs capitalize text-muted-foreground">{sale.hasItems ? sale.paymentStatus : "No Order"}</span>
              </span>
            </Link>
          )) : <p className="text-sm text-muted-foreground">No related sales yet.</p>}
        </CardContent>
      </Card>
    </>
  );
}