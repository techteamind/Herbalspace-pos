ALTER TABLE "audit_logs" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "promos" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredients_outlet_idx" ON "ingredients" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_status_date_idx" ON "transactions" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "transactions_outlet_idx" ON "transactions" USING btree ("outlet_id");