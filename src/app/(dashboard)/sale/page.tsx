import { asc, sql } from "drizzle-orm";
import { connection } from "next/server";

import { PageHeader } from "@/components/layout/page-header";
import { SaleForm, type SaleProduct, type SaleStaff } from "@/components/sale/sale-form";
import { db, products, saleItems, staff, stockIn } from "@/db";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "New Sale" };

export default async function SalePage() {
  // Request-time render — today's date ko prerender me theek se compute karne ke liye
  await connection();
  const today = todayIST();

  const [productRows, staffRows, inRows, soldByProduct] = await Promise.all([
    db.select().from(products).where(sql`${products.isActive}`).orderBy(asc(products.id)),
    db.select().from(staff).where(sql`${staff.isActive}`).orderBy(asc(staff.id)),
    db
      .select({ productId: stockIn.productId, total: sql<string>`coalesce(sum(${stockIn.boxes}),0)` })
      .from(stockIn)
      .groupBy(stockIn.productId),
    db
      .select({ productId: saleItems.productId, total: sql<string>`coalesce(sum(${saleItems.boxes}),0)` })
      .from(saleItems)
      .groupBy(saleItems.productId),
  ]);

  const inMap = new Map(inRows.map((r) => [r.productId, Number(r.total)]));
  const soldMap = new Map(soldByProduct.map((r) => [r.productId, Number(r.total)]));

  const saleProducts: SaleProduct[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    size: p.size,
    defaultRatePerBox: p.defaultRatePerBox,
    stockBalance: (inMap.get(p.id) ?? 0) - (soldMap.get(p.id) ?? 0),
  }));

  const saleStaff: SaleStaff[] = staffRows.map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <PageHeader
        title="New Sale"
        description="Record a sale — customer, items, and payment in one go."
      />
      {productRows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Add a product first before recording a sale.
        </p>
      ) : staffRows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Add staff in Settings first.
        </p>
      ) : (
        <div className="max-w-xl">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <SaleForm products={saleProducts} staff={saleStaff} today={today} />
          </div>
        </div>
      )}
    </>
  );
}

