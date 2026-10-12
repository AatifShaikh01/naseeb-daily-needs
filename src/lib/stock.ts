import { sql } from "drizzle-orm";

import { db, products, saleItems, stockIn } from "@/db";
import { lowStockThreshold } from "@/lib/config";

export type StockBalance = {
  productId: number;
  inBoxes: number;
  soldBoxes: number;
  balance: number;
};

/**
 * Current stock: har product ka stock = total stock_in boxes − total sold boxes (sale_items).
 * numeric/bigint sums pg se string me aate hain → Number() conversion zaroori.
 */
export async function getStockBalances(): Promise<Map<number, StockBalance>> {
  const [inRows, soldRows] = await Promise.all([
    db
      .select({
        productId: stockIn.productId,
        total: sql<string>`coalesce(sum(${stockIn.boxes}), 0)`,
      })
      .from(stockIn)
      .groupBy(stockIn.productId),
    db
      .select({
        productId: saleItems.productId,
        total: sql<string>`coalesce(sum(${saleItems.boxes}), 0)`,
      })
      .from(saleItems)
      .groupBy(saleItems.productId),
  ]);

  const map = new Map<number, StockBalance>();
  for (const r of inRows) {
    const inBoxes = Number(r.total);
    map.set(r.productId, {
      productId: r.productId,
      inBoxes,
      soldBoxes: 0,
      balance: inBoxes,
    });
  }
  for (const r of soldRows) {
    const soldBoxes = Number(r.total);
    const cur =
      map.get(r.productId) ??
      { productId: r.productId, inBoxes: 0, soldBoxes: 0, balance: 0 };
    cur.soldBoxes = soldBoxes;
    cur.balance = cur.inBoxes - soldBoxes;
    map.set(r.productId, cur);
  }
  return map;
}

export function isLowStock(balance: number): boolean {
  return balance < lowStockThreshold();
}

export type { products };
