CREATE TABLE "delivery_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"city" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value" numeric(14, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"effective_date" date NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT 'Caracas' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_usd" numeric(14, 2) NOT NULL,
	"subtotal_usd" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"total_usd" numeric(14, 2) NOT NULL,
	"total_bs" numeric(14, 2) NOT NULL,
	"exchange_rate" numeric(14, 4) NOT NULL,
	"delivery_city" text DEFAULT 'Barinas' NOT NULL,
	"pickup_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_receiver_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank" text NOT NULL,
	"phone" text NOT NULL,
	"identity_number" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"qr_image_data" text,
	"qr_sha256" text,
	"allow_clipboard_copy" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"bank" text NOT NULL,
	"identity_number" text NOT NULL,
	"reference" text NOT NULL,
	"phone" text NOT NULL,
	"amount_bs" numeric(14, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_usd" numeric(14, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"condition" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"is_master" boolean DEFAULT false NOT NULL,
	"merchant_id" uuid,
	"wallet_balance_bs" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_locations_state_city_unique" ON "delivery_locations" USING btree ("state","city");--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_effective_date_unique" ON "exchange_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "orders_customer_id_status_idx" ON "orders" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_unique" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_sku_unique" ON "products" USING btree ("merchant_id","sku");--> statement-breakpoint
CREATE INDEX "products_category_is_visible_idx" ON "products" USING btree ("category","is_visible");