import { eq } from "drizzle-orm";

import { db, settings } from "@/db";

/** Configurable low-stock threshold (boxes); database setting overrides the environment default. */
export async function lowStockThreshold(): Promise<number> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "low_stock_limit"))
    .limit(1);
  const savedValue = Number(row?.value);
  if (Number.isInteger(savedValue) && savedValue >= 1 && savedValue <= 1_000_000) {
    return savedValue;
  }

  const n = Number(process.env.LOW_STOCK_BOXES);
  return Number.isInteger(n) && n >= 1 && n <= 1_000_000 ? n : 5;
}
