import { getMonthlyProfit } from "./src/lib/analytics.ts";
const pr = await getMonthlyProfit("2026-10");
console.log("REV", pr.totalRevenue, "COST", pr.totalCost, "PROFIT", pr.totalProfit);
for (const r of pr.rows) console.log(r.name, r.size, "| buy", r.buyRate, "| sell", r.sellRate, "| sold", r.sellBoxes, "| profit", r.profit);
process.exit(0);
