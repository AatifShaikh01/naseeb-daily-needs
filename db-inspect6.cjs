require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const s = await c.query(`
    select sa.id, sa.sale_date::text d, sa.customer_name, sa.total_amount, si.product_id, pr.name product, pr.size, si.boxes, si.rate_per_box
    from sales sa join sale_items si on si.sale_id=sa.id join products pr on pr.id=si.product_id
    order by sa.sale_date, sa.id, si.product_id
  `);
  console.log("=== sales with items ===");
  s.rows.forEach((x) =>
    console.log(`  Sale#${x.id} ${x.d} ${x.customer_name} tot=${x.total_amount} | ${x.product} (${x.size}) boxes=${x.boxes} rate=${x.rate_per_box}`),
  );

  const sc = await c.query("select id, sale_date::text d, customer_name, total_amount, paid_amount from sales order by id");
  console.log("=== sales headers ===");
  sc.rows.forEach((x) => console.log(`  Sale#${x.id} ${x.d} ${x.customer_name} tot=${x.total_amount} paid=${x.paid_amount}`));

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
