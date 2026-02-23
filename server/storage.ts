import { db } from "./db";
import {
  users, accounts, transactions,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type UpdateAccountPercentagesRequest,
  type DistributeIncomeRequest
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getAccounts(userId: number): Promise<Account[]>;
  updateAccountPercentages(userId: number, updates: UpdateAccountPercentagesRequest['updates']): Promise<Account[]>;
  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  distributeIncome(userId: number, request: DistributeIncomeRequest): Promise<{ transaction: Transaction; updatedAccounts: Account[] }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAccounts(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async updateAccountPercentages(userId: number, updates: UpdateAccountPercentagesRequest['updates']): Promise<Account[]> {
    // Validate sum is 100%
    const total = updates.reduce((sum, u) => sum + u.percentage, 0);
    if (total !== 100) {
      throw new Error("As porcentagens devem somar exatamente 100%.");
    }

    const updatedAccounts = [];
    for (const update of updates) {
      const [acc] = await db.update(accounts)
        .set({ percentage: update.percentage })
        .where(eq(accounts.id, update.id))
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
      // Deduct from account balance
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

  async distributeIncome(userId: number, request: DistributeIncomeRequest): Promise<{ transaction: Transaction; updatedAccounts: Account[] }> {
    const userAccounts = await this.getAccounts(userId);
    
    // Create the income transaction
    const [newTx] = await db.insert(transactions).values({
      userId,
      description: request.description,
      amount: request.amount,
      type: 'income',
      isRecurring: false
    }).returning();

    const updatedAccounts = [];
    
    // Distribute balance based on percentage
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
}

export const storage = new DatabaseStorage();
