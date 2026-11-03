DO $$ BEGIN
  CREATE TYPE "public"."staff_role" AS ENUM ('admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "staff_id" text;
--> statement-breakpoint
UPDATE "staff"
SET "staff_id" = 'STF' || lpad("id"::text, 4, '0')
WHERE "staff_id" IS NULL OR btrim("staff_id") = '';
--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "staff_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_staff_id_unique" ON "staff" USING btree ("staff_id");
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "pin_hash" text;
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "role" "staff_role" DEFAULT 'staff' NOT NULL;
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "must_change_pin" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "staff_id" integer;
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "staff_id" DROP NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales"
    ADD CONSTRAINT "sales_staff_id_staff_id_fk"
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "staff_id" integer;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payments"
    ADD CONSTRAINT "payments_staff_id_staff_id_fk"
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
