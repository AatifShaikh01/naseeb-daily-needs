import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * App is configured for Neon Postgres only. This avoids bundling the Node-only
 * `pg` driver into the app, which triggers Turbopack resolution errors for
 * `dns` during build.
 */
export type Db = NeonHttpDatabase<typeof schema>;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    throw new Error("DATABASE_URL missing hai — .env.local me set karein.");
  }
  if (url.startsWith("https://") || url.startsWith("http://")) {
    throw new Error(
      "DATABASE_URL REST URL hai. Neon dashboard se postgresql://... wali Connection String use karein.",
    );
  }
  if (!/neon\.tech/i.test(url)) {
    throw new Error(
      "DATABASE_URL ko Neon Postgres connection string ke roop me set karein (host me 'neon.tech').",
    );
  }
  return url;
}

let cached: Db | null = null;

function getDb(): Db {
  if (!cached) {
    const sql = neon(getConnectionString());
    cached = drizzleNeon({ client: sql, schema }) as unknown as Db;
  }
  return cached;
}

/**
 * Lazy proxy — import time par throw nahi karta, taaki `next build`
 * bina env ke bhi ho jaye. Pehle actual query par clear error milega.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
export * from "./schema";
