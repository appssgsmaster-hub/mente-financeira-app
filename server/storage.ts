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

async function computeDerivedBalances(userId: number, userAccounts: Account[]): Promise<Account[]> {
  const userTxs = await db.select().from(transactions).where(eq(transactions.userId, userId));

  if (userTxs.length === 0) {
    return userAccounts.map(a => ({ ...a, balance: 0 }));
  }

  const allocResult = await db.execute(
    sql`SELECT ta.transaction_id, ta.account_id, ta.amount
        FROM transaction_allocations ta
        INNER JOIN transactions t ON t.id = ta.transaction_id
        WHERE t.user_id = ${userId}`
  );

  const allocsByTxId = new Map<number, Map<number, number>>();
  for (const row of allocResult.rows as any[]) {
    const txId = Number(row.transaction_id);
    if (!allocsByTxId.has(txId)) allocsByTxId.set(txId, new Map());
    allocsByTxId.get(txId)!.set(Number(row.account_id), Number(row.amount));
  }

  // Collect income transactions that have no allocations — backfill them now
  const missingAllocs: { transactionId: number; accountId: number; amount: number }[] = [];
  const incomeTxs = userTxs.filter(t => t.type === 'income');
  for (const tx of incomeTxs) {
    if (!allocsByTxId.has(tx.id)) {
      const shares = distributeWithLargestRemainder(tx.amount, userAccounts);
      for (const s of shares) {
        if (!allocsByTxId.has(tx.id)) allocsByTxId.set(tx.id, new Map());
        allocsByTxId.get(tx.id)!.set(s.id, s.share);
        missingAllocs.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
      }
    }
  }
  // Persist missing allocations in the background (fire-and-forget, non-blocking)
  if (missingAllocs.length > 0) {
    console.log(`[computeDerivedBalances] backfilling ${missingAllocs.length} alocações em falta para userId=${userId}`);
    db.insert(transactionAllocations).values(missingAllocs).catch(err =>
      console.error('[computeDerivedBalances] erro ao persistir alocações:', err)
    );
  }

  const balanceMap = new Map<number, number>(userAccounts.map(a => [a.id, 0]));

  for (const tx of userTxs) {
    if (tx.type === 'income') {
      const allocations = allocsByTxId.get(tx.id);
      if (allocations) {
        for (const [accountId, amount] of allocations) {
          if (balanceMap.has(accountId)) {
            balanceMap.set(accountId, (balanceMap.get(accountId) || 0) + amount);
          }
        }
      }
    } else if (tx.type === 'expense' && tx.accountId) {
      if (balanceMap.has(tx.accountId)) {
        balanceMap.set(tx.accountId, (balanceMap.get(tx.accountId) || 0) - tx.amount);
      }
    }
  }

  const result = userAccounts.map(a => ({ ...a, balance: balanceMap.get(a.id) ?? 0 }));

  // Consistency audit: sum(balances) must equal totalIncome - totalExpense
  const ecosystemTotal = result.reduce((s, a) => s + a.balance, 0);
  const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
  const totalExpense = userTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expected = totalIncome - totalExpense;
  const diff = ecosystemTotal - expected;
  if (Math.abs(diff) > 0) {
    console.error(`[AUDIT] INCONSISTÊNCIA DETECTADA userId=${userId}: soma_contas=${ecosystemTotal} esperado=${expected} diferença=${diff}`);
  }

  return result;
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
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
    if (userAccounts.length === 0) return [];
    return computeDerivedBalances(userId, userAccounts);
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

    const updatedRaw: Account[] = [];
    for (const update of updates) {
      const [acc] = await db.update(accounts)
        .set({ percentage: update.percentage })
        .where(and(eq(accounts.id, update.id), eq(accounts.userId, userId)))
        .returning();
      if (acc) updatedRaw.push(acc);
    }

    if (redistribute) {
      const incomeTxs = await db.select().from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.type, 'income')));
      if (incomeTxs.length > 0) {
        for (const tx of incomeTxs) {
          await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, tx.id));
        }
        const newAllocs: { transactionId: number; accountId: number; amount: number }[] = [];
        for (const tx of incomeTxs) {
          const shares = distributeWithLargestRemainder(tx.amount, updatedRaw);
          for (const s of shares) newAllocs.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
        }
        if (newAllocs.length > 0) await db.insert(transactionAllocations).values(newAllocs);
      }
    }

    return computeDerivedBalances(userId, updatedRaw);
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(transaction).returning();
    // Auto-create allocations for income transactions so balances are always consistent
    if (newTx.type === 'income') {
      const rawAccounts = await db.select().from(accounts).where(eq(accounts.userId, newTx.userId));
      if (rawAccounts.length > 0) {
        const shares = distributeWithLargestRemainder(newTx.amount, rawAccounts);
        if (shares.length > 0) {
          await db.insert(transactionAllocations).values(
            shares.map(s => ({ transactionId: newTx.id, accountId: s.id, amount: s.share }))
          );
        }
      }
    }
    return newTx;
  }

  async distributeIncome(userId: number, request: DistributeIncomeRequest, date?: Date): Promise<{ transaction: Transaction; updatedAccounts: Account[] }> {
    const rawAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
    const txValues: any = {
      userId,
      description: request.description,
      amount: request.amount,
      type: 'income',
      isRecurring: false,
    };
    if (date) txValues.date = date;
    const [newTx] = await db.insert(transactions).values(txValues).returning();

    const shares = distributeWithLargestRemainder(request.amount, rawAccounts);
    console.log(`[distributeIncome] entrada=${request.amount} cents partilhas=${JSON.stringify(shares)}`);

    if (shares.length > 0) {
      await db.insert(transactionAllocations).values(
        shares.map(s => ({ transactionId: newTx.id, accountId: s.id, amount: s.share }))
      );
    }

    const updatedAccounts = await computeDerivedBalances(userId, rawAccounts);
    return { transaction: newTx, updatedAccounts };
  }

  async deleteTransaction(id: number): Promise<void> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!tx) throw new Error("Transação não encontrada");
    await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, id));
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

    if (data.amount !== undefined && data.amount !== oldTx.amount && oldTx.type === 'income') {
      const rawAccounts = await db.select().from(accounts).where(eq(accounts.userId, oldTx.userId));
      await db.delete(transactionAllocations).where(eq(transactionAllocations.transactionId, id));
      const newShares = distributeWithLargestRemainder(data.amount, rawAccounts);
      if (newShares.length > 0) {
        await db.insert(transactionAllocations).values(
          newShares.map(s => ({ transactionId: id, accountId: s.id, amount: s.share }))
        );
      }
      console.log(`[updateTransaction] entrada editada: novo_valor=${data.amount} partilhas=${JSON.stringify(newShares)}`);
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
    await db.execute(
      sql`DELETE FROM transaction_allocations WHERE transaction_id IN (
            SELECT id FROM transactions WHERE user_id = ${userId}
          )`
    );
    await db.delete(transactions).where(eq(transactions.userId, userId));
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
    const rawAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
    if (rawAccounts.length === 0) return [];

    const incomeTxs = await db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'income')))
      .orderBy(asc(transactions.date));

    const existingAllocResult = await db.execute(
      sql`SELECT ta.transaction_id FROM transaction_allocations ta
          JOIN transactions t ON t.id = ta.transaction_id
          WHERE t.user_id = ${userId} GROUP BY ta.transaction_id`
    );
    const txsWithAllocations = new Set((existingAllocResult.rows as any[]).map(r => Number(r.transaction_id)));

    const newAllocs: { transactionId: number; accountId: number; amount: number }[] = [];
    for (const tx of incomeTxs) {
      if (!txsWithAllocations.has(tx.id)) {
        const shares = distributeWithLargestRemainder(tx.amount, rawAccounts);
        for (const s of shares) newAllocs.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
      }
    }
    if (newAllocs.length > 0) {
      console.log(`[recalculate] criando ${newAllocs.length} alocações em falta`);
      await db.insert(transactionAllocations).values(newAllocs);
    }

    const result = await computeDerivedBalances(userId, rawAccounts);
    const ecosystemTotal = result.reduce((sum, a) => sum + a.balance, 0);
    const incomeTotal = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
    const expenseTxs = await db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')));
    const expenseTotal = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
    console.log(`[recalculate] ecossistema=${ecosystemTotal} entradas=${incomeTotal} saídas=${expenseTotal} diff=${ecosystemTotal - (incomeTotal - expenseTotal)}`);
    return result;
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
