/**
 * Merges the two Campa Colddrinks purchases (#11 and #13) into one purchase
 * dated 17 Oct, and de-duplicates the stock_in rows for the merged products.
 *
 * Why: both purchases are the same supplier/mail day. The stock for them was
 * first entered by hand from the Stock In form (rows with an empty note) and
 * later re-added automatically by the purchase edit action (rows noted
 * "Purchase #11 · Campa Colddrinks"), so every product was counted twice.
 *
 * Run (dry run):  node --env-file=.env.local scripts/merge-campa-purchase.mjs
 * Apply:          node --env-file=.env.local scripts/merge-campa-purchase.mjs --apply
 */
import { writeFileSync } from "node:fs";

import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");
const KEEP_PURCHASE_ID = 11;
const DROP_PURCHASE_ID = 13;
const MERGED_DATE = "2026-10-17";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nahi mila — .env.local check karein.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const c = await pool.connect();

try {
  await c.query("BEGIN");

  /* ---------- 1. Preconditions ---------- */
  const { rows: buys } = await c.query(
    `select id, entry_date::text, supplier_id, direction, total_amount, paid_amount
       from purchases where id = any($1::int[]) order by id`,
    [[KEEP_PURCHASE_ID, DROP_PURCHASE_ID]],
  );
  if (buys.length !== 2) throw new Error(`Expected 2 purchases, found ${buys.length}`);
  if (buys[0].supplier_id !== buys[1].supplier_id)
    throw new Error("Purchases belong to different suppliers — refusing to merge.");
  if (buys.some((b) => b.direction !== "in"))
    throw new Error("One of the purchases is a return — refusing to merge.");
  const supplierId = buys[0].supplier_id;

  const { rows: sup } = await c.query("select name from suppliers where id = $1", [supplierId]);
  const supplierName = sup[0]?.name ?? "Supplier";
  const note = `Purchase #${KEEP_PURCHASE_ID} · ${supplierName}`;

  /* ---------- 2. Merge items ---------- */
  const { rows: moved } = await c.query(
    `update purchase_items set purchase_id = $1 where purchase_id = $2 returning id`,
    [KEEP_PURCHASE_ID, DROP_PURCHASE_ID],
  );
  console.log(`→ moved ${moved.length} item rows into purchase #${KEEP_PURCHASE_ID}`);

  /* ---------- 3. Fix the purchase header ---------- */
  const { rows: totals } = await c.query(
    `select coalesce(sum(boxes * rate_per_box), 0)::numeric(12,2) as total,
            coalesce(sum(case when boxes < 0 then -boxes else 0 end), 0) as return_boxes
       from purchase_items where purchase_id = $1`,
    [KEEP_PURCHASE_ID],
  );
  const total = totals[0].total;
  if (Number(totals[0].return_boxes) > 0)
    throw new Error("Merged purchase contains a return line — refusing to merge.");

  await c.query(
    `update purchases
        set entry_date = $2::date,
            total_amount = $3,
            note = coalesce(nullif(note, ''), $4)
      where id = $1`,
    [KEEP_PURCHASE_ID, MERGED_DATE, total, `Merged with Purchase #${DROP_PURCHASE_ID}`],
  );
  console.log(`→ purchase #${KEEP_PURCHASE_ID} → ${MERGED_DATE}, total ₹${total}`);

  /* ---------- 4. Re-point any payments, then drop the old purchase ---------- */
  const { rows: payMoved } = await c.query(
    `update supplier_payments set purchase_id = $1 where purchase_id = $2 returning id`,
    [KEEP_PURCHASE_ID, DROP_PURCHASE_ID],
  );
  if (payMoved.length) console.log(`→ re-pointed ${payMoved.length} payment rows`);
  await c.query("delete from purchases where id = $1", [DROP_PURCHASE_ID]);
  console.log(`→ deleted purchase #${DROP_PURCHASE_ID}`);

  /* ---------- 5. Normalise stock_in for the merged products ---------- */
  const { rows: prods } = await c.query(
    `select distinct pi.product_id, pr.name, pr.size, sum(pi.boxes)::int as boxes
       from purchase_items pi join products pr on pr.id = pi.product_id
      where pi.purchase_id = $1
      group by pi.product_id, pr.name, pr.size
      order by pi.product_id`,
    [KEEP_PURCHASE_ID],
  );

  for (const p of prods) {
    const { rows: del } = await c.query(
      `delete from stock_in where product_id = $1 returning id, entry_date::text, boxes, coalesce(note,'') as note`,
      [p.product_id],
    );
    const before = del.reduce((s, r) => s + Number(r.boxes), 0);
    await c.query(
      `insert into stock_in (entry_date, product_id, boxes, note) values ($1::date, $2, $3, $4)`,
      [MERGED_DATE, p.product_id, p.boxes, note],
    );
    console.log(
      `→ ${p.name} (${p.size}): ${del.length} row(s) totalling ${before} → 1 row of ${p.boxes}`,
    );
  }

  /* ---------- 6. Report the result ---------- */
  const { rows: after } = await c.query(`
    select pr.id, pr.name, pr.size,
           coalesce((select sum(boxes) from stock_in where product_id = pr.id), 0)::int inb,
           coalesce((select sum(boxes) from sale_items where product_id = pr.id), 0)::int sold
      from products pr order by pr.id`);
  console.log("\n=== stock after merge ===");
  after.forEach((x) =>
    console.log(`  ${x.id} ${x.name} (${x.size}) in=${x.inb} sold=${x.sold} avail=${x.inb - x.sold}`),
  );

  const { rows: merged } = await c.query(
    `select p.id, p.entry_date::text, p.total_amount, p.paid_amount, s.name supplier
       from purchases p join suppliers s on s.id = p.supplier_id where p.id = $1`,
    [KEEP_PURCHASE_ID],
  );
  console.log("\n=== merged purchase ===");
  merged.forEach((x) =>
    console.log(
      `  P#${x.id} ${x.entry_date} ${x.supplier} total=₹${x.total_amount} paid=₹${x.paid_amount}`,
    ),
  );

  if (!APPLY) {
    await c.query("ROLLBACK");
    console.log("\n⏪ DRY RUN — nothing changed. Re-run with --apply to commit.");
  } else {
    await c.query("COMMIT");
    console.log("\n✅ Committed.");
  }
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
