ALTER TABLE "profiles" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pin_failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pin_locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "closing_time" text;