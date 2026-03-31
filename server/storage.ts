import { db } from "./db";
import {
  users, accounts, transactions, transactionAllocations, commitments, debts,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type Commitment, type InsertCommitment,
  type Debt, type InsertDebt,
  type UpdateAccountPercentagesRequest,
  type DistributeIncomeRequest
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

function distributeWithLargestRemainder(
  amount: number,
  accountsWithPercentages: { id: number; percentage: number }[]
): { id: number; share: number }[] {
  const shares = accountsWithPercentages.map(a => {
    const exact = amount * (a.percentage / 100);
    const floored = Math.floor(exact);
    return { id: a.id, share: floored, remainder: exact - floored };
  });

  let leftover = amount - shares.reduce((s, x) => s + x.share, 0);

  shares
    .map((s, i) => ({ i, remainder: s.remainder }))
    .sort((a, b) => b.remainder - a.remainder)
    .forEach(({ i }) => {
      if (leftover <= 0) return;
      shares[i].share += 1;
      leftover -= 1;
    });

  return shares.map(s => ({ id: s.id, share: s.share }));
}

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
  getCommitments(userId: number): Promise<Commitment[]>;
  createCommitment(data: InsertCommitment): Promise<Commitment>;
  updateCommitment(userId: number, id: number, data: Partial<Commitment>): Promise<Commitment>;
  deleteCommitment(userId: number, id: number): Promise<void>;
  getDebts(userId: number): Promise<Debt[]>;
  createDebt(data: InsertDebt): Promise<Debt>;
  updateDebt(userId: number, id: number, data: Partial<Debt>): Promise<Debt>;
  deleteDebt(userId: number, id: number): Promise<void>;
  getStripeProduct(productId: string): Promise<any>;
  getStripeSubscription(subscriptionId: string): Promise<any>;
  listStripeProductsWithPrices(): Promise<any[]>;
  recalculateAccountBalances(userId: number): Promise<Account[]>;
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
    trialEnd.setDate(trialEnd.getDate() + 7);

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

    const shares = distributeWithLargestRemainder(request.amount, userAccounts);

    console.log(`[distributeIncome] entrada=${request.amount} cents (€${(request.amount/100).toFixed(2)})`);

    if (shares.length > 0) {
      await db.insert(transactionAllocations).values(
        shares.map(s => ({ transactionId: newTx.id, accountId: s.id, amount: s.share }))
      );
    }

    const updatedAccounts = [];
    for (const s of shares) {
      const acc = userAccounts.find(a => a.id === s.id)!;
      const [updated] = await db.update(accounts)
        .set({ balance: acc.balance + s.share })
        .where(eq(accounts.id, s.id))
        .returning();
      if (updated) {
        console.log(`  conta=${acc.name} share=${s.share} cents novo_saldo=${updated.balance}`);
        updatedAccounts.push(updated);
      }
    }

    const totalDistributed = shares.reduce((sum, s) => sum + s.share, 0);
    console.log(`[distributeIncome] total_distribuído=${totalDistributed} ecossistema_total=${updatedAccounts.reduce((s, a) => s + a.balance, 0)}`);
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
        console.log(`[deleteTransaction] saída revertida: conta=${acc.name} +${tx.amount}`);
      }
    } else if (tx.type === 'income') {
      const storedAllocations = await db.select().from(transactionAllocations)
        .where(eq(transactionAllocations.transactionId, id));

      if (storedAllocations.length > 0) {
        for (const alloc of storedAllocations) {
          const [acc] = await db.select().from(accounts).where(eq(accounts.id, alloc.accountId));
          if (acc) {
            await db.update(accounts)
              .set({ balance: acc.balance - alloc.amount })
              .where(eq(accounts.id, alloc.accountId));
            console.log(`[deleteTransaction] entrada revertida (alocação): conta=${acc.name} -${alloc.amount}`);
          }
        }
      } else {
        const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, tx.userId));
        const shares = distributeWithLargestRemainder(tx.amount, userAccounts);
        for (const s of shares) {
          const acc = userAccounts.find(a => a.id === s.id)!;
          await db.update(accounts)
            .set({ balance: acc.balance - s.share })
            .where(eq(accounts.id, s.id));
          console.log(`[deleteTransaction] entrada revertida (recálculo): conta=${acc.name} -${s.share}`);
        }
      }

      await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, id));
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

    if (data.amount !== undefined && data.amount !== oldTx.amount) {
      if (oldTx.type === 'expense' && oldTx.accountId) {
        const [acc] = await db.select().from(accounts).where(eq(accounts.id, oldTx.accountId));
        if (acc) {
          const diff = data.amount - oldTx.amount;
          await db.update(accounts)
            .set({ balance: acc.balance - diff })
            .where(eq(accounts.id, oldTx.accountId));
          console.log(`[updateTransaction] saída editada: conta_id=${oldTx.accountId} diff=${diff}`);
        }
      } else if (oldTx.type === 'income') {
        const storedAllocations = await db.select().from(transactionAllocations)
          .where(eq(transactionAllocations.transactionId, id));
        const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, oldTx.userId));

        if (storedAllocations.length > 0) {
          for (const alloc of storedAllocations) {
            const acc = userAccounts.find(a => a.id === alloc.accountId);
            if (acc) {
              await db.update(accounts)
                .set({ balance: acc.balance - alloc.amount })
                .where(eq(accounts.id, alloc.accountId));
            }
          }
          await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, id));
        } else {
          const oldShares = distributeWithLargestRemainder(oldTx.amount, userAccounts);
          for (const s of oldShares) {
            const acc = userAccounts.find(a => a.id === s.id)!;
            await db.update(accounts)
              .set({ balance: acc.balance - s.share })
              .where(eq(accounts.id, s.id));
          }
        }

        const refreshedAccounts = await db.select().from(accounts).where(eq(accounts.userId, oldTx.userId));
        const newShares = distributeWithLargestRemainder(data.amount, refreshedAccounts);
        await db.insert(transactionAllocations).values(
          newShares.map(s => ({ transactionId: id, accountId: s.id, amount: s.share }))
        );
        for (const s of newShares) {
          const acc = refreshedAccounts.find(a => a.id === s.id)!;
          await db.update(accounts)
            .set({ balance: acc.balance + s.share })
            .where(eq(accounts.id, s.id));
          console.log(`[updateTransaction] entrada editada: conta=${acc.name} novo_share=${s.share}`);
        }
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
    const txIds = await db.select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.accountId, id));
    if (txIds.length > 0) {
      for (const { id: txId } of txIds) {
        await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, txId));
      }
    }
    await db.delete(transactionAllocations).where(eq(transactionAllocations.accountId, id));
    await db.delete(transactions).where(eq(transactions.accountId, id));
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  async resetAllData(userId: number): Promise<void> {
    const txIds = await db.select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, userId));
    if (txIds.length > 0) {
      for (const { id: txId } of txIds) {
        await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, txId));
      }
    }
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.update(accounts)
      .set({ balance: 0 })
      .where(eq(accounts.userId, userId));
  }

  async getCommitments(userId: number): Promise<Commitment[]> {
    return await db.select().from(commitments)
      .where(eq(commitments.userId, userId))
      .orderBy(desc(commitments.createdAt));
  }

  async createCommitment(data: InsertCommitment): Promise<Commitment> {
    const [c] = await db.insert(commitments).values(data).returning();
    return c;
  }

  async updateCommitment(userId: number, id: number, data: Partial<Commitment>): Promise<Commitment> {
    const [existing] = await db.select().from(commitments).where(eq(commitments.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Compromisso não encontrado");
    const [updated] = await db.update(commitments)
      .set(data)
      .where(eq(commitments.id, id))
      .returning();
    return updated;
  }

  async deleteCommitment(userId: number, id: number): Promise<void> {
    const [existing] = await db.select().from(commitments).where(eq(commitments.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Compromisso não encontrado");
    await db.delete(commitments).where(eq(commitments.id, id));
  }

  async getDebts(userId: number): Promise<Debt[]> {
    return await db.select().from(debts)
      .where(eq(debts.userId, userId))
      .orderBy(desc(debts.createdAt));
  }

  async createDebt(data: InsertDebt): Promise<Debt> {
    const [d] = await db.insert(debts).values(data).returning();
    return d;
  }

  async updateDebt(userId: number, id: number, data: Partial<Debt>): Promise<Debt> {
    const [existing] = await db.select().from(debts).where(eq(debts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Dívida não encontrada");
    const [updated] = await db.update(debts)
      .set(data)
      .where(eq(debts.id, id))
      .returning();
    return updated;
  }

  async deleteDebt(userId: number, id: number): Promise<void> {
    const [existing] = await db.select().from(debts).where(eq(debts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Dívida não encontrada");
    await db.delete(debts).where(eq(debts.id, id));
  }

  async recalculateAccountBalances(userId: number): Promise<Account[]> {
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
    const balanceMap = new Map<number, number>(userAccounts.map(a => [a.id, 0]));

    const userTransactions = await db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(asc(transactions.date));

    const existingAllocations = await db.execute(
      sql`SELECT ta.* FROM transaction_allocations ta
          JOIN transactions t ON t.id = ta.transaction_id
          WHERE t.user_id = ${userId}`
    );
    const allocsByTxId = new Map<number, { accountId: number; amount: number }[]>();
    for (const row of existingAllocations.rows as any[]) {
      const txId = row.transaction_id;
      if (!allocsByTxId.has(txId)) allocsByTxId.set(txId, []);
      allocsByTxId.get(txId)!.push({ accountId: row.account_id, amount: row.amount });
    }

    const newAllocationsToInsert: { transactionId: number; accountId: number; amount: number }[] = [];

    for (const tx of userTransactions) {
      if (tx.type === 'income') {
        const existingAlloc = allocsByTxId.get(tx.id);
        if (existingAlloc && existingAlloc.length > 0) {
          for (const alloc of existingAlloc) {
            if (balanceMap.has(alloc.accountId)) {
              balanceMap.set(alloc.accountId, (balanceMap.get(alloc.accountId) || 0) + alloc.amount);
            }
          }
        } else {
          const shares = distributeWithLargestRemainder(tx.amount, userAccounts);
          for (const s of shares) {
            balanceMap.set(s.id, (balanceMap.get(s.id) || 0) + s.share);
            newAllocationsToInsert.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
          }
        }
      } else if (tx.type === 'expense' && tx.accountId) {
        if (balanceMap.has(tx.accountId)) {
          balanceMap.set(tx.accountId, (balanceMap.get(tx.accountId) || 0) - tx.amount);
        }
      }
    }

    if (newAllocationsToInsert.length > 0) {
      await db.insert(transactionAllocations).values(newAllocationsToInsert);
    }

    const updatedAccounts: Account[] = [];
    for (const acc of userAccounts) {
      const newBalance = balanceMap.get(acc.id) ?? 0;
      const [updated] = await db.update(accounts)
        .set({ balance: newBalance })
        .where(eq(accounts.id, acc.id))
        .returning();
      if (updated) {
        console.log(`[recalculate] conta=${acc.name} saldo_antigo=${acc.balance} saldo_novo=${newBalance}`);
        updatedAccounts.push(updated);
      }
    }

    const ecosystemTotal = updatedAccounts.reduce((sum, a) => sum + a.balance, 0);
    const incomeTotal = userTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = userTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    console.log(`[recalculate] ecossistema=${ecosystemTotal} entradas=${incomeTotal} saídas=${expenseTotal} diff=${ecosystemTotal - (incomeTotal - expenseTotal)}`);

    return updatedAccounts;
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
