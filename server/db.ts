import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] WARNING: DATABASE_URL is not set — database queries will fail");
}

const pool = new Pool({ connectionString: connectionString! });
export const db = drizzle(pool, { schema });
