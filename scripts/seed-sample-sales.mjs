// Temp E2E — seed sample sales for pending/payment testing, then verify.
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (t, p) => pool.query(t, p);

// Clean slate
await q("DELETE FROM payments");
await q("DELETE FROM sale_items");
await q("DELETE FROM sales");

async function mkSale(date, name, phone, staff, status, total, paid, items) {
  const r = await q(
    `INSERT INTO sales (sale_date, customer_name, customer_phone, delivered_by, payment_status, total_amount, paid_amount, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'') RETURNING id`,
    [date, name, phone, staff, status, total, paid],
  );
  const id = r.rows[0].id;
  for (const [pid, boxes, rate] of items) {
    await q(
      `INSERT INTO sale_items (sale_id, product_id, boxes, rate_per_box) VALUES ($1,$2,$3,$4)`,
      [id, pid, boxes, rate],
    );
  }
  return id;
}

// Ramesh Store (case/phone variants to test grouping): 3 sales, FIFO
await mkSale("2026-10-05", "Ramesh Store", "9876543210", 1, "pending", 1608.00, 0, [[1, 5, 192.00], [2, 3, 216.00]]);
await mkSale("2026-10-08", "ramesh store", " 9876543210", 2, "partial", 432.00, 200.00, [[2, 2, 216.00]]);
await mkSale("2026-10-10", "Ramesh Store", "9876543210", 1, "pending", 1920.00, 0, [[1, 10, 192.00]]);
// Hotel Annapurna — fully paid (excluded)
await mkSale("2026-10-11", "Hotel Annapurna", "9123456780", 3, "paid", 500.00, 500.00, [[2, 2, 250.00]]);
// Sri Balaji — no phone, pending 300
await mkSale("2026-10-12", "Sri Balaji", null, 2, "pending", 300.00, 0, [[1, 1, 300.00]]);

console.log("Seeded 5 sales.");

const rows = await q(
  `SELECT lower(trim(customer_name)) AS n, regexp_replace(coalesce(customer_phone,''),'[^0-9]','','g') AS p,
          sum(total_amount - paid_amount) AS pending
   FROM sales GROUP BY 1,2 ORDER BY pending DESC`,
);
console.log("Grouped pending:");
for (const r of rows.rows) console.log(`  ${r.n} | ${r.p} => ${r.pending}`);

const ramesh = rows.rows.find((r) => r.n === "ramesh store");
console.log(
  ramesh && Number(ramesh.pending) === 3760
    ? "OK: Ramesh grouped (case+phone-insensitive) pending = 3760"
    : "FAIL: Ramesh pending = " + (ramesh && ramesh.pending),
);
const hotel = rows.rows.find((r) => r.n === "hotel annapurna");
console.log(hotel && Number(hotel.pending) === 0 ? "OK: Hotel excluded (0 pending)" : "FAIL: Hotel pending = " + (hotel && hotel.pending));

await pool.end();

