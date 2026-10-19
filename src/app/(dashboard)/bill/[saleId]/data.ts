"use server";

import { asc, eq, inArray } from "drizzle-orm";

import { db, products, saleItems, sales } from "@/db";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { SHOP } from "@/lib/shop";

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
  items: BillItem[];
};

/** Fetch one sale with items for the bill. */
export async function getBillData(saleId: number): Promise<BillData | null> {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
  if (!sale) return null;

  const items = await db
    .select({
      productId: saleItems.productId,
      boxes: saleItems.boxes,
      ratePerBox: saleItems.ratePerBox,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId))
    .orderBy(asc(saleItems.id));

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
    items: billItems,
  };
}
