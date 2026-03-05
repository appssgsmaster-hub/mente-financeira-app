import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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

  if (user.subscriptionStatus === "active") {
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
      const updated = await storage.updateAccountPercentages(req.session.userId!, input.updates);
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

  app.get("/api/stripe/publishable-key", requireAuth, async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar chave Stripe" });
    }
  });

  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

      const stripe = await getUncachableStripeClient();
      const { priceId, mode } = req.body;

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
      const checkoutMode = mode === 'payment' ? 'payment' : 'subscription';

      const sessionConfig: any = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: checkoutMode,
        success_url: checkoutMode === 'payment'
          ? `${baseUrl}/mentoria/boas-vindas?status=success`
          : `${baseUrl}/planos?status=success`,
        cancel_url: `${baseUrl}/planos?status=cancel`,
      };

      if (checkoutMode === 'payment') {
        sessionConfig.payment_intent_data = {
          metadata: { userId: String(user.id), type: 'mentoria' },
        };
      }

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

  app.post("/api/stripe/webhook-subscription", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.stripeCustomerId) return res.json({ subscription: null });

      const stripe = await getUncachableStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'canceled';
        await storage.updateUser(user.id, {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: status,
        });
        return res.json({ subscription: sub, status });
      }

      res.json({ subscription: null });
    } catch (err) {
      console.error("Subscription check error:", err);
      res.json({ subscription: null });
    }
  });

  return httpServer;
}
