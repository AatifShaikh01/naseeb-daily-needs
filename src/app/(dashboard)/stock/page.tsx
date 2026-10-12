import { asc, sql } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db, products, saleItems, stockIn } from "@/db";
import { lowStockThreshold } from "@/lib/config";

export const metadata = { title: "Current Stock" };

export const instant = false;

export default async function StockPage() {
  const threshold = lowStockThreshold();

  /* Products (order by id) */
  const productRows = await db.select().from(products).orderBy(asc(products.id));

  /* Balance = total stock in âˆ’ total sold, per product */
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
        description="Live balance per product â€” total received minus total sold."
      />

      {lowStockCount > 0 ? (
        <p className="mb-4 text-sm font-medium text-destructive">
          {lowStockCount} product{lowStockCount > 1 ? "s" : ""} below {threshold} boxes.
        </p>
      ) : null}

      {balances.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No products yet â€” add some from Products.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {balances.map((b) => (
            <Card key={b.product.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.product.name}</p>
                    <p className="text-xs text-muted-foreground">{b.product.size}</p>
                  </div>
                  {b.balance < threshold ? <Badge variant="destructive">Low</Badge> : null}
                </div>
                <p className="mt-3 text-3xl font-bold leading-none">{b.balance}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  boxes Â· in {b.inB} âˆ’ sold {b.soldB}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
