DO $$ BEGIN
  CREATE TYPE "public"."sale_approval_status" AS ENUM ('pending', 'approved', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "approval_status" "sale_approval_status"
  DEFAULT 'approved' NOT NULL;
