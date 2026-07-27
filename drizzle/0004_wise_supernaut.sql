ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "client_ref" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_outlet_idx" ON "expenses" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_outlet_idx" ON "products" USING btree ("outlet_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_client_ref_unq" ON "transactions" USING btree ("tenant_id","client_ref") WHERE client_ref IS NOT NULL;