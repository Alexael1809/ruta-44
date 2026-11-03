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
    console.log("Creating part_requests table in Supabase...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "part_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_name" text NOT NULL,
        "contact_phone" text NOT NULL,
        "part_description" text NOT NULL,
        "motorcycle_model" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS "part_requests_status_created_at_idx" 
        ON "part_requests"("status", "created_at");
    `);
    console.log("✓ part_requests table and index successfully created in Supabase!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
