import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
const { Pool } = pkg;
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { WebhookHandlers } from "./webhookHandlers";

const PgStore = connectPgSimple(session);
const app = express();

// Trust Vercel's proxy so req.protocol returns "https" and cookies work correctly
app.set("trust proxy", 1);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        return res.status(500).json({ error: "Webhook processing error" });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Parse the DATABASE_URL and build pg connection options that work with Neon.
// Neon URLs look like: postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require
// We strip the sslmode query param and handle SSL ourselves to avoid conflicts.
function buildPoolConfig(url: string) {
  try {
    // Remove params pg doesn't understand — sslmode, ssl, channel_binding
    const cleanUrl = url
      .replace(/[?&]sslmode=[^&]*/g, "")
      .replace(/[?&]ssl=[^&]*/g, "")
      .replace(/[?&]channel_binding=[^&]*/g, "")
      .replace(/\?&/, "?")
      .replace(/\?$/, "")
      .replace(/&&/g, "&");
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    return {
      connectionString: cleanUrl,
      max: 3,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 20000,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString: url, max: 3, connectionTimeoutMillis: 30000 };
  }
}

const rawDatabaseUrl = process.env.DATABASE_URL;
const dbPool = rawDatabaseUrl ? new Pool(buildPoolConfig(rawDatabaseUrl)) : null;

if (dbPool) {
  dbPool.on("error", (err) => {
    console.error("[vercel] pg pool error:", err.message);
  });
}

let sessionStore: session.Store;
if (dbPool) {
  const pgStore = new PgStore({ pool: dbPool, createTableIfMissing: true });
  (pgStore as any).on?.("error", (err: Error) => {
    console.error("[vercel] session store error:", err.message);
  });
  sessionStore = pgStore;
} else {
  console.warn("[vercel] DATABASE_URL not set — using MemoryStore");
  sessionStore = new session.MemoryStore();
}

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

let initPromise: Promise<void> | null = null;

async function runStartupMigrations(): Promise<void> {
  if (!dbPool) return;
  const migrations = [
    // Added 2025 — account_type for multi-mode users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal'`,
    // Added 2025 — per-account custom description
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS description TEXT`,
    // Added 2025 — per-user expense categories
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'personal',
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  ];
  for (const sql of migrations) {
    try {
      await dbPool.query(sql);
    } catch (err: any) {
      // Non-fatal — log and continue so the server still starts
      console.warn("[vercel] startup migration skipped:", err.message);
    }
  }
  console.log("[vercel] startup migrations complete");
}

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await runStartupMigrations();
      const httpServer = createServer(app);
      await registerRoutes(httpServer, app);
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
    })();
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  // Health check: respond directly without going through ensureInitialized,
  // so it always works even if routes fail to register.
  if (req.url === "/api/health" || req.url?.startsWith("/api/health?")) {
    const dbUrl = rawDatabaseUrl;
    const info: Record<string, unknown> = {
      DATABASE_URL: dbUrl ? `set (${dbUrl.substring(0, 20)}...)` : "MISSING",
      SESSION_SECRET: process.env.SESSION_SECRET ? "set" : "MISSING",
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "set" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || "not set",
      nodeVersion: process.version,
      dbPoolAvailable: !!dbPool,
    };
    if (dbPool) {
      try {
        const result = await dbPool.query("SELECT NOW() AS now, current_database() AS db, version() AS ver");
        info.dbConnected = true;
        info.dbTime = result.rows[0].now;
        info.dbName = result.rows[0].db;
        info.dbVersion = result.rows[0].ver?.split(" ").slice(0, 2).join(" ");
      } catch (err: any) {
        info.dbConnected = false;
        info.dbError = err.message;
        info.dbErrorCode = err.code;
      }
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok", ...info }, null, 2));
    return;
  }

  try {
    await ensureInitialized();
  } catch (err: any) {
    console.error("[vercel] Initialization failed:", err.message, err.stack);
    initPromise = null;
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 500;
    res.end(JSON.stringify({ message: "Server initialization failed", detail: err.message }));
    return;
  }
  return app(req, res);
}
