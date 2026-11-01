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

/* Staff — ab login support ke saath (staff ID + PIN se login kar sakte hain) */
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  staffId: text("staff_id").notNull().unique(),
  phone: text("phone"),
  pinHash: text("pin_hash"),
  role: pgEnum("staff_role", ["admin", "staff"]).notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [uniqueIndex("staff_staff_id_unique").on(t.staffId)]);

/* Customers — din ke udhaar customers ki poori history */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  address: text("address"),
  totalBoxes: integer("total_boxes").notNull().default(0),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPending: numeric("total_pending", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [
  uniqueIndex("customers_phone_unique").on(t.phone),
]);

/* Customer Payments — alag se customer ko di gayi payment (udhaar recovery) */
export const customerPayments = pgTable("customer_payments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidOn: date("paid_on").notNull().default(sql`current_date`),
  mode: paymentModeEnum("mode").notNull().default("cash"),
  note: text("note").notNull().default(""),
  staffId: integer("staff_id").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Activity Logs — kisne kya kiya (audit trail) */
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
(t) => [index("activity_logs_created_at_idx").on(t.createdAt)]);

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
    staffId: integer("staff_id")
      .notNull()
      .references(() => staff.id),
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
    paymentMode: paymentModeEnum("payment_mode").notNull().default("cash"),
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

/* Suppliers — maal khareedne wale (udhaar ledger ke liye) */
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* Purchase direction: stock aaya ya supplier ko wapas gaya */
export const purchaseDirectionEnum = pgEnum("purchase_direction", ["in", "return"]);

/* Purchases — supplier se maal aaya (ya return gaya) */
export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    entryDate: date("entry_date").notNull(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    direction: purchaseDirectionEnum("direction").notNull().default("in"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("purchases_entry_date_idx").on(t.entryDate)],
);

/* Purchase Items — kaunsa product, kitne boxes, kis rate par */
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  boxes: integer("boxes").notNull(),
  ratePerBox: numeric("rate_per_box", { precision: 10, scale: 2 }).notNull(),
});

/* Supplier Payments — supplier ko di gayi payment */
export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id, {
    onDelete: "set null",
  }),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
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
export type Supplier = typeof suppliers.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerPayment = typeof customerPayments.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;

