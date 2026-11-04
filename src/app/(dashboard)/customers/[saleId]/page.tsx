import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { ArrowLeft, CalendarDays, CircleCheck, Clock3, Phone, ReceiptText } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { CustomerProfilePdf } from "@/components/customers/customer-profile-pdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, payments, products, saleItems, sales, staff } from "@/db";
import { getSession } from "@/lib/actions/auth";
import { isStaffSession } from "@/lib/authorization";

export const metadata = { title: "Customer Profile" };

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function normalizePhone(phone: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

function dateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function paymentModeLabel(mode: string) {
  if (mode === "cash") return "Cash";
  if (mode === "upi") return "UPI / Online";
  if (mode === "bank") return "Bank Transfer";
  return mode;
}

function status(total: number, paid: number): "Paid" | "Partial" | "Pending" {
  if (paid >= total - 0.005) return "Paid";
  if (paid <= 0.005) return "Pending";
  return "Partial";
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId: rawSaleId } = await params;
  const saleId = Number(rawSaleId);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) notFound();
  const session = await getSession();
  if (!session) notFound();

  const [referenceSale] = await db
    .select({
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      staffId: sales.staffId,
      deliveredBy: sales.deliveredBy,
    })
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);
  if (!referenceSale) notFound();
  if (
    isStaffSession(session) &&
    referenceSale.staffId !== session.uid &&
    referenceSale.deliveredBy !== session.uid
  ) {
    notFound();
  }

  const customerSales = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      deliveredBy: sales.deliveredBy,
      paymentStatus: sales.paymentStatus,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
      note: sales.note,
    })
    .from(sales)
    .where(
      and(
        eq(sql`lower(trim(${sales.customerName}))`, normalizeName(referenceSale.customerName)),
        eq(
          sql`regexp_replace(coalesce(${sales.customerPhone}, ''), '[^0-9]', '', 'g')`,
          normalizePhone(referenceSale.customerPhone),
        ),
        isStaffSession(session)
          ? or(eq(sales.staffId, session.uid), eq(sales.deliveredBy, session.uid))
          : undefined,
      ),
    )
    .orderBy(asc(sales.saleDate), asc(sales.id));

  const saleIds = customerSales.map((sale) => sale.id);

  const [itemRows, paymentRows, staffRows] = await Promise.all([
    db
      .select({
        saleId: saleItems.saleId,
        productName: products.name,
        productSize: products.size,
        boxes: saleItems.boxes,
        ratePerBox: saleItems.ratePerBox,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(inArray(saleItems.saleId, saleIds)),
    db
      .select({
        id: payments.id,
        saleId: payments.saleId,
        amount: payments.amount,
        paidOn: payments.paidOn,
        mode: payments.mode,
        note: payments.note,
        receivedBy: staff.name,
      })
      .from(payments)
      .leftJoin(staff, eq(payments.staffId, staff.id))
      .where(inArray(payments.saleId, saleIds))
      .orderBy(asc(payments.paidOn), asc(payments.id)),
    db.select({ id: staff.id, name: staff.name }).from(staff),
  ]);

  const itemsBySale = new Map<number, typeof itemRows>();
  for (const item of itemRows) {
    const items = itemsBySale.get(item.saleId) ?? [];
    items.push(item);
    itemsBySale.set(item.saleId, items);
  }
  const paymentsBySale = new Map<number, typeof paymentRows>();
  for (const payment of paymentRows) {
    const items = paymentsBySale.get(payment.saleId) ?? [];
    items.push(payment);
    paymentsBySale.set(payment.saleId, items);
  }
  const staffNames = new Map(staffRows.map((member) => [member.id, member.name]));

  const totals = customerSales.reduce(
    (result, sale) => {
      result.sales += Number(sale.totalAmount);
      result.paid += Number(sale.paidAmount);
      result.pending += Number(sale.totalAmount) - Number(sale.paidAmount);
      return result;
    },
    { sales: 0, paid: 0, pending: 0 },
  );
  const pendingTotal = Math.max(0, totals.pending);
  const advanceTotal = Math.max(0, -totals.pending);
  const totalBoxes = itemRows.reduce((total, item) => total + item.boxes, 0);
  const pdfSales = customerSales.map((sale) => {
    const total = Number(sale.totalAmount);
    const paid = Number(sale.paidAmount);
    return {
      id: sale.id,
      saleDate: sale.saleDate,
      deliveredBy: staffNames.get(sale.deliveredBy) ?? "—",
      total,
      paid,
      pending: Math.max(0, total - paid),
      advance: Math.max(0, paid - total),
      status: status(total, paid),
      note: sale.note,
      items: (itemsBySale.get(sale.id) ?? []).map((item) => ({
        name: item.productName,
        size: item.productSize,
        boxes: item.boxes,
        rate: Number(item.ratePerBox),
        amount: item.boxes * Number(item.ratePerBox),
      })),
      payments: (paymentsBySale.get(sale.id) ?? []).map((payment) => ({
        paidOn: payment.paidOn,
        mode: paymentModeLabel(payment.mode),
        amount: Number(payment.amount),
        note: payment.note,
        receivedBy: payment.receivedBy ?? "Owner / Admin",
      })),
    };
  });

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers"><ArrowLeft /> All Customers</Link>
        </Button>
      </div>
      <PageHeader title={referenceSale.customerName} description="Complete customer sales and payment history." />
      <div className="mb-4 flex justify-end">
        <CustomerProfilePdf
          customer={{
            name: referenceSale.customerName,
            phone: referenceSale.customerPhone,
            saleCount: customerSales.length,
            totalBoxes,
            totalSales: totals.sales,
            totalPaid: totals.paid,
            pending: pendingTotal,
            advance: advanceTotal,
          }}
          sales={pdfSales}
        />
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium">
              {referenceSale.customerPhone ? (
                <><Phone className="h-4 w-4 text-muted-foreground" />{referenceSale.customerPhone}</>
              ) : "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total sales</p>
            <p className="mt-1 font-semibold">{money(totals.sales)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="mt-1 font-semibold text-primary">{money(totals.paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className={`mt-1 font-semibold ${pendingTotal > 0.005 ? "text-destructive" : "text-primary"}`}>
              {money(pendingTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Advance</p>
            <p className="mt-1 font-semibold text-primary">
              {money(advanceTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Orders · boxes</p>
            <p className="mt-1 font-semibold">{customerSales.length} · {totalBoxes}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-2">
        <ReceiptText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Full history</h2>
      </div>

      <div className="space-y-4">
        {customerSales.map((sale) => {
          const items = itemsBySale.get(sale.id) ?? [];
          const salePayments = paymentsBySale.get(sale.id) ?? [];
          const total = Number(sale.totalAmount);
          const paid = Number(sale.paidAmount);
          const pending = Math.max(0, total - paid);
          const advance = Math.max(0, paid - total);
          let runningPaid = 0;
          let clearedOn: string | null = null;
          for (const payment of salePayments) {
            runningPaid += Number(payment.amount);
            if (runningPaid >= total - 0.005) {
              clearedOn = payment.paidOn;
              break;
            }
          }
          const saleStatus = status(total, paid);

          return (
            <Card key={sale.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Sale · {dateLabel(sale.saleDate)}
                  </CardTitle>
                  <Badge variant={saleStatus === "Paid" ? "secondary" : saleStatus === "Partial" ? "outline" : "destructive"}>
                    {saleStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Items delivered
                  </h3>
                  {items.length ? (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Item</th>
                            <th className="px-3 py-2 text-right font-medium">Boxes</th>
                            <th className="px-3 py-2 text-right font-medium">Rate</th>
                            <th className="px-3 py-2 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={`${sale.id}-${item.productName}-${index}`} className="border-t border-border">
                              <td className="px-3 py-2">{item.productName} · {item.productSize}</td>
                              <td className="px-3 py-2 text-right">{item.boxes}</td>
                              <td className="px-3 py-2 text-right">{money(Number(item.ratePerBox))}</td>
                              <td className="px-3 py-2 text-right">{money(item.boxes * Number(item.ratePerBox))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No item details recorded for this sale.</p>
                  )}
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Delivered by {staffNames.get(sale.deliveredBy) ?? "—"}
                    </span>
                    <span className="font-semibold">Sale total: {money(total)}</span>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CircleCheck className="h-4 w-4" /> Payments
                    </h3>
                    {salePayments.length ? (
                      <ul className="space-y-2">
                        {salePayments.map((payment) => (
                          <li key={payment.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                            <span>
                              {dateLabel(payment.paidOn)} · {paymentModeLabel(payment.mode)}
                              <span className="block text-xs text-muted-foreground">Received by {payment.receivedBy ?? "Owner / Admin"}</span>
                            </span>
                            <span className="font-medium">{money(Number(payment.amount))}</span>
                            {payment.note ? <span className="w-full text-xs text-muted-foreground">{payment.note}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No payment entries recorded.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Clock3 className="h-4 w-4" /> Balance
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{money(paid)}</span></p>
                      <p className="flex justify-between font-semibold">
                        <span>{pending > 0.005 ? "Still pending" : "Pending"}</span>
                        <span className={pending > 0.005 ? "text-destructive" : "text-primary"}>{money(pending)}</span>
                      </p>
                      {advance > 0.005 ? (
                        <p className="flex justify-between font-semibold text-primary">
                          <span>Advance / credit</span>
                          <span>{money(advance)}</span>
                        </p>
                      ) : null}
                      {pending <= 0.005 ? (
                        <p className="pt-1 text-xs text-primary">
                          {clearedOn ? `Cleared on ${dateLabel(clearedOn)}` : "Cleared; exact payment date is not recorded."}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {sale.note ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Sale note: {sale.note}
                  </p>
                ) : null}
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={`/bill/${sale.id}`}>
                    <ReceiptText className="h-4 w-4" /> Generate Bill
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
