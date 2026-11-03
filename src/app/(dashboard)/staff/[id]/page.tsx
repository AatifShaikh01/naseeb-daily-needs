import Link from "next/link";
import { and, count, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, Boxes, CalendarDays, Clock3, ShoppingCart } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, payments, saleItems, sales, staff } from "@/db";
import { todayIST } from "@/lib/dates";
import { requireAdmin } from "@/lib/authorization";

export const metadata = { title: "Staff Profile" };

const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function validMonth(value: string | undefined) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : todayIST().slice(0, 7);
}

export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const staffId = Number(rawId);
  if (!Number.isSafeInteger(staffId) || staffId <= 0) notFound();

  const [member] = await db
    .select({
      id: staff.id,
      name: staff.name,
      staffId: staff.staffId,
      phone: staff.phone,
      isActive: staff.isActive,
    })
    .from(staff)
    .where(eq(staff.id, staffId))
    .limit(1);
  if (!member) notFound();

  const month = validMonth(query.month);
  const monthStart = `${month}-01`;
  const [yearText, monthText] = month.split("-");
  const monthEnd = new Date(Number(yearText), Number(monthText), 0).toISOString().slice(0, 10);
  const relatedSaleFilter = or(eq(sales.staffId, staffId), eq(sales.deliveredBy, staffId));

  const [salesMade, deliveries, openSales, collectionTotals, recentSales, collectionRows] = await Promise.all([
    db
      .select({
        id: sales.id,
        saleDate: sales.saleDate,
        customerName: sales.customerName,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
      })
      .from(sales)
      .where(and(eq(sales.staffId, staffId), gte(sales.saleDate, monthStart), lte(sales.saleDate, monthEnd)))
      .orderBy(desc(sales.saleDate), desc(sales.id)),
    db
      .select({
        saleId: sales.id,
        boxes: sql<number>`coalesce(sum(${saleItems.boxes}), 0)`,
      })
      .from(sales)
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .where(and(eq(sales.deliveredBy, staffId), gte(sales.saleDate, monthStart), lte(sales.saleDate, monthEnd)))
      .groupBy(sales.id),
    db
      .select({
        amount: sales.totalAmount,
        paid: sales.paidAmount,
      })
      .from(sales)
      .where(and(relatedSaleFilter, sql`${sales.totalAmount} > ${sales.paidAmount}`)),
    db
      .select({
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        paymentCount: count(payments.id),
      })
      .from(payments)
      .where(and(eq(payments.staffId, staffId), gte(payments.paidOn, monthStart), lte(payments.paidOn, monthEnd))),
    db
      .select({
        id: sales.id,
        saleDate: sales.saleDate,
        customerName: sales.customerName,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
        paymentStatus: sales.paymentStatus,
      })
      .from(sales)
      .where(eq(sales.staffId, staffId))
      .orderBy(desc(sales.saleDate), desc(sales.id))
      .limit(100),
    db
      .select({
        id: payments.id,
        saleId: payments.saleId,
        paidOn: payments.paidOn,
        amount: payments.amount,
        mode: payments.mode,
        customerName: sales.customerName,
      })
      .from(payments)
      .innerJoin(sales, eq(payments.saleId, sales.id))
      .where(and(eq(payments.staffId, staffId), gte(payments.paidOn, monthStart), lte(payments.paidOn, monthEnd)))
      .orderBy(desc(payments.paidOn), desc(payments.id)),
  ]);

  const salesAmount = salesMade.reduce((total, sale) => total + Number(sale.totalAmount), 0);
  const salesPending = openSales.reduce(
    (total, sale) => total + Math.max(0, Number(sale.amount) - Number(sale.paid)),
    0,
  );
  const boxesDelivered = deliveries.reduce((total, row) => total + Number(row.boxes), 0);
  const collectedAmount = Number(collectionTotals[0]?.amount ?? 0);

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/staff"><ArrowLeft /> Staff Sales</Link>
        </Button>
      </div>
      <PageHeader
        title={member.name}
        description={`Staff ID: ${member.staffId}${member.phone ? ` · ${member.phone}` : ""}`}
      />

      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <label htmlFor="staff-month" className="text-sm text-muted-foreground">Month</label>
        <input
          id="staff-month"
          name="month"
          type="month"
          defaultValue={month}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        />
        <Button type="submit" size="sm">Update</Button>
        <Badge variant={member.isActive ? "secondary" : "outline"}>
          {member.isActive ? "Active" : "Inactive"}
        </Badge>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric icon={ShoppingCart} label="Monthly sales" value={money(salesAmount)} detail={`${salesMade.length} bills`} />
        <Metric icon={Boxes} label="Boxes delivered" value={boxesDelivered.toLocaleString("en-IN")} detail={`${deliveries.length} deliveries`} />
        <Metric icon={Clock3} label="Related pending" value={money(salesPending)} detail="Created or delivered sales" />
        <Metric icon={Banknote} label="Collected this month" value={money(collectedAmount)} detail={`${collectionTotals[0]?.paymentCount ?? 0} payments`} />
        <Metric icon={CalendarDays} label="Payment entries" value={collectionRows.length.toLocaleString("en-IN")} detail="Selected month" />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Sales made in {month}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {salesMade.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Pending</th>
                      <th className="px-4 py-2 text-right">Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesMade.map((sale) => (
                      <tr key={sale.id} className="border-t border-border">
                        <td className="px-4 py-2">{sale.saleDate}</td>
                        <td className="px-4 py-2">{sale.customerName}</td>
                        <td className="px-4 py-2 text-right">{money(Number(sale.totalAmount))}</td>
                        <td className="px-4 py-2 text-right">{money(Math.max(0, Number(sale.totalAmount) - Number(sale.paidAmount)))}</td>
                        <td className="px-4 py-2 text-right">
                          <Link className="text-primary hover:underline" href={`/bill/${sale.id}`}>Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-foreground">No sales recorded by this staff member in this month.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payments collected in {month}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {collectionRows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2">Mode</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionRows.map((payment) => (
                      <tr key={payment.id} className="border-t border-border">
                        <td className="px-4 py-2">{payment.paidOn}</td>
                        <td className="px-4 py-2">
                          <Link href={`/customers/${payment.saleId}`} className="hover:text-primary">{payment.customerName}</Link>
                        </td>
                        <td className="px-4 py-2 capitalize">{payment.mode}</td>
                        <td className="px-4 py-2 text-right font-medium">{money(Number(payment.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-foreground">No payments collected in this month.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent sales</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentSales.length ? recentSales.map((sale) => (
              <Link
                key={sale.id}
                href={`/customers/${sale.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-muted/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{sale.customerName}</span>
                  <span className="text-xs text-muted-foreground">{sale.saleDate}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold">{money(Number(sale.totalAmount))}</span>
                  <span className="text-xs text-muted-foreground capitalize">{sale.paymentStatus}</span>
                </span>
              </Link>
            )) : (
              <p className="text-sm text-muted-foreground">No sales recorded by this staff member yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="mb-3 h-5 w-5 text-primary" />
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-lg font-bold">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
