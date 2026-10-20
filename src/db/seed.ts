import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    throw new Error("DATABASE_URL missing hai — .env.local me real value daalke phir `npm run db:seed` chalao.");
  }
  const sql = neon(url);

  // 1) Default owner: username `naseeb`, PIN `1234` (pehle login par change karna hoga)
  const pinHash = await bcrypt.hash("1234", 10);
  await sql`
    INSERT INTO users (name, username, pin_hash, must_change_pin)
    VALUES ('Naseeb', 'naseeb', ${pinHash}, true)
    ON CONFLICT (username) DO NOTHING
  `;

  // 2) Sample staff (Delivered By dropdown ke liye)
  await sql`
    INSERT INTO staff (name, is_active) VALUES ('Staff 1', true)
    ON CONFLICT DO NOTHING
  `;

  // 3) Sample products
  await sql`
    INSERT INTO products (name, size, default_rate_per_box, is_active)
    VALUES
      ('Bisleri', '500ml', 120, true),
      ('Maaza', '1 ltr', 150, true)
    ON CONFLICT DO NOTHING
  `;

  console.log("Seed done: owner=naseeb / PIN=1234 (login par change karein).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
