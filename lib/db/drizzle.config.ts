import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "./src/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
  },
});
