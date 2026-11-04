"use server";

import { asc, eq, inArray } from "drizzle-orm";

import { db, payments, products, saleItems, sales } from "@/db";
import { getSession } from "@/lib/actions/auth";
import { getBillBranding } from "@/lib/actions/bill-branding";
import { redirect } from "next/navigation";
import type { BillBranding } from "@/lib/bill-branding";
import { isSaleRelatedToStaff } from "@/lib/authorization";

type BillItem = {
  productName: string;
  productSize: string;
  boxes: number;
  ratePerBox: number;
  amount: number;
};

type BillData = {
  id: number;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMode: string;
  branding: BillBranding;
  items: BillItem[];
  payments: { id: number; amount: number; paidOn: string; mode: string; note: string }[];
};

/** Fetch one sale with items for the bill. */
export async function getBillData(saleId: number): Promise<BillData | null> {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sale] = await db
    .select({
      id: sales.id,
      staffId: sales.staffId,
      deliveredBy: sales.deliveredBy,
      saleDate: sales.saleDate,
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      totalAmount: sales.totalAmount,
      paidAmount: sales.paidAmount,
      paymentStatus: sales.paymentStatus,
      paymentMode: sales.paymentMode,
    })
    .from(sales)
    .where(eq(sales.id, saleId));
  if (!sale) return null;
  if (!isSaleRelatedToStaff(sale, session)) return null;

  const [items, paymentRows, branding] = await Promise.all([
    db
    .select({
      productId: saleItems.productId,
      boxes: saleItems.boxes,
      ratePerBox: saleItems.ratePerBox,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId))
    .orderBy(asc(saleItems.id)),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidOn: payments.paidOn,
        mode: payments.mode,
        note: payments.note,
      })
      .from(payments)
      .where(eq(payments.saleId, saleId))
      .orderBy(asc(payments.paidOn), asc(payments.id)),
    getBillBranding(),
  ]);
  if (items.length === 0) return null;

  const productIds = items.map((i) => i.productId);
  let productMap = new Map<number, { name: string; size: string }>();
  if (productIds.length > 0) {
    const rows = await db
      .select({ id: products.id, name: products.name, size: products.size })
      .from(products)
      .where(inArray(products.id, productIds));
    productMap = new Map(rows.map((p) => [p.id, { name: p.name, size: p.size }]));
  }

  const billItems: BillItem[] = items.map((it) => {
    const p = productMap.get(it.productId) ?? { name: "Product", size: "" };
    const boxes = Number(it.boxes);
    const rate = Number(it.ratePerBox);
    return {
      productName: p.name,
      productSize: p.size,
      boxes,
      ratePerBox: rate,
      amount: Math.round(boxes * rate * 100) / 100,
    };
  });

  return {
    id: sale.id,
    saleDate: sale.saleDate,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone ?? null,
    totalAmount: Number(sale.totalAmount),
    paidAmount: Number(sale.paidAmount),
    paymentStatus: sale.paymentStatus,
    paymentMode: sale.paymentMode,
    branding,
    items: billItems,
    payments: paymentRows.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    })),
  };
}
