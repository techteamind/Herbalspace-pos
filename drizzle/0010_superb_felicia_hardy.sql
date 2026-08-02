CREATE TABLE "modifier_option_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_option_id_modifier_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."modifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "modifier_option_ingredients_option_idx" ON "modifier_option_ingredients" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "modifier_option_ingredients_opt_ing_unq" ON "modifier_option_ingredients" USING btree ("option_id","ingredient_id");