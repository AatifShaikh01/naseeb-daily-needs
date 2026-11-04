import Link from "next/link";
import { and, asc, gte, lte, sql } from "drizzle-orm";
import { ArrowRight, UserRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, saleItems, sales, staff } from "@/db";
import { requireAdmin } from "@/lib/authorization";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "Staff Sales" };

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default async function StaffSalesPage() {
  await requireAdmin();

  const month = todayIST().slice(0, 7);
  const monthStart = `${month}-01`;
  const [yearText, monthText] = month.split("-");
  const monthEnd = new Date(Number(yearText), Number(monthText), 0).toISOString().slice(0, 10);

  const [staffRows, monthlySales] = await Promise.all([
    db
      .select({
        id: staff.id,
        name: staff.name,
        staffId: staff.staffId,
        phone: staff.phone,
        isActive: staff.isActive,
      })
      .from(staff)
      .orderBy(asc(staff.name)),
    db
      .select({
        staffId: sales.staffId,
        billCount: sql<number>`count(*) filter (where exists (select 1 from ${saleItems} where ${saleItems.saleId} = ${sales.id}))`,
        totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.saleDate, monthStart), lte(sales.saleDate, monthEnd)))
      .groupBy(sales.staffId),
  ]);

  const salesByStaff = new Map(
    monthlySales
      .filter((row) => row.staffId !== null)
      .map((row) => [
        row.staffId!,
        { billCount: row.billCount, totalAmount: Number(row.totalAmount) },
      ]),
  );

  return (
    <>
      <PageHeader
        title="Staff Sales"
        description={`Select a staff member to view their sales, deliveries, collections and pending amounts for ${month}.`}
      />

      {staffRows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No staff members found. Add staff from Settings to start tracking their sales.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staffRows.map((member) => {
            const summary = salesByStaff.get(member.id) ?? { billCount: 0, totalAmount: 0 };
            return (
              <Link
                key={member.id}
                href={`/staff/${member.id}`}
                className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-shadow hover:shadow-float">
                  <CardHeader className="flex-row items-start gap-3 pb-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">{member.name}</CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {member.staffId}{member.phone ? ` · ${member.phone}` : ""}
                      </p>
                    </div>
                    <Badge variant={member.isActive ? "secondary" : "outline"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Sales this month</p>
                        <p className="mt-1 text-lg font-semibold">{money(summary.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {summary.billCount} {summary.billCount === 1 ? "bill" : "bills"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        View sales <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
