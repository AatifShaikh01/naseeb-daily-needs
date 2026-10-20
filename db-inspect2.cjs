require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log("=== ALL SALES (compact) ===");
  const s = await c.query(`
    select sa.id, sa.sale_date::text d, sa.total_amount t, sa.paid_amount p, sa.payment_status st, sa.note,
           string_agg(pr.name || ' x' || si.boxes, ' | ' order by si.id) items
    from sales sa
    left join sale_items si on si.sale_id = sa.id
    left join products pr on pr.id = si.product_id
    group by sa.id order by sa.sale_date desc, sa.id desc
  `);
  s.rows.forEach((r) =>
    console.log(`  S#${r.id} ${r.d} tot=${r.t} paid=${r.p} ${r.st} | ${r.items}`),
  );

  console.log("=== SALES ON 2026-10-17 ===");
  const s17 = await c.query(`
    select sa.id, sa.total_amount t, sa.paid_amount p, sa.payment_status st,
           string_agg(pr.name || ' x' || si.boxes, ' | ' order by si.id) items
    from sales sa join sale_items si on si.sale_id = sa.id join products pr on pr.id = si.product_id
    where sa.sale_date = date '2026-10-17' group by sa.id
  `);
  if (!s17.rows.length) console.log("  (none)");
  s17.rows.forEach((r) => console.log(`  S#${r.id} tot=${r.t} paid=${r.p} ${r.st} | ${r.items}`));

  console.log("=== STOCK_IN grouped by note+product ===");
  const si = await c.query(`
    select si.note, pr.name product, pr.size, sum(si.boxes) boxes, count(*) cnt
    from stock_in si join products pr on pr.id = si.product_id
    group by si.note, pr.id order by si.note, pr.id
  `);
  si.rows.forEach((r) =>
    console.log(`  [${r.note || "(no note)"}] ${r.product} (${r.size}) boxes=${r.boxes} rows=${r.cnt}`),
  );

  console.log("=== PURCHASES summary ===");
  const pu = await c.query(`
    select pu.id, pu.entry_date::text d, su.name sup, pu.total_amount t, pu.paid_amount p,
           count(pi.id) items, sum(pi.boxes) boxes
    from purchases pu join suppliers su on su.id = pu.supplier_id
    left join purchase_items pi on pi.purchase_id = pu.id
    group by pu.id, su.name order by pu.id
  `);
  pu.rows.forEach((r) =>
    console.log(`  P#${r.id} ${r.d} ${r.sup} tot=${r.t} paid=${r.p} items=${r.items} boxes=${r.boxes}`),
  );

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
