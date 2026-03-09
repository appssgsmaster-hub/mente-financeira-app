import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerSchema, loginSchema, insertCommitmentSchema, insertDebtSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendPasswordResetEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
}

async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Usuário não encontrado" });
  }

  if (user.subscriptionStatus === "active" || (user.planTier && user.planTier !== "free")) {
    return next();
  }

  if (user.subscriptionStatus === "trial") {
    if (user.trialEndDate && new Date(user.trialEndDate) > new Date()) {
      return next();
    }
    await storage.updateUser(user.id, { subscriptionStatus: "trial_expired" });
    return res.status(403).json({ message: "Período de teste expirado", code: "TRIAL_EXPIRED" });
  }

  return res.status(403).json({ message: "Assinatura inativa", code: "SUBSCRIPTION_INACTIVE" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Este email já está cadastrado" });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash,
      });

      await storage.seedDefaultAccounts(user.id);

      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro no login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Erro ao sair" });
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ ok: true });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        resetToken: token,
        resetTokenExpiry: expiry,
      });

      const domains = process.env.REPLIT_DOMAINS;
      const baseUrl = domains
        ? `https://${domains.split(",")[0]}`
        : `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(user.email, user.name, resetUrl);

      res.json({ ok: true });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Erro ao processar solicitação" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: "Token e senha (mín. 6 caracteres) são obrigatórios" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Link expirado ou inválido. Solicite um novo." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    if (user.subscriptionStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) <= new Date()) {
      await storage.updateUser(user.id, { subscriptionStatus: "trial_expired" });
      user.subscriptionStatus = "trial_expired";
    }

    if (user.stripeCustomerId && (user.planTier === "free" || user.subscriptionStatus === "trial" || user.subscriptionStatus === "trial_expired")) {
      try {
        const stripe = await getUncachableStripeClient();
        const PRICE_TO_TIER: Record<string, string> = {
          'price_1T7u82Fmxmf4g4Sf6Gib2xs3': 'app',
          'price_1T7uAiFmxmf4g4Sf0I2xPZoM': 'method',
          'price_1T7uCTFmxmf4g4Sfkh9uIlYm': 'mentoria',
        };
        const tierHierarchy: Record<string, number> = { free: 0, app: 1, method: 2, mentoria: 3 };

        const sessions = await stripe.checkout.sessions.list({
          customer: user.stripeCustomerId,
          limit: 10,
        });

        let highestTier = user.planTier || 'free';
        let highestLevel = tierHierarchy[highestTier] || 0;

        for (const session of sessions.data) {
          if (session.payment_status !== 'paid') continue;
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
          for (const item of lineItems.data) {
            const priceId = item.price?.id;
            if (priceId && PRICE_TO_TIER[priceId]) {
              const itemTier = PRICE_TO_TIER[priceId];
              const itemLevel = tierHierarchy[itemTier] || 0;
              if (itemLevel > highestLevel) {
                highestTier = itemTier;
                highestLevel = itemLevel;
              }
            }
          }
        }

        if (highestLevel > (tierHierarchy[user.planTier] || 0)) {
          await storage.updateUser(user.id, {
            subscriptionStatus: 'active',
            planTier: highestTier,
          });
          user.planTier = highestTier;
          user.subscriptionStatus = 'active';
        }
      } catch (syncErr) {
        console.error("Auto-sync plan error:", syncErr);
      }
    }

    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get(api.user.get.path, requireActiveSubscription, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.patch(api.user.update.path, requireActiveSubscription, async (req, res) => {
    try {
      const { currency } = req.body;
      const updated = await storage.updateUserCurrency(req.session.userId!, currency);
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get(api.accounts.list.path, requireActiveSubscription, async (req, res) => {
    const userAccounts = await storage.getAccounts(req.session.userId!);
    res.json(userAccounts);
  });

  app.post(api.accounts.list.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = req.body;
      input.userId = req.session.userId!;
      const newAccount = await storage.createAccount(input);
      res.status(201).json(newAccount);
    } catch (err) {
      res.status(400).json({ message: "Erro ao criar conta" });
    }
  });

  app.patch("/api/accounts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAccountForUser(req.session.userId!, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: "Conta não encontrada" });
    }
  });

  app.delete("/api/accounts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccountForUser(req.session.userId!, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: "Conta não encontrada" });
    }
  });

  app.post(api.accounts.updatePercentages.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = api.accounts.updatePercentages.input.parse(req.body);
      const redistribute = req.body.redistribute === true;
      const updated = await storage.updateAccountPercentages(req.session.userId!, input.updates, redistribute);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get(api.transactions.list.path, requireActiveSubscription, async (req, res) => {
    const userTransactions = await storage.getTransactions(req.session.userId!);
    res.json(userTransactions);
  });

  app.post(api.transactions.create.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = req.body;
      input.userId = req.session.userId!;
      if (input.date) {
        input.date = new Date(input.date);
      }
      const newTx = await storage.createTransaction(input);
      res.status(201).json(newTx);
    } catch (err) {
      res.status(400).json({ message: "Erro ao criar transação" });
    }
  });

  app.post(api.transactions.distributeIncome.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = req.body;
      const date = input.date ? new Date(input.date) : undefined;
      const result = await storage.distributeIncome(req.session.userId!, { amount: input.amount, description: input.description }, date);
      res.json(result);
    } catch (err) {
      res.status(400).json({ message: "Erro ao distribuir entrada" });
    }
  });

  app.patch(api.transactions.update.path, requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateTransactionForUser(req.session.userId!, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  app.delete(api.transactions.delete.path, requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransactionForUser(req.session.userId!, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: "Transação não encontrada" });
    }
  });

  app.post(api.transactions.reset.path, requireActiveSubscription, async (req, res) => {
    try {
      await storage.resetAllData(req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Erro ao resetar dados" });
    }
  });

  app.get("/api/commitments", requireActiveSubscription, async (req, res) => {
    const items = await storage.getCommitments(req.session.userId!);
    res.json(items);
  });

  app.post("/api/commitments", requireActiveSubscription, async (req, res) => {
    try {
      const parsed = insertCommitmentSchema.parse({ ...req.body, userId: req.session.userId! });
      const c = await storage.createCommitment(parsed);
      res.status(201).json(c);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.patch("/api/commitments/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCommitment(req.session.userId!, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/commitments/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCommitment(req.session.userId!, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  app.get("/api/debts", requireActiveSubscription, async (req, res) => {
    const items = await storage.getDebts(req.session.userId!);
    res.json(items);
  });

  app.post("/api/debts", requireActiveSubscription, async (req, res) => {
    try {
      const parsed = insertDebtSchema.parse({ ...req.body, userId: req.session.userId! });
      const d = await storage.createDebt(parsed);
      res.status(201).json(d);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.patch("/api/debts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateDebt(req.session.userId!, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/debts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDebt(req.session.userId!, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  app.get("/api/stripe/publishable-key", requireAuth, async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar chave Stripe" });
    }
  });

  const TIER_TO_PRICE: Record<string, string> = {
    app: 'price_1T7u82Fmxmf4g4Sf6Gib2xs3',
    method: 'price_1T7uAiFmxmf4g4Sf0I2xPZoM',
    mentoria: 'price_1T7uCTFmxmf4g4Sfkh9uIlYm',
  };

  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

      const { planTier } = req.body;
      const priceId = TIER_TO_PRICE[planTier];
      if (!priceId) {
        return res.status(400).json({ message: "Plano inválido" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const successUrl = planTier === 'mentoria'
        ? `${baseUrl}/mentoria/boas-vindas?status=success&tier=${planTier}`
        : `${baseUrl}/?status=success&tier=${planTier}`;

      const sessionConfig: any = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: `${baseUrl}/planos?status=cancel`,
        payment_intent_data: {
          metadata: { userId: String(user.id), planTier: planTier },
        },
      };

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Erro ao criar sessão de pagamento" });
    }
  });

  app.post("/api/stripe/create-portal", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "Nenhuma assinatura encontrada" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/planos`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Portal error:", err);
      res.status(500).json({ message: "Erro ao abrir portal" });
    }
  });

  app.get("/api/stripe/products", async (req, res) => {
    try {
      const rows = await storage.listStripeProductsWithPrices();

      const productsMap = new Map();
      for (const row of rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unitAmount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }

      res.json(Array.from(productsMap.values()));
    } catch (err) {
      console.error("Products error:", err);
      res.json([]);
    }
  });

  const PRICE_TO_TIER: Record<string, string> = {
    'price_1T7u82Fmxmf4g4Sf6Gib2xs3': 'app',
    'price_1T7uAiFmxmf4g4Sf0I2xPZoM': 'method',
    'price_1T7uCTFmxmf4g4Sfkh9uIlYm': 'mentoria',
  };

  app.post("/api/stripe/sync-purchase", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.stripeCustomerId) return res.json({ status: null });

      const stripe = await getUncachableStripeClient();
      const tierHierarchy: Record<string, number> = { free: 0, app: 1, method: 2, mentoria: 3 };

      const sessions = await stripe.checkout.sessions.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });

      let highestTier = user.planTier || 'free';
      let highestLevel = tierHierarchy[highestTier] || 0;

      for (const session of sessions.data) {
        if (session.payment_status !== 'paid') continue;

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          if (priceId && PRICE_TO_TIER[priceId]) {
            const itemTier = PRICE_TO_TIER[priceId];
            const itemLevel = tierHierarchy[itemTier] || 0;
            if (itemLevel > highestLevel) {
              highestTier = itemTier;
              highestLevel = itemLevel;
            }
          }
        }
      }

      if (highestLevel > (tierHierarchy[user.planTier] || 0)) {
        await storage.updateUser(user.id, {
          subscriptionStatus: 'active',
          planTier: highestTier,
        });
        return res.json({ status: 'active', planTier: highestTier });
      }

      if (highestLevel > 0 && user.subscriptionStatus !== 'active') {
        await storage.updateUser(user.id, { subscriptionStatus: 'active' });
      }

      res.json({ status: highestLevel > 0 ? 'active' : null, planTier: highestTier });
    } catch (err) {
      console.error("Purchase sync error:", err);
      res.json({ status: null });
    }
  });

  return httpServer;
}
