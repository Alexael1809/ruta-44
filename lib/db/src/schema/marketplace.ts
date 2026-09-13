import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"),
  isMaster: boolean("is_master").notNull().default(false),
  merchantId: uuid("merchant_id"),
  walletBalanceBs: numeric("wallet_balance_bs", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const merchantsTable = pgTable("merchants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull().default("Caracas"),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exchangeRatesTable = pgTable("exchange_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  value: numeric("value", { precision: 14, scale: 4, mode: "number" }).notNull(),
  currency: text("currency").notNull().default("USD"),
  effectiveDate: date("effective_date", { mode: "string" }).notNull(),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  effectiveDateUnique: uniqueIndex("exchange_rates_effective_date_unique").on(table.effectiveDate),
}));

export const productsTable = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: uuid("merchant_id").notNull(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  priceUsd: numeric("price_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
  isVisible: boolean("is_visible").notNull().default(true),
  condition: text("condition").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  merchantSkuUnique: uniqueIndex("products_merchant_sku_unique").on(table.merchantId, table.sku),
}));

export const ordersTable = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: text("customer_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  status: text("status").notNull().default("pending_payment"),
  totalUsd: numeric("total_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
  totalBs: numeric("total_bs", { precision: 14, scale: 2, mode: "number" }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 4, mode: "number" }).notNull(),
  deliveryCity: text("delivery_city").notNull().default("Barinas"),
  pickupNotes: text("pickup_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceUsd: numeric("unit_price_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
  subtotalUsd: numeric("subtotal_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
});

export const paymentsTable = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull(),
  bank: text("bank").notNull(),
  identityNumber: text("identity_number").notNull(),
  reference: text("reference").notNull(),
  phone: text("phone").notNull(),
  amountBs: numeric("amount_bs", { precision: 14, scale: 2, mode: "number" }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  referenceUnique: uniqueIndex("payments_reference_unique").on(table.reference),
}));

export const paymentReceiverSettingsTable = pgTable("payment_receiver_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bank: text("bank").notNull(),
  phone: text("phone").notNull(),
  identityNumber: text("identity_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deliveryLocationsTable = pgTable("delivery_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: text("state").notNull(),
  city: text("city").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  stateCityUnique: uniqueIndex("delivery_locations_state_city_unique").on(table.state, table.city),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });
export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({ id: true, createdAt: true });
export const insertExchangeRateSchema = createInsertSchema(exchangeRatesTable).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export const insertPaymentReceiverSettingsSchema = createInsertSchema(paymentReceiverSettingsTable).omit({ id: true, updatedAt: true });
export const insertDeliveryLocationSchema = createInsertSchema(deliveryLocationsTable).omit({ id: true, createdAt: true });

export type User = typeof usersTable.$inferSelect;
export type Merchant = typeof merchantsTable.$inferSelect;
export type ExchangeRate = typeof exchangeRatesTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type PaymentReceiverSettings = typeof paymentReceiverSettingsTable.$inferSelect;
export type DeliveryLocation = typeof deliveryLocationsTable.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;