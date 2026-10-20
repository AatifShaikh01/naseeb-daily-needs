require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const s = await c.query(`
    select si.id, si.entry_date::text d, pr.name product, pr.size, si.boxes, coalesce(si.note,'') note
    from stock_in si join products pr on pr.id=si.product_id
    order by si.id
  `);
  console.log("=== ALL stock_in rows ===");
  s.rows.forEach((x) =>
    console.log(`  SI#${x.id} ${x.d} ${x.product} (${x.size}) boxes=${x.boxes} note="${x.note}"`),
  );

  const dup = await c.query(`
    select pr.name product, pr.size, count(*) rows, sum(si.boxes) boxes,
           string_agg(si.id::text, ',' order by si.id) ids
    from stock_in si join products pr on pr.id=si.product_id
    group by pr.id, pr.name, pr.size
    having count(*) > 1
    order by pr.id
  `);
  console.log("=== products with >1 stock_in row ===");
  dup.rows.forEach((x) =>
    console.log(`  ${x.product} (${x.size}) rows=${x.rows} boxes=${x.boxes} ids=${x.ids}`),
  );

  const cols = await c.query(
    "select table_name, column_name, data_type from information_schema.columns where table_name in ('sale_items','sales','stock_in','purchase_items') order by table_name, ordinal_position",
  );
  console.log("=== columns ===");
  cols.rows.forEach((x) => console.log(`  ${x.table_name}.${x.column_name} ${x.data_type}`));

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
