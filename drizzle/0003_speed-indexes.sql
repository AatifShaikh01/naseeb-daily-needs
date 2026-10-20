-- Tab-switch speed: pending/sales/stock queries ke liye indexes.
-- Har tab par poori tables scan ho rahi thi — ye indexes join/filter fast karenge.
CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items" ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_items_product_id_idx" ON "sale_items" ("product_id");
CREATE INDEX IF NOT EXISTS "payments_sale_id_idx" ON "payments" ("sale_id");
CREATE INDEX IF NOT EXISTS "payments_paid_on_idx" ON "payments" ("paid_on");
CREATE INDEX IF NOT EXISTS "sales_sale_date_idx" ON "sales" ("sale_date");
CREATE INDEX IF NOT EXISTS "sales_customer_name_idx" ON "sales" ("customer_name");
CREATE INDEX IF NOT EXISTS "stock_in_product_id_idx" ON "stock_in" ("product_id");
CREATE INDEX IF NOT EXISTS "purchase_items_purchase_id_idx" ON "purchase_items" ("purchase_id");
CREATE INDEX IF NOT EXISTS "purchase_items_product_id_idx" ON "purchase_items" ("product_id");
CREATE INDEX IF NOT EXISTS "supplier_payments_supplier_id_idx" ON "supplier_payments" ("supplier_id");
