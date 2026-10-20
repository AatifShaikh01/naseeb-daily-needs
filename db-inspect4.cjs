require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const p = await c.query(
    "select * from purchases where id in (11,12,13) order by id",
  );
  console.log("=== purchases ===");
  p.rows.forEach((x) =>
    console.log(
      `  P#${x.id} date=${x.entry_date} sup=${x.supplier_id} dir=${x.direction} total=${x.total_amount} paid=${x.paid_amount} note="${x.note || ""}"`,
    ),
  );

  const it = await c.query(`
    select pi.purchase_id, pi.product_id, pr.name product, pr.size, pi.boxes, pi.rate_per_box
    from purchase_items pi join products pr on pr.id=pi.product_id
    where pi.purchase_id in (11,13) order by pi.purchase_id, pi.product_id
  `);
  console.log("=== purchase_items ===");
  it.rows.forEach((x) =>
    console.log(
      `  P#${x.purchase_id} ${x.product} (${x.size}) boxes=${x.boxes} rate=${x.rate_per_box}`,
    ),
  );

  const s = await c.query("select * from suppliers where id in (7, (select supplier_id from purchases where id=11))");
  console.log("=== suppliers ===");
  s.rows.forEach((x) => console.log(`  S#${x.id} ${x.name}`));

  const sal = await c.query(`
    select sale_id, product_id, boxes, rate_per_box, unit_price from sale_items
    where product_id in (select product_id from purchase_items where purchase_id in (11,13))
    order by sale_id
  `);
  console.log("=== sale_items for those products ===");
  sal.rows.forEach((x) =>
    console.log(`  Sale#${x.sale_id} prod=${x.product_id} boxes=${x.boxes} rate=${x.rate_per_box} price=${x.unit_price}`),
  );

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
