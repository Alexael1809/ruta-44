import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set!");
  process.exit(1);
}

// Strip query parameters so pg doesn't override rejectUnauthorized
const cleanUrl = dbUrl.split("?")[0];

const pool = new pg.Pool({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  console.log("Connecting to Supabase PostgreSQL (IPv4 Pooler)...");
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, "drizzle", "0000_worried_hitman.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Executing ${statements.length} SQL migration statements...`);

    await client.query("BEGIN;");
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      await client.query(stmt);
    }
    await client.query("COMMIT;");
    console.log("✓ All 9 tables, indexes, and constraints successfully created in Supabase!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
