import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] WARNING: DATABASE_URL is not set — database queries will fail");
}

const sql = neon(connectionString!);
export const db = drizzle(sql, { schema });
