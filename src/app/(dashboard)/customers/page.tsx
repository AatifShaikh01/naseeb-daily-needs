import { asc, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";

import { CustomerDirectory, type CustomerSummary } from "@/components/customers/customer-directory";
import { PageHeader } from "@/components/layout/page-header";
import { db, sales } from "@/db";
import { getSession } from "@/lib/actions/auth";
import { isStaffSession } from "@/lib/authorization";

export const metadata = { title: "Customers" };

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function normalizePhone(phone: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
    })
    .from(sales)
    .where(
      isStaffSession(session)
        ? or(eq(sales.staffId, session.uid), eq(sales.deliveredBy, session.uid))
        : undefined,
    )
    .orderBy(asc(sales.saleDate), asc(sales.id));

  const grouped = new Map<string, CustomerSummary>();
  for (const sale of rows) {
    const key = `${normalizeName(sale.customerName)}|${normalizePhone(sale.customerPhone)}`;
    const customer = grouped.get(key);
    if (customer) {
      customer.saleCount += 1;
      customer.lastSaleDate = sale.saleDate;
      customer.profileSaleId = sale.id;
      customer.totalSales += Number(sale.totalAmount);
      customer.totalPaid += Number(sale.paidAmount);
      customer.pending += Number(sale.totalAmount) - Number(sale.paidAmount);
    } else {
      grouped.set(key, {
        profileSaleId: sale.id,
        name: sale.customerName.trim(),
        phone: sale.customerPhone,
        saleCount: 1,
        firstSaleDate: sale.saleDate,
        lastSaleDate: sale.saleDate,
        totalSales: Number(sale.totalAmount),
        totalPaid: Number(sale.paidAmount),
        pending: Number(sale.totalAmount) - Number(sale.paidAmount),
        advance: 0,
      });
    }
  }

  const customers = [...grouped.values()]
    .map((customer) => ({
      ...customer,
      totalSales: Math.round(customer.totalSales * 100) / 100,
      totalPaid: Math.round(customer.totalPaid * 100) / 100,
      pending: Math.round(Math.max(0, customer.pending) * 100) / 100,
      advance: Math.round(Math.max(0, -customer.pending) * 100) / 100,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customer profiles with complete sales, payments, and pending history."
      />
      <CustomerDirectory customers={customers} />
    </>
  );
}
