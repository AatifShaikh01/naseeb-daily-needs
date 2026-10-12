/**
 * Applies SQL migrations from ./drizzle on DATABASE_URL (Node --env-file se env aata hai).
 * Run: node --env-file=.env.local scripts/migrate.mjs
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nahi mila — .env.local check karein.");
  process.exit(1);
}
if (url.startsWith("http")) {
  console.error("DATABASE_URL REST URL hai — postgresql://... DSN chahiye.");
  process.exit(1);
}

const folder = join(process.cwd(), "drizzle");
if (!existsSync(folder)) {
  console.error("drizzle/ folder nahi — pehle `npm run db:generate` chalayein.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

console.log("Migrations apply ho rahi hain…");
await migrate(db, { migrationsFolder: folder });
console.log("✓ Done.");
await pool.end();