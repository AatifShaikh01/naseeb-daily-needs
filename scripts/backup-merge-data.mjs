/**
 * Dumps the tables touched by scripts/merge-campa-purchase.mjs to JSON so the
 * pre-merge state can be restored by hand if something goes wrong.
 * Run: node --env-file=.env.local scripts/backup-merge-data.mjs
 */
import { writeFileSync } from "node:fs";

import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nahi mila — .env.local check karein.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const c = await pool.connect();

try {
  const out = {};
  for (const t of ["purchases", "purchase_items", "supplier_payments", "stock_in"]) {
    const { rows } = await c.query(`select * from ${t} order by id`);
    out[t] = rows;
  }
  const file = "backup-before-merge.json";
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`✓ Backup written to ${file}`);
  for (const [t, rows] of Object.entries(out)) console.log(`  ${t}: ${rows.length} rows`);
} finally {
  c.release();
  await pool.end();
}
