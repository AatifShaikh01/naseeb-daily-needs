require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const products = await c.query("select id, name, size from products order by id");
  console.log("=== PRODUCTS ===");
  products.rows.forEach((r) => console.log(`  ${r.id} | ${r.name} | ${r.size}`));

  const suppliers = await c.query("select id, name from suppliers order by id");
  console.log("=== SUPPLIERS ===");
  suppliers.rows.forEach((r) => console.log(`  ${r.id} | ${r.name}`));

  console.log("=== PURCHASES (with items) ===");
  const p = await c.query(`
    select pu.id, pu.entry_date, pu.direction, pu.total_amount, pu.paid_amount, pu.note,
           su.name as supplier,
           pi.id as item_id, pi.boxes, pi.rate_per_box, pr.name as product, pr.size
    from purchases pu
    join suppliers su on su.id = pu.supplier_id
    left join purchase_items pi on pi.purchase_id = pu.id
    left join products pr on pr.id = pi.product_id
    order by pu.entry_date desc, pu.id desc, pi.id
  `);
  p.rows.forEach((r) => {
    console.log(
      `  P#${r.id} ${r.entry_date} dir=${r.direction} sup=${r.supplier} total=${r.total_amount} paid=${r.paid_amount} note="${r.note || ""}"`,
    );
    if (r.item_id)
      console.log(
        `      item#${r.item_id} ${r.product} (${r.size}) boxes=${r.boxes} rate=${r.rate_per_box} -> ${(r.boxes * r.rate_per_box).toFixed(2)}`,
      );
  });

  console.log("=== SALES (with items) ===");
  const s = await c.query(`
    select sa.id, sa.sale_date, sa.total_amount, sa.paid_amount, sa.payment_status, sa.note,
           si.id as item_id, si.boxes, si.rate_per_box, pr.name as product, pr.size
    from sales sa
    left join sale_items si on si.sale_id = sa.id
    left join products pr on pr.id = si.product_id
    order by sa.sale_date desc, sa.id desc, si.id
  `);
  s.rows.forEach((r) => {
    console.log(
      `  S#${r.id} ${r.sale_date} total=${r.total_amount} paid=${r.paid_amount} status=${r.payment_status} note="${r.note || ""}"`,
    );
    if (r.item_id)
      console.log(
        `      item#${r.item_id} ${r.product} (${r.size}) boxes=${r.boxes} rate=${r.rate_per_box} -> ${(r.boxes * r.rate_per_box).toFixed(2)}`,
      );
  });

  console.log("=== SUPPLIER PAYMENTS ===");
  const sp = await c.query(`
    select sp.id, sp.purchase_id, sp.supplier_id, su.name supplier, sp.amount, sp.paid_on, sp.mode, sp.note
    from supplier_payments sp join suppliers su on su.id = sp.supplier_id order by sp.id
  `);
  sp.rows.forEach((r) =>
    console.log(
      `  SP#${r.id} purchase_id=${r.purchase_id} sup=${r.supplier} amount=${r.amount} on=${r.paid_on} mode=${r.mode} note="${r.note || ""}"`,
    ),
  );

  console.log("=== STOCK IN ===");
  const si = await c.query(`
    select si.id, si.entry_date, si.product_id, pr.name product, si.boxes, si.note
    from stock_in si join products pr on pr.id = si.product_id order by si.id
  `);
  si.rows.forEach((r) =>
    console.log(`  SI#${r.id} ${r.entry_date} ${r.product} boxes=${r.boxes} note="${r.note || ""}"`),
  );

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
