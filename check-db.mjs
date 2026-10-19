import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// todayIST jaisa hi logic (IST offset)
const now = new Date();
const today = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

const one = async (q, params = []) => (await client.query(q, params)).rows;

console.log("today (IST):", today);
console.log();

// 1. Overall total (Dashboard "Total Sales (overall)")
console.log("1. overall sum(total_amount):",
  (await one(`select coalesce(sum(total_amount),0) v from sales`))[0].v);

// 2. Today (Dashboard "Today's Sales")
console.log("2. today sum:",
  (await one(`select coalesce(sum(total_amount),0) v, count(*) c from sales where sale_date=$1`, [today]))[0]);

// 3. Pending (Dashboard "Total Pending")
console.log("3. pending (all):",
  (await one(`select coalesce(sum(total_amount - paid_amount),0) v from sales`))[0].v);

// 4. Delivered today boxes
console.log("4. boxes today:",
  (await one(`select coalesce(sum(si.boxes),0) v from sale_items si join sales s on s.id=si.sale_id where s.sale_date=$1`, [today]))[0].v);

// 5. Last 7 days per-day + total (Sales Overview)
const start7 = addDays(today, -6);
console.log("5. last-7-days per day (from " + start7 + "):");
const rows7 = await one(`select sale_date, coalesce(sum(total_amount),0) v, count(*) c from sales where sale_date >= $1 and sale_date <= $2 group by sale_date order by sale_date`, [start7, today]);
let tot7 = 0;
for (const r of rows7) { console.log("   ", r.sale_date, "₹" + r.v, `(${r.c} sales)`); tot7 += Number(r.v); }
console.log("    TOTAL:", tot7, " (UI shows 17465)");

// 6. Previous 7 days (growth % ke liye)
const pStart = addDays(today, -13), pEnd = addDays(today, -7);
const prev = (await one(`select coalesce(sum(total_amount),0) v from sales where sale_date >= $1 and sale_date <= $2`, [pStart, pEnd]))[0].v;
console.log("6. previous-7-days (" + pStart + ".." + pEnd + "):", prev);
console.log("   growth %:", prev > 0 ? (((tot7 - Number(prev)) / Number(prev)) * 100).toFixed(1) : "n/a (UI me prev=0 hota to badge hide)");

// 7. 7 days se purani sales
const older = (await one(`select coalesce(sum(total_amount),0) v, count(*) c from sales where sale_date < $1`, [start7]))[0];
console.log("7. older than 7 days:", older);

// 8. Per-sale avg (user 'Avg. sale' se expect kar sakta hai)
console.log("8. sales count in 7 days:",
  (await one(`select count(*) c from sales where sale_date >= $1`, [start7]))[0].c,
  "→ per-sale avg =", tot7 / Number((await one(`select count(*) c from sales where sale_date >= $1`, [start7]))[0].c || 1));

// 9. Aaj ki sales detail (activity mismatch check)
console.log("9. today's sales detail:");
console.log(await one(`select id, sale_date, customer_name, total_amount, paid_amount, payment_status, created_at from sales where sale_date=$1 order by id`, [today]));

await client.end();
