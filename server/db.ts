import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] WARNING: DATABASE_URL is not set — database queries will fail");
}

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 5,
  ssl: connectionString && !connectionString.includes("localhost")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Prevent unhandled pool errors from crashing the process.
pool.on("error", (err) => {
  console.error("[db] pool error:", err.message);
});

export const db = drizzle(pool, { schema });
