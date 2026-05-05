import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] WARNING: DATABASE_URL is not set — database queries will fail");
}

// Neon auto-suspends compute after inactivity and can take up to ~10s to wake up.
// We use a generous connectionTimeoutMillis so the first post-sleep query succeeds.
export const pool = new Pool({
  connectionString,
  max: 3,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 20000,
  ssl: connectionString && !connectionString.includes("localhost")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  console.error("[db] pool error:", err.message);
});

export const db = drizzle(pool, { schema });

// Warm up the Neon compute endpoint so the first user request doesn't timeout.
// Called once at server startup — errors are non-fatal.
export async function warmUpDb(): Promise<void> {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    console.log(`[db] ✓ DB warm-up OK (${Date.now() - start}ms)`);
  } catch (err: any) {
    console.warn("[db] DB warm-up failed (non-fatal):", err.message);
  }
}
