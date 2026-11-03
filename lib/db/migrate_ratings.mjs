import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set!");
  process.exit(1);
}

const cleanUrl = dbUrl.split("?")[0];
const pool = new pg.Pool({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Creating order_ratings table in Supabase...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "order_ratings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "target_type" text NOT NULL,
        "from_user_id" text NOT NULL,
        "to_merchant_id" uuid,
        "to_customer_id" text,
        "score" integer NOT NULL CHECK ("score" >= 1 AND "score" <= 5),
        "comment" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "order_ratings_order_target_unique" 
        ON "order_ratings"("order_id", "target_type");

      CREATE INDEX IF NOT EXISTS "order_ratings_merchant_idx" 
        ON "order_ratings"("to_merchant_id");

      CREATE INDEX IF NOT EXISTS "order_ratings_customer_idx" 
        ON "order_ratings"("to_customer_id");
    `);
    console.log("✓ order_ratings table and indexes successfully created in Supabase!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
