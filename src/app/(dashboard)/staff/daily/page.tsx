import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Banknote, CalendarDays, IndianRupee, ShoppingCart } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, payments, products, saleItems, sales, staff } from "@/db";
import { formatDate, todayIST } from "@/lib/dates";
import { requireAdmin } from "@/lib/authorization";

export const metadata = { title: "Daily Staff Report" };

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayIST();
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : todayIST();
}

function paymentModeLabel(mode: string) {
  if (mode === "cash") return "Cash";
  if (mode === "upi") return "UPI / Online";
  if (mode === "bank") return "Bank Transfer";
  return mode;
}

export default async function DailyStaffReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const date = validDate(query.date);

  const [staffRows, saleRows, dailyPaymentRows] = await Promise.all([
    db.select({ id: staff.id, name: staff.name }).from(staff).orderBy(asc(staff.name)),
    db
      .select({
        id: sales.id,
        customerName: sales.customerName,
        customerPhone: sales.customerPhone,
        staffId: sales.staffId,
        deliveredBy: sales.deliveredBy,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
        paymentStatus: sales.paymentStatus,
        approvalStatus: sales.approvalStatus,
        note: sales.note,
      })
      .from(sales)
      .where(eq(sales.saleDate, date))
      .orderBy(desc(sales.id)),
    db
      .select({
        id: payments.id,
        saleId: payments.saleId,
        customerName: sales.customerName,
        staffId: payments.staffId,
        amount: payments.amount,
        mode: payments.mode,
        note: payments.note,
      })
      .from(payments)
      .innerJoin(sales, eq(payments.saleId, sales.id))
      .where(eq(payments.paidOn, date))
      .orderBy(desc(payments.id)),
  ]);

  const saleIds = saleRows.map((sale) => sale.id);
  const [itemRows, salePaymentRows] = saleIds.length
    ? await Promise.all([
        db
          .select({
            saleId: saleItems.saleId,
            name: products.name,
            size: products.size,
            boxes: saleItems.boxes,
            rate: saleItems.ratePerBox,
          })
          .from(saleItems)
          .innerJoin(products, eq(saleItems.productId, products.id))
          .where(inArray(saleItems.saleId, saleIds)),
        db
          .select({
            id: payments.id,
            saleId: payments.saleId,
            paidOn: payments.paidOn,
            amount: payments.amount,
            mode: payments.mode,
            note: payments.note,
            staffId: payments.staffId,
          })
          .from(payments)
          .where(inArray(payments.saleId, saleIds))
          .orderBy(asc(payments.paidOn), asc(payments.id)),
      ])
    : [[], []];

  const staffNames = new Map(staffRows.map((member) => [member.id, member.name]));
  const itemsBySale = new Map<number, typeof itemRows>();
  for (const item of itemRows) {
    const items = itemsBySale.get(item.saleId) ?? [];
    items.push(item);
    itemsBySale.set(item.saleId, items);
  }
  const paymentsBySale = new Map<number, typeof salePaymentRows>();
  for (const payment of salePaymentRows) {
    const entries = paymentsBySale.get(payment.saleId) ?? [];
    entries.push(payment);
    paymentsBySale.set(payment.saleId, entries);
  }

  const salesByStaff = new Map<number | null, typeof saleRows>();
  for (const sale of saleRows) {
    const attributedStaffId = itemsBySale.has(sale.id) ? sale.staffId : sale.deliveredBy;
    const entries = salesByStaff.get(attributedStaffId) ?? [];
    entries.push(sale);
    salesByStaff.set(attributedStaffId, entries);
  }
  const paymentsByStaff = new Map<number | null, typeof dailyPaymentRows>();
  for (const payment of dailyPaymentRows) {
    const entries = paymentsByStaff.get(payment.staffId) ?? [];
    entries.push(payment);
    paymentsByStaff.set(payment.staffId, entries);
  }

  const staffSummaries = [...new Set([...salesByStaff.keys(), ...paymentsByStaff.keys()])]
    .map((staffId) => {
      const staffSales = salesByStaff.get(staffId) ?? [];
      const staffPayments = paymentsByStaff.get(staffId) ?? [];
      return {
        id: staffId,
        name: staffId === null ? "Owner / Admin" : staffNames.get(staffId) ?? "Unknown staff",
        orderCount: staffSales.filter((sale) => itemsBySale.has(sale.id)).length,
        noOrderCount: staffSales.filter((sale) => !itemsBySale.has(sale.id)).length,
        salesTotal: staffSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
        collectedTotal: staffPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalSales = saleRows.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const totalDue = saleRows.reduce(
    (sum, sale) => sum + Math.max(0, Number(sale.totalAmount) - Number(sale.paidAmount)),
    0,
  );
  const totalCollected = dailyPaymentRows.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/"><ArrowLeft /> Dashboard</Link>
        </Button>
      </div>
      <PageHeader
        title="Daily Staff Report"
        description={`Sales, customers, deliveries and payments recorded on ${formatDate(date)}.`}
      />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="report-date" className="text-sm text-muted-foreground">Report date</label>
          <input
            id="report-date"
            name="date"
            type="date"
            defaultValue={date}
            className="block h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <Button type="submit" size="sm">View report</Button>
        {date !== todayIST() ? (
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={`/staff/daily?date=${todayIST()}`}>Today</Link>
          </Button>
        ) : null}
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={ShoppingCart} label="Orders" value={money(totalSales)} detail={`${saleRows.filter((sale) => itemsBySale.has(sale.id)).length} bills`} />
        <SummaryCard icon={Banknote} label="Payments received" value={money(totalCollected)} detail={`${dailyPaymentRows.length} entries`} />
        <SummaryCard icon={IndianRupee} label="Due on these sales" value={money(totalDue)} detail="Remaining balance" />
        <SummaryCard icon={CalendarDays} label="Staff active today" value={String(staffSummaries.length)} detail="Made a sale or collected payment" />
      </div>

      {staffSummaries.length ? (
        <section className="mb-7 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Daily totals by staff</h2>
            <p className="text-sm text-muted-foreground">Sales entered and payments collected on this date.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {staffSummaries.map((summary) => (
              <Card key={summary.id ?? "owner"}>
                <CardContent className="p-4">
                  <p className="font-semibold">{summary.name}</p>
                  <p className="mt-2 text-sm">
                    Orders: {money(summary.salesTotal)}
                    <span className="text-xs text-muted-foreground"> · {summary.orderCount} bills</span>
                  </p>
                  <p className="text-sm">No-order visits: {summary.noOrderCount}</p>
                  <p className="text-sm">Payments received: {money(summary.collectedTotal)}</p>
                  {summary.id !== null ? (
                    <Link
                      href={`/staff/${summary.id}?month=${date.slice(0, 7)}`}
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Open staff profile
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Orders and shop visits by staff</h2>
          <p className="text-sm text-muted-foreground">Customer, items sold, visiting/delivery staff, amount, balance and payment history.</p>
        </div>
        {saleRows.length ? (
          <div className="space-y-3">
            {saleRows.map((sale) => {
              const items = itemsBySale.get(sale.id) ?? [];
              const salePayments = paymentsBySale.get(sale.id) ?? [];
              const boxes = items.reduce((sum, item) => sum + item.boxes, 0);
              const noOrder = items.length === 0;
              const pending = Math.max(0, Number(sale.totalAmount) - Number(sale.paidAmount));
              const soldBy = noOrder
                ? staffNames.get(sale.deliveredBy) ?? "Unknown staff"
                : sale.staffId === null ? "Owner / Admin" : staffNames.get(sale.staffId) ?? "Unknown staff";
              return (
                <Card key={sale.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          <Link href={`/customers/${sale.id}`} className="hover:text-primary hover:underline">
                            {sale.customerName}
                          </Link>
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {noOrder ? "Visit" : "Bill"} #{sale.id}{sale.customerPhone ? ` · ${sale.customerPhone}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {noOrder ? <Badge variant="outline">No Order</Badge> : (
                          <Badge variant={sale.paymentStatus === "paid" ? "secondary" : sale.paymentStatus === "partial" ? "outline" : "destructive"}>
                            {sale.paymentStatus}
                          </Badge>
                        )}
                        <Badge variant={sale.approvalStatus === "approved" ? "secondary" : sale.approvalStatus === "pending" ? "outline" : "destructive"}>
                          {sale.approvalStatus === "pending" ? "Awaiting review" : sale.approvalStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p><span className="text-muted-foreground">{noOrder ? "Visited by: " : "Sold by: "}</span>{soldBy}</p>
                      {!noOrder ? <p><span className="text-muted-foreground">Delivered by: </span>{staffNames.get(sale.deliveredBy) ?? "Unknown staff"}</p> : null}
                    </div>
                    {noOrder ? (
                      <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">Shop visit recorded — no order was placed.</p>
                    ) : <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-sm">
                      {items.length ? items.map((item, index) => (
                        <div key={`${sale.id}-${index}`} className="flex justify-between gap-3">
                          <span>{item.name} {item.size} · {item.boxes} box{item.boxes === 1 ? "" : "es"}</span>
                          <span className="shrink-0">{money(item.boxes * Number(item.rate))}</span>
                        </div>
                      )) : <p className="text-muted-foreground">No item details recorded.</p>}
                      <div className="flex justify-between border-t border-border pt-2 font-semibold">
                        <span>{boxes} boxes · Total</span><span>{money(Number(sale.totalAmount))}</span>
                      </div>
                    </div>}
                    {!noOrder ? <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                      <p>Paid: <span className="font-medium">{money(Number(sale.paidAmount))}</span></p>
                      <p>Due: <span className="font-medium">{money(pending)}</span></p>
                      <p><Link href={`/bill/${sale.id}`} className="font-medium text-primary hover:underline">Open bill</Link></p>
                    </div> : null}
                    {salePayments.length ? (
                      <div className="border-t border-border pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment history</p>
                        <ul className="space-y-1.5 text-sm">
                          {salePayments.map((payment) => (
                            <li key={payment.id} className="flex flex-wrap justify-between gap-x-3">
                              <span>
                                {formatDate(payment.paidOn)} · {paymentModeLabel(payment.mode)}
                                <span className="block text-xs text-muted-foreground">
                                  Received by {payment.staffId === null ? "Owner / Admin" : staffNames.get(payment.staffId) ?? "Unknown staff"}
                                  {payment.note ? ` · ${payment.note}` : ""}
                                </span>
                              </span>
                              <span className="font-medium">{money(Number(payment.amount))}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : <p className="border-t border-border pt-3 text-sm text-muted-foreground">No payment entries recorded.</p>}
                    {sale.note ? <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Sale note: {sale.note}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No sales recorded on this date.
          </p>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Payments received on {formatDate(date)}</h2>
          <p className="text-sm text-muted-foreground">Who collected each payment, from which customer, and by which method.</p>
        </div>
        {dailyPaymentRows.length ? (
          <div className="space-y-2">
            {dailyPaymentRows.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/customers/${payment.saleId}`} className="font-medium hover:text-primary hover:underline">
                      {payment.customerName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Received by {payment.staffId === null ? "Owner / Admin" : staffNames.get(payment.staffId) ?? "Unknown staff"}
                      {" · "}{paymentModeLabel(payment.mode)}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold">{money(Number(payment.amount))}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No payments received on this date.
          </p>
        )}
      </section>

      {staffRows.length === 0 ? null : (
        <p className="mt-6 text-xs text-muted-foreground">
          Staff attribution is based on the staff member recorded on each sale or payment. Unassigned entries are shown as Owner / Admin.
        </p>
      )}
    </>
  );
}

function SummaryCard({
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
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
