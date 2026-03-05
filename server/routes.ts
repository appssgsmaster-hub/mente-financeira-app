import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  async function seedDatabase() {
    try {
      let user = await storage.getUser(1);
      if (!user) {
        const { db } = await import("./db");
        const { users, accounts } = await import("@shared/schema");
        const [newUser] = await db.insert(users).values({
          name: "Usuário Teste",
          email: "teste@sgsgroup.com",
          currency: "BRL"
        }).returning();
        user = newUser;
        const initialAccounts = [
          { name: "Vida Financeira PF", percentage: 50, color: "#4F46E5", userId: user.id, balance: 0 },
          { name: "Conta Operacional", percentage: 10, color: "#22C55E", userId: user.id, balance: 0 },
          { name: "Taxas & Obrigações", percentage: 10, color: "#EF4444", userId: user.id, balance: 0 },
          { name: "Conta de Oportunidades", percentage: 10, color: "#F59E0B", userId: user.id, balance: 0 },
          { name: "Lucro / Doação", percentage: 10, color: "#8B5CF6", userId: user.id, balance: 0 },
          { name: "Reserva / Estabilidade", percentage: 10, color: "#06B6D4", userId: user.id, balance: 0 },
        ];
        await db.insert(accounts).values(initialAccounts);
        await storage.distributeIncome(user.id, {
          amount: 1000000,
          description: "Saldo Inicial Distribuído"
        });
      }
    } catch (e) {
      console.error("Failed to seed database:", e);
    }
  }

  seedDatabase().catch(console.error);
  const DEMO_USER_ID = 1;

  app.get(api.user.get.path, async (req, res) => {
    const user = await storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  });

  app.get(api.accounts.list.path, async (req, res) => {
    const userAccounts = await storage.getAccounts(DEMO_USER_ID);
    res.json(userAccounts);
  });

  app.post(api.accounts.updatePercentages.path, async (req, res) => {
    try {
      const input = api.accounts.updatePercentages.input.parse(req.body);
      const updated = await storage.updateAccountPercentages(DEMO_USER_ID, input.updates);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get(api.transactions.list.path, async (req, res) => {
    const userTransactions = await storage.getTransactions(DEMO_USER_ID);
    res.json(userTransactions);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = req.body;
      input.userId = DEMO_USER_ID;
      const newTx = await storage.createTransaction(input);
      res.status(201).json(newTx);
    } catch (err) {
      res.status(400).json({ message: "Erro ao criar transação" });
    }
  });

  app.post(api.transactions.distributeIncome.path, async (req, res) => {
    try {
      const input = req.body;
      const result = await storage.distributeIncome(DEMO_USER_ID, input);
      res.json(result);
    } catch (err) {
      res.status(400).json({ message: "Erro ao distribuir entrada" });
    }
  });

  app.patch(api.transactions.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateTransaction(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  app.delete(api.transactions.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransaction(id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: "Transação não encontrada" });
    }
  });

  return httpServer;
}
