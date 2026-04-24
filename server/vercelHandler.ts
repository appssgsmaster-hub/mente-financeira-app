import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { WebhookHandlers } from "./webhookHandlers";

const { Pool } = pkg;
const PgStore = connectPgSimple(session);
const app = express();

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

// Build a pg Pool with sensible Vercel-compatible defaults.
// Neon (the DB Replit uses) requires SSL; set rejectUnauthorized: false
// to accept Neon's managed certificate.
// connectionTimeoutMillis prevents the Lambda from hanging forever on a
// bad/missing DATABASE_URL and hitting Vercel's invocation timeout.
const dbPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 3,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    })
  : null;

// Prevent unhandled pool errors from crashing the Lambda process.
if (dbPool) {
  dbPool.on("error", (err) => {
    console.error("[vercel] pg pool error:", err.message);
  });
}

// Build the session store. If DATABASE_URL is absent fall back to
// MemoryStore so the Lambda at least starts up and returns meaningful
// error messages instead of crashing.
let sessionStore: session.Store;
if (dbPool) {
  const pgStore = new PgStore({ pool: dbPool, createTableIfMissing: true });
  // connect-pg-simple emits errors asynchronously — catch them so Node
  // doesn't treat them as unhandled rejections (process crash on Node 15+).
  (pgStore as any).on?.("error", (err: Error) => {
    console.error("[vercel] session store error:", err.message);
  });
  sessionStore = pgStore;
} else {
  console.warn(
    "[vercel] DATABASE_URL not set — using MemoryStore (sessions will not persist across Lambda restarts)"
  );
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

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
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
  try {
    await ensureInitialized();
  } catch (err: any) {
    console.error("[vercel] Initialization failed:", err.message);
    initPromise = null;
    res.status(500).json({ message: "Server initialization failed: " + err.message });
    return;
  }
  return app(req, res);
}
