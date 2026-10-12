/**
 * Seeds one owner user + sample products + sample staff (idempotent).
 * Run: node --env-file=.env.local scripts/seed.mjs
 * PIN: SEED_PIN env var, otherwise "1234". Format pbkdf2$iters$salt$hash (src/lib/pin.ts same).
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";

import { Pool } from "pg";

const PIN = process.env.SEED_PIN ?? "1234";
if (!/^\d{4,8}$/.test(PIN)) {
  console.error("SEED_PIN must be 4–8 digits.");
  process.exit(1);
}

function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(pin, salt, 100_000, 32, "sha256");
  const hex = (b) => Buffer.from(b).toString("hex");
  return `pbkdf2$100000$${hex(salt)}$${hex(hash)}`;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found — check .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const client = await pool.connect();

try {
  /* ---------- Users (single owner login) ---------- */
  const pinHash = hashPin(PIN);
  const resUser = await client.query(
    `INSERT INTO users (name, username, pin_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO NOTHING
     RETURNING id`,
    ["Aasif (Owner)", "aasif", pinHash],
  );
  console.log(
    resUser.rowCount > 0
      ? "+ user aasif (owner)"
      : "· user aasif already exists",
  );

  /* ---------- Staff ---------- */
  const seedStaff = ["Shahbaz", "Atif", "Aasif (Owner)"];
  for (const name of seedStaff) {
    const res = await client.query(
      `INSERT INTO staff (name) SELECT $1
       WHERE NOT EXISTS (SELECT 1 FROM staff WHERE name = $1)`,
      [name],
    );
    console.log(res.rowCount > 0 ? `+ staff ${name}` : `· staff ${name} exists`);
  }

  /* ---------- Products ---------- */
  const seedProducts = [
    // [name, size, default_rate_per_box]
    ["Bisleri", "500ml", "192.00"],
    ["Bisleri", "1 ltr", "216.00"],
    ["Bisleri", "2 ltr", "240.00"],
    ["Maaza", "500ml", "240.00"],
    ["Maaza", "1 ltr", "264.00"],
    ["Sprite", "500ml", "192.00"],
  ];
  for (const [name, size, rate] of seedProducts) {
    const res = await client.query(
      `INSERT INTO products (name, size, default_rate_per_box)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = $1 AND size = $2)`,
      [name, size, rate],
    );
    console.log(res.rowCount > 0 ? `+ product ${name} ${size}` : `· product ${name} ${size} exists`);
  }

  console.log(`\n✓ Seed complete. Login: aasif / PIN: ${PIN}`);
  console.log("  (The app will ask you to change the PIN on first login.)");
} finally {
  client.release();
  await pool.end();
}