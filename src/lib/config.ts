/** Configurable low-stock threshold (boxes). Env: LOW_STOCK_BOXES, default 5. */
export function lowStockThreshold(): number {
  const n = Number(process.env.LOW_STOCK_BOXES);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 5;
}
