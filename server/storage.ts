import { db } from "./db";
import {
  users, accounts, transactions,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type UpdateAccountPercentagesRequest,
  type DistributeIncomeRequest
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(data: { name: string; email: string; passwordHash: string }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  getAccounts(userId: number): Promise<Account[]>;
  updateAccountPercentages(userId: number, updates: UpdateAccountPercentagesRequest['updates']): Promise<Account[]>;
  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  distributeIncome(userId: number, request: DistributeIncomeRequest): Promise<{ transaction: Transaction; updatedAccounts: Account[] }>;
  deleteTransaction(id: number): Promise<void>;
  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction>;
  updateUserCurrency(id: number, currency: string): Promise<User>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, data: Partial<Account>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;
  resetAllData(userId: number): Promise<void>;
  seedDefaultAccounts(userId: number): Promise<void>;
  getStripeProduct(productId: string): Promise<any>;
  getStripeSubscription(subscriptionId: string): Promise<any>;
  listStripeProductsWithPrices(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async createUser(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15);

    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      currency: "BRL",
      trialEndDate: trialEnd,
      subscriptionStatus: "trial",
    }).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updated] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new Error("Usuário não encontrado");
    return updated;
  }

  async seedDefaultAccounts(userId: number): Promise<void> {
    const initialAccounts = [
      { name: "Vida Financeira PF", percentage: 50, color: "#4F46E5", userId, balance: 0 },
      { name: "Conta Operacional", percentage: 10, color: "#22C55E", userId, balance: 0 },
      { name: "Taxas & Obrigações", percentage: 10, color: "#EF4444", userId, balance: 0 },
      { name: "Conta de Oportunidades", percentage: 10, color: "#F59E0B", userId, balance: 0 },
      { name: "Lucro / Doação", percentage: 10, color: "#8B5CF6", userId, balance: 0 },
      { name: "Reserva / Estabilidade", percentage: 10, color: "#06B6D4", userId, balance: 0 },
    ];
    await db.insert(accounts).values(initialAccounts);
  }

  async getAccounts(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async updateAccountPercentages(userId: number, updates: UpdateAccountPercentagesRequest['updates'], redistribute: boolean = false): Promise<Account[]> {
    const total = updates.reduce((sum, u) => sum + u.percentage, 0);
    if (total !== 100) {
      throw new Error("As porcentagens devem somar exatamente 100%.");
    }

    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
    const validIds = new Set(userAccounts.map(a => a.id));
    for (const update of updates) {
      if (!validIds.has(update.id)) {
        throw new Error("Conta não pertence ao utilizador.");
      }
    }

    if (redistribute) {
      const totalBalance = userAccounts.reduce((sum, a) => sum + a.balance, 0);

      const shares = updates.map(u => ({
        ...u,
        exact: totalBalance * (u.percentage / 100),
        floored: Math.floor(totalBalance * (u.percentage / 100)),
      }));
      shares.forEach(s => { s.exact = s.exact - s.floored; });
      let remainder = totalBalance - shares.reduce((sum, s) => sum + s.floored, 0);
      const byRemainder = [...shares].sort((a, b) => b.exact - a.exact);
      for (const s of byRemainder) {
        if (remainder <= 0) break;
        s.floored += 1;
        remainder -= 1;
      }

      const updatedAccounts = [];
      for (const share of shares) {
        const [acc] = await db.update(accounts)
          .set({ percentage: share.percentage, balance: share.floored })
          .where(and(eq(accounts.id, share.id), eq(accounts.userId, userId)))
          .returning();
        if (acc) updatedAccounts.push(acc);
      }
      return updatedAccounts;
    }

    const updatedAccounts = [];
    for (const update of updates) {
      const [acc] = await db.update(accounts)
        .set({ percentage: update.percentage })
        .where(and(eq(accounts.id, update.id), eq(accounts.userId, userId)))
        .returning();
      if (acc) updatedAccounts.push(acc);
    }
    return updatedAccounts;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    if (transaction.type === 'expense' && transaction.accountId) {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, transaction.accountId));
      if (account) {
        await db.update(accounts)
          .set({ balance: account.balance - transaction.amount })
          .where(eq(accounts.id, transaction.accountId));
      }
    }
    const [newTx] = await db.insert(transactions).values(transaction).returning();
    return newTx;
  }

  async distributeIncome(userId: number, request: DistributeIncomeRequest, date?: Date): Promise<{ transaction: Transaction; updatedAccounts: Account[] }> {
    const userAccounts = await this.getAccounts(userId);
    const txValues: any = {
      userId,
      description: request.description,
      amount: request.amount,
      type: 'income',
      isRecurring: false,
    };
    if (date) txValues.date = date;
    const [newTx] = await db.insert(transactions).values(txValues).returning();

    const updatedAccounts = [];
    for (const acc of userAccounts) {
      const share = Math.floor(request.amount * (acc.percentage / 100));
      const [updated] = await db.update(accounts)
        .set({ balance: acc.balance + share })
        .where(eq(accounts.id, acc.id))
        .returning();
      if (updated) updatedAccounts.push(updated);
    }
    return { transaction: newTx, updatedAccounts };
  }

  async deleteTransaction(id: number): Promise<void> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!tx) throw new Error("Transação não encontrada");

    if (tx.type === 'expense' && tx.accountId) {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, tx.accountId));
      if (acc) {
        await db.update(accounts)
          .set({ balance: acc.balance + tx.amount })
          .where(eq(accounts.id, tx.accountId));
      }
    } else if (tx.type === 'income') {
      const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, tx.userId));
      for (const acc of userAccounts) {
        const share = Math.floor(tx.amount * (acc.percentage / 100));
        await db.update(accounts)
          .set({ balance: acc.balance - share })
          .where(eq(accounts.id, acc.id));
      }
    }
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async updateTransactionForUser(userId: number, id: number, data: Partial<Transaction>): Promise<Transaction> {
    const [oldTx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!oldTx || oldTx.userId !== userId) throw new Error("Transação não encontrada");
    return this.updateTransaction(id, data);
  }

  async deleteTransactionForUser(userId: number, id: number): Promise<void> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!tx || tx.userId !== userId) throw new Error("Transação não encontrada");
    return this.deleteTransaction(id);
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    const [oldTx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!oldTx) throw new Error("Transação não encontrada");

    if (data.amount !== undefined && data.amount !== oldTx.amount && oldTx.type === 'expense' && oldTx.accountId) {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, oldTx.accountId));
      if (acc) {
        const diff = data.amount - oldTx.amount;
        await db.update(accounts)
          .set({ balance: acc.balance - diff })
          .where(eq(accounts.id, oldTx.accountId));
      }
    }

    const [updated] = await db.update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async updateUserCurrency(id: number, currency: string): Promise<User> {
    const [updated] = await db.update(users)
      .set({ currency })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new Error("Usuário não encontrado");
    return updated;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccountForUser(userId: number, id: number, data: Partial<Account>): Promise<Account> {
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Conta não encontrada");
    const [updated] = await db.update(accounts)
      .set(data)
      .where(eq(accounts.id, id))
      .returning();
    return updated;
  }

  async deleteAccountForUser(userId: number, id: number): Promise<void> {
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Conta não encontrada");
    await db.delete(transactions).where(eq(transactions.accountId, id));
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    const [updated] = await db.update(accounts)
      .set(data)
      .where(eq(accounts.id, id))
      .returning();
    if (!updated) throw new Error("Conta não encontrada");
    return updated;
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.accountId, id));
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  async resetAllData(userId: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.update(accounts)
      .set({ balance: 0 })
      .where(eq(accounts.userId, userId));
  }

  async getStripeProduct(productId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async getStripeSubscription(subscriptionId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async listStripeProductsWithPrices(): Promise<any[]> {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
