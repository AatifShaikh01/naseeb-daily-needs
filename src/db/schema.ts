import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* Settings table — store global app configuration (low_stock_limit, business name, phone) */
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

/* Enums */
export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "partial",
]);
export const paymentModeEnum = pgEnum("payment_mode", ["cash", "upi", "bank"]);

/* Users — single owner login (username + PIN) */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    username: text("username").notNull(),
    pinHash: text("pin_hash").notNull(),
    // Default PIN (1234) use ho raha ho to pehle login par badalna zaroori
    mustChangePin: boolean("must_change_pin").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_username_unique").on(t.username)],
);

/* Staff — "Delivered By" dropdown me dikhte hain (inka login nahi hai) */
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* Products — e.g. Bisleri 500ml, Maaza 1 ltr */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  size: text("size").notNull(),
  defaultRatePerBox: numeric("default_rate_per_box", {
    precision: 10,
    scale: 2,
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* Stock In — maal aane ki entry */
export const stockIn = pgTable(
  "stock_in",
  {
    id: serial("id").primaryKey(),
    entryDate: date("entry_date").notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    boxes: integer("boxes").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("stock_in_entry_date_idx").on(t.entryDate)],
);

/* Sales */
export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    saleDate: date("sale_date").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    deliveredBy: integer("delivered_by")
      .notNull()
      .references(() => staff.id),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sales_sale_date_idx").on(t.saleDate)],
);

/* Sale Items */
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  boxes: integer("boxes").notNull(),
  ratePerBox: numeric("rate_per_box", { precision: 10, scale: 2 }).notNull(),
});

/* Payments */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidOn: date("paid_on").notNull().default(sql`current_date`),
  mode: paymentModeEnum("mode").notNull().default("cash"),
  note: text("note").notNull().default(""),
});

/* TS types */
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;

