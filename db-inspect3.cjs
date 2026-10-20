require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    select si.id, si.entry_date::text d, si.product_id, pr.name product, pr.size, si.boxes, si.note
    from stock_in si join products pr on pr.id = si.product_id
    where si.entry_date >= date '2026-10-16' and si.product_id in (
      select product_id from purchase_items where purchase_id in (11,13)
    )
    order by si.entry_date, si.id
  `);
  console.log("=== stock_in rows for P#11/P#13 items (>= 16 Oct) ===");
  r.rows.forEach((x) =>
    console.log(`  SI#${x.id} ${x.d} ${x.product} (${x.size}) boxes=${x.boxes} note="${x.note || ""}"`),
  );

  const dup = await c.query(`
    select si.product_id, pr.name product, pr.size, count(*) rows, sum(si.boxes) boxes
    from stock_in si join products pr on pr.id = si.product_id
    where si.product_id in (select product_id from purchase_items where purchase_id = 11)
    group by si.product_id, pr.id
  `);
  console.log("=== P#11 product stock_in totals (dupes?) ===");
  dup.rows.forEach((x) =>
    console.log(`  ${x.product} (${x.size}) rows=${x.rows} boxes=${x.boxes}`),
  );

  const pmt = await c.query("select id, purchase_id, supplier_id, amount, note from supplier_payments");
  console.log("=== supplier_payments ===");
  pmt.rows.forEach((x) => console.log(`  SP#${x.id} purchase=${x.purchase_id} sup=${x.supplier_id} amt=${x.amount}`));

  const st = await c.query(`
    select pr.id, pr.name, pr.size,
           coalesce((select sum(boxes) from stock_in where product_id=pr.id),0) inb,
           coalesce((select sum(boxes) from sale_items where product_id=pr.id),0) sold
    from products pr order by pr.id
  `);
  console.log("=== stock per product ===");
  st.rows.forEach((x) =>
    console.log(`  ${x.id} ${x.name} (${x.size}) in=${x.inb} sold=${x.sold} avail=${x.inb - x.sold}`),
  );

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
