import { asc, sql } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { StockBalanceList } from "@/components/stock/stock-balance-list";
import { db, products, saleItems, stockIn } from "@/db";
import { lowStockThreshold } from "@/lib/config";

export const metadata = { title: "Current Stock" };


export default async function StockPage() {
  const threshold = lowStockThreshold();

  /* Products (order by id) */
  const productRows = await db.select().from(products).orderBy(asc(products.id));

  /* Balance = total stock in − total sold, per product */
  const [inRows, soldByProduct] = await Promise.all([
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

  const balances = productRows.map((p) => {
    const inB = inMap.get(p.id) ?? 0;
    const soldB = soldMap.get(p.id) ?? 0;
    return { product: p, inB, soldB, balance: inB - soldB };
  });

  const lowStockCount = balances.filter((b) => b.balance < threshold).length;

  return (
    <>
      <PageHeader
        title="Current Stock"
        description="Live balance per product — total received minus total sold."
      />

      {lowStockCount > 0 ? (
        <p className="mb-4 text-sm font-medium text-destructive">
          {lowStockCount} product{lowStockCount > 1 ? "s" : ""} below {threshold} boxes.
        </p>
      ) : null}

      <StockBalanceList balances={balances} threshold={threshold} />
    </>
  );
}
