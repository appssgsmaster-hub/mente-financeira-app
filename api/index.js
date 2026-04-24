"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/vercelHandler.ts
var vercelHandler_exports = {};
__export(vercelHandler_exports, {
  default: () => handler
});
module.exports = __toCommonJS(vercelHandler_exports);
var import_express = __toESM(require("express"), 1);
var import_express_session = __toESM(require("express-session"), 1);
var import_connect_pg_simple = __toESM(require("connect-pg-simple"), 1);
var import_http = require("http");

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  commitments: () => commitments,
  debts: () => debts,
  insertAccountSchema: () => insertAccountSchema,
  insertCommitmentSchema: () => insertCommitmentSchema,
  insertDebtSchema: () => insertDebtSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  registerSchema: () => registerSchema,
  transactionAllocations: () => transactionAllocations,
  transactions: () => transactions,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var import_zod = require("zod");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  passwordHash: (0, import_pg_core.text)("password_hash").notNull(),
  currency: (0, import_pg_core.text)("currency").notNull().default("EUR"),
  trialStartDate: (0, import_pg_core.timestamp)("trial_start_date").notNull().defaultNow(),
  trialEndDate: (0, import_pg_core.timestamp)("trial_end_date"),
  stripeCustomerId: (0, import_pg_core.text)("stripe_customer_id"),
  stripeSubscriptionId: (0, import_pg_core.text)("stripe_subscription_id"),
  subscriptionStatus: (0, import_pg_core.text)("subscription_status").notNull().default("trial"),
  planTier: (0, import_pg_core.text)("plan_tier").notNull().default("free"),
  resetToken: (0, import_pg_core.text)("reset_token"),
  resetTokenExpiry: (0, import_pg_core.timestamp)("reset_token_expiry"),
  trialExpiredEmailSent: (0, import_pg_core.boolean)("trial_expired_email_sent").notNull().default(false),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
});
var accounts = (0, import_pg_core.pgTable)("accounts", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  percentage: (0, import_pg_core.integer)("percentage").notNull(),
  balance: (0, import_pg_core.integer)("balance").notNull().default(0),
  color: (0, import_pg_core.text)("color").notNull()
});
var transactions = (0, import_pg_core.pgTable)("transactions", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").notNull(),
  accountId: (0, import_pg_core.integer)("account_id"),
  description: (0, import_pg_core.text)("description").notNull(),
  amount: (0, import_pg_core.integer)("amount").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  date: (0, import_pg_core.timestamp)("date").notNull().defaultNow(),
  isRecurring: (0, import_pg_core.boolean)("is_recurring").default(false),
  category: (0, import_pg_core.text)("category")
});
var commitments = (0, import_pg_core.pgTable)("commitments", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").notNull(),
  accountId: (0, import_pg_core.integer)("account_id"),
  description: (0, import_pg_core.text)("description").notNull(),
  value: (0, import_pg_core.integer)("value").notNull(),
  startDate: (0, import_pg_core.text)("start_date").notNull(),
  dueDate: (0, import_pg_core.text)("due_date"),
  recurrence: (0, import_pg_core.text)("recurrence").notNull(),
  installments: (0, import_pg_core.integer)("installments"),
  category: (0, import_pg_core.text)("category").notNull(),
  commitmentType: (0, import_pg_core.text)("commitment_type").notNull().default("expense"),
  paidPeriods: (0, import_pg_core.text)("paid_periods").array().default([]),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
  // Future fields (structure only — not implemented yet):
  // status: text("status").default("pendente"),      // "pendente" | "pago" | "atrasado"
  // paymentDate: text("payment_date"),               // data em que foi efetivamente pago
});
var transactionAllocations = (0, import_pg_core.pgTable)("transaction_allocations", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  transactionId: (0, import_pg_core.integer)("transaction_id").notNull(),
  accountId: (0, import_pg_core.integer)("account_id").notNull(),
  amount: (0, import_pg_core.integer)("amount").notNull()
});
var debts = (0, import_pg_core.pgTable)("debts", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").notNull(),
  creditor: (0, import_pg_core.text)("creditor").notNull(),
  amount: (0, import_pg_core.integer)("amount").notNull(),
  registeredDate: (0, import_pg_core.text)("registered_date").notNull(),
  priority: (0, import_pg_core.text)("priority").notNull().default("medium"),
  paid: (0, import_pg_core.boolean)("paid").notNull().default(false),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
});
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).omit({ id: true, createdAt: true, trialStartDate: true });
var insertAccountSchema = (0, import_drizzle_zod.createInsertSchema)(accounts).omit({ id: true });
var insertTransactionSchema = (0, import_drizzle_zod.createInsertSchema)(transactions).omit({ id: true, date: true }).extend({
  amount: import_zod.z.number(),
  accountId: import_zod.z.number().optional().nullable()
});
var insertCommitmentSchema = (0, import_drizzle_zod.createInsertSchema)(commitments).omit({ id: true, createdAt: true });
var insertDebtSchema = (0, import_drizzle_zod.createInsertSchema)(debts).omit({ id: true, createdAt: true });
var registerSchema = import_zod.z.object({
  name: import_zod.z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: import_zod.z.string().email("Email inv\xE1lido"),
  password: import_zod.z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});
var loginSchema = import_zod.z.object({
  email: import_zod.z.string().email("Email inv\xE1lido"),
  password: import_zod.z.string().min(1, "Senha \xE9 obrigat\xF3ria")
});

// server/db.ts
var { Pool } = import_pg.default;
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] WARNING: DATABASE_URL is not set \u2014 database queries will fail");
}
var pool = new Pool({ connectionString });
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/storage.ts
var import_drizzle_orm = require("drizzle-orm");
function distributeWithLargestRemainder(amount, accountsWithPercentages) {
  const shares = accountsWithPercentages.map((a) => {
    const exact = amount * (a.percentage / 100);
    const floored = Math.floor(exact);
    return { id: a.id, share: floored, remainder: exact - floored };
  });
  let leftover = amount - shares.reduce((s, x) => s + x.share, 0);
  shares.map((s, i) => ({ i, remainder: s.remainder })).sort((a, b) => b.remainder - a.remainder).forEach(({ i }) => {
    if (leftover <= 0) return;
    shares[i].share += 1;
    leftover -= 1;
  });
  return shares.map((s) => ({ id: s.id, share: s.share }));
}
async function computeDerivedBalances(userId, userAccounts) {
  const userTxs = await db.select().from(transactions).where((0, import_drizzle_orm.eq)(transactions.userId, userId));
  if (userTxs.length === 0) {
    return userAccounts.map((a) => ({ ...a, balance: 0 }));
  }
  const allocResult = await db.execute(
    import_drizzle_orm.sql`SELECT ta.transaction_id, ta.account_id, ta.amount
        FROM transaction_allocations ta
        INNER JOIN transactions t ON t.id = ta.transaction_id
        WHERE t.user_id = ${userId}`
  );
  const allocsByTxId = /* @__PURE__ */ new Map();
  for (const row of allocResult.rows) {
    const txId = Number(row.transaction_id);
    if (!allocsByTxId.has(txId)) allocsByTxId.set(txId, /* @__PURE__ */ new Map());
    allocsByTxId.get(txId).set(Number(row.account_id), Number(row.amount));
  }
  const missingAllocs = [];
  const incomeTxs = userTxs.filter((t) => t.type === "income");
  for (const tx of incomeTxs) {
    if (!allocsByTxId.has(tx.id)) {
      const shares = distributeWithLargestRemainder(tx.amount, userAccounts);
      for (const s of shares) {
        if (!allocsByTxId.has(tx.id)) allocsByTxId.set(tx.id, /* @__PURE__ */ new Map());
        allocsByTxId.get(tx.id).set(s.id, s.share);
        missingAllocs.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
      }
    }
  }
  if (missingAllocs.length > 0) {
    console.log(`[computeDerivedBalances] backfilling ${missingAllocs.length} aloca\xE7\xF5es em falta para userId=${userId}`);
    db.insert(transactionAllocations).values(missingAllocs).catch(
      (err) => console.error("[computeDerivedBalances] erro ao persistir aloca\xE7\xF5es:", err)
    );
  }
  const balanceMap = new Map(userAccounts.map((a) => [a.id, 0]));
  for (const tx of userTxs) {
    if (tx.type === "income") {
      const allocations = allocsByTxId.get(tx.id);
      if (allocations) {
        for (const [accountId, amount] of allocations) {
          if (balanceMap.has(accountId)) {
            balanceMap.set(accountId, (balanceMap.get(accountId) || 0) + amount);
          }
        }
      }
    } else if (tx.type === "expense" && tx.accountId) {
      if (balanceMap.has(tx.accountId)) {
        balanceMap.set(tx.accountId, (balanceMap.get(tx.accountId) || 0) - tx.amount);
      }
    }
  }
  const result = userAccounts.map((a) => ({ ...a, balance: balanceMap.get(a.id) ?? 0 }));
  const ecosystemTotal = result.reduce((s, a) => s + a.balance, 0);
  const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
  const totalExpense = userTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const expected = totalIncome - totalExpense;
  const diff = ecosystemTotal - expected;
  if (Math.abs(diff) > 0) {
    console.error(`[AUDIT] INCONSIST\xCANCIA DETECTADA userId=${userId}: soma_contas=${ecosystemTotal} esperado=${expected} diferen\xE7a=${diff}`);
  }
  return result;
}
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.email, email.toLowerCase()));
    return user;
  }
  async getUserByResetToken(token) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.resetToken, token));
    return user;
  }
  async createUser(data) {
    const trialEnd = /* @__PURE__ */ new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      currency: "BRL",
      trialEndDate: trialEnd,
      subscriptionStatus: "trial"
    }).returning();
    return user;
  }
  async updateUser(id, data) {
    const [updated] = await db.update(users).set(data).where((0, import_drizzle_orm.eq)(users.id, id)).returning();
    if (!updated) throw new Error("Usu\xE1rio n\xE3o encontrado");
    return updated;
  }
  async seedDefaultAccounts(userId) {
    const initialAccounts = [
      { name: "Vida Financeira PF", percentage: 50, color: "#4F46E5", userId, balance: 0 },
      { name: "Conta Operacional", percentage: 10, color: "#22C55E", userId, balance: 0 },
      { name: "Taxas & Obriga\xE7\xF5es", percentage: 10, color: "#EF4444", userId, balance: 0 },
      { name: "Conta de Oportunidades", percentage: 10, color: "#F59E0B", userId, balance: 0 },
      { name: "Lucro / Doa\xE7\xE3o", percentage: 10, color: "#8B5CF6", userId, balance: 0 },
      { name: "Reserva / Estabilidade", percentage: 10, color: "#06B6D4", userId, balance: 0 }
    ];
    await db.insert(accounts).values(initialAccounts);
  }
  async getAccounts(userId) {
    const userAccounts = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.userId, userId));
    if (userAccounts.length === 0) return [];
    return computeDerivedBalances(userId, userAccounts);
  }
  async updateAccountPercentages(userId, updates, redistribute = false) {
    const total = updates.reduce((sum, u) => sum + u.percentage, 0);
    if (total !== 100) {
      throw new Error("As porcentagens devem somar exatamente 100%.");
    }
    const userAccounts = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.userId, userId));
    const validIds = new Set(userAccounts.map((a) => a.id));
    for (const update of updates) {
      if (!validIds.has(update.id)) {
        throw new Error("Conta n\xE3o pertence ao utilizador.");
      }
    }
    const updatedRaw = [];
    for (const update of updates) {
      const [acc] = await db.update(accounts).set({ percentage: update.percentage }).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(accounts.id, update.id), (0, import_drizzle_orm.eq)(accounts.userId, userId))).returning();
      if (acc) updatedRaw.push(acc);
    }
    if (redistribute) {
      const incomeTxs = await db.select().from(transactions).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(transactions.userId, userId), (0, import_drizzle_orm.eq)(transactions.type, "income")));
      if (incomeTxs.length > 0) {
        for (const tx of incomeTxs) {
          await db.delete(transactionAllocations).where((0, import_drizzle_orm.eq)(transactionAllocations.transactionId, tx.id));
        }
        const newAllocs = [];
        for (const tx of incomeTxs) {
          const shares = distributeWithLargestRemainder(tx.amount, updatedRaw);
          for (const s of shares) newAllocs.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
        }
        if (newAllocs.length > 0) await db.insert(transactionAllocations).values(newAllocs);
      }
    }
    return computeDerivedBalances(userId, updatedRaw);
  }
  async getTransactions(userId) {
    return await db.select().from(transactions).where((0, import_drizzle_orm.eq)(transactions.userId, userId)).orderBy((0, import_drizzle_orm.desc)(transactions.date));
  }
  async createTransaction(transaction) {
    const [newTx] = await db.insert(transactions).values(transaction).returning();
    if (newTx.type === "income") {
      const rawAccounts = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.userId, newTx.userId));
      if (rawAccounts.length > 0) {
        const shares = distributeWithLargestRemainder(newTx.amount, rawAccounts);
        if (shares.length > 0) {
          await db.insert(transactionAllocations).values(
            shares.map((s) => ({ transactionId: newTx.id, accountId: s.id, amount: s.share }))
          );
        }
      }
    }
    return newTx;
  }
  async distributeIncome(userId, request, date) {
    const rawAccounts = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.userId, userId));
    const txValues = {
      userId,
      description: request.description,
      amount: request.amount,
      type: "income",
      isRecurring: false
    };
    if (date) txValues.date = date;
    const [newTx] = await db.insert(transactions).values(txValues).returning();
    const shares = distributeWithLargestRemainder(request.amount, rawAccounts);
    console.log(`[distributeIncome] entrada=${request.amount} cents partilhas=${JSON.stringify(shares)}`);
    if (shares.length > 0) {
      await db.insert(transactionAllocations).values(
        shares.map((s) => ({ transactionId: newTx.id, accountId: s.id, amount: s.share }))
      );
    }
    const updatedAccounts = await computeDerivedBalances(userId, rawAccounts);
    return { transaction: newTx, updatedAccounts };
  }
  async deleteTransaction(id) {
    const [tx] = await db.select().from(transactions).where((0, import_drizzle_orm.eq)(transactions.id, id));
    if (!tx) throw new Error("Transa\xE7\xE3o n\xE3o encontrada");
    await db.delete(transactionAllocations).where((0, import_drizzle_orm.eq)(transactionAllocations.transactionId, id));
    await db.delete(transactions).where((0, import_drizzle_orm.eq)(transactions.id, id));
  }
  async updateTransactionForUser(userId, id, data) {
    const [oldTx] = await db.select().from(transactions).where((0, import_drizzle_orm.eq)(transactions.id, id));
    if (!oldTx || oldTx.userId !== userId) throw new Error("Transa\xE7\xE3o n\xE3o encontrada");
    return this.updateTransaction(id, data);
  }
  async deleteTransactionForUser(userId, id) {
    const [tx] = await db.select().from(transactions).where((0, import_drizzle_orm.eq)(transactions.id, id));
    if (!tx || tx.userId !== userId) throw new Error("Transa\xE7\xE3o n\xE3o encontrada");
    return this.deleteTransaction(id);
  }
  async updateTransaction(id, data) {
    const [oldTx] = await db.select().from(transactions).where((0, import_drizzle_orm.eq)(transactions.id, id));
    if (!oldTx) throw new Error("Transa\xE7\xE3o n\xE3o encontrada");
    if (data.amount !== void 0 && data.amount !== oldTx.amount && oldTx.type === "income") {
      const rawAccounts = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.userId, oldTx.userId));
      await db.delete(transactionAllocations).where((0, import_drizzle_orm.eq)(transactionAllocations.transactionId, id));
      const newShares = distributeWithLargestRemainder(data.amount, rawAccounts);
      if (newShares.length > 0) {
        await db.insert(transactionAllocations).values(
          newShares.map((s) => ({ transactionId: id, accountId: s.id, amount: s.share }))
        );
      }
      console.log(`[updateTransaction] entrada editada: novo_valor=${data.amount} partilhas=${JSON.stringify(newShares)}`);
    }
    const [updated] = await db.update(transactions).set(data).where((0, import_drizzle_orm.eq)(transactions.id, id)).returning();
    return updated;
  }
  async updateUserCurrency(id, currency) {
    const [updated] = await db.update(users).set({ currency }).where((0, import_drizzle_orm.eq)(users.id, id)).returning();
    if (!updated) throw new Error("Usu\xE1rio n\xE3o encontrado");
    return updated;
  }
  async createAccount(account) {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }
  async updateAccountForUser(userId, id, data) {
    const [existing] = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Conta n\xE3o encontrada");
    const [updated] = await db.update(accounts).set(data).where((0, import_drizzle_orm.eq)(accounts.id, id)).returning();
    return updated;
  }
  async deleteAccountForUser(userId, id) {
    const [existing] = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Conta n\xE3o encontrada");
    await db.delete(transactions).where((0, import_drizzle_orm.eq)(transactions.accountId, id));
    await db.delete(accounts).where((0, import_drizzle_orm.eq)(accounts.id, id));
  }
  async updateAccount(id, data) {
    const [updated] = await db.update(accounts).set(data).where((0, import_drizzle_orm.eq)(accounts.id, id)).returning();
    if (!updated) throw new Error("Conta n\xE3o encontrada");
    return updated;
  }
  async deleteAccount(id) {
    const txIds = await db.select({ id: transactions.id }).from(transactions).where((0, import_drizzle_orm.eq)(transactions.accountId, id));
    if (txIds.length > 0) {
      for (const { id: txId } of txIds) {
        await db.delete(transactionAllocations).where((0, import_drizzle_orm.eq)(transactionAllocations.transactionId, txId));
      }
    }
    await db.delete(transactionAllocations).where((0, import_drizzle_orm.eq)(transactionAllocations.accountId, id));
    await db.delete(transactions).where((0, import_drizzle_orm.eq)(transactions.accountId, id));
    await db.delete(accounts).where((0, import_drizzle_orm.eq)(accounts.id, id));
  }
  async resetAllData(userId) {
    await db.execute(
      import_drizzle_orm.sql`DELETE FROM transaction_allocations WHERE transaction_id IN (
            SELECT id FROM transactions WHERE user_id = ${userId}
          )`
    );
    await db.delete(transactions).where((0, import_drizzle_orm.eq)(transactions.userId, userId));
  }
  async getCommitments(userId) {
    return await db.select().from(commitments).where((0, import_drizzle_orm.eq)(commitments.userId, userId)).orderBy((0, import_drizzle_orm.desc)(commitments.createdAt));
  }
  async createCommitment(data) {
    const [c] = await db.insert(commitments).values(data).returning();
    return c;
  }
  async updateCommitment(userId, id, data) {
    const [existing] = await db.select().from(commitments).where((0, import_drizzle_orm.eq)(commitments.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Compromisso n\xE3o encontrado");
    const [updated] = await db.update(commitments).set(data).where((0, import_drizzle_orm.eq)(commitments.id, id)).returning();
    return updated;
  }
  async deleteCommitment(userId, id) {
    const [existing] = await db.select().from(commitments).where((0, import_drizzle_orm.eq)(commitments.id, id));
    if (!existing || existing.userId !== userId) throw new Error("Compromisso n\xE3o encontrado");
    await db.delete(commitments).where((0, import_drizzle_orm.eq)(commitments.id, id));
  }
  async getDebts(userId) {
    return await db.select().from(debts).where((0, import_drizzle_orm.eq)(debts.userId, userId)).orderBy((0, import_drizzle_orm.desc)(debts.createdAt));
  }
  async createDebt(data) {
    const [d] = await db.insert(debts).values(data).returning();
    return d;
  }
  async updateDebt(userId, id, data) {
    const [existing] = await db.select().from(debts).where((0, import_drizzle_orm.eq)(debts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("D\xEDvida n\xE3o encontrada");
    const [updated] = await db.update(debts).set(data).where((0, import_drizzle_orm.eq)(debts.id, id)).returning();
    return updated;
  }
  async deleteDebt(userId, id) {
    const [existing] = await db.select().from(debts).where((0, import_drizzle_orm.eq)(debts.id, id));
    if (!existing || existing.userId !== userId) throw new Error("D\xEDvida n\xE3o encontrada");
    await db.delete(debts).where((0, import_drizzle_orm.eq)(debts.id, id));
  }
  async recalculateAccountBalances(userId) {
    const rawAccounts = await db.select().from(accounts).where((0, import_drizzle_orm.eq)(accounts.userId, userId));
    if (rawAccounts.length === 0) return [];
    const incomeTxs = await db.select().from(transactions).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(transactions.userId, userId), (0, import_drizzle_orm.eq)(transactions.type, "income"))).orderBy((0, import_drizzle_orm.asc)(transactions.date));
    const existingAllocResult = await db.execute(
      import_drizzle_orm.sql`SELECT ta.transaction_id FROM transaction_allocations ta
          JOIN transactions t ON t.id = ta.transaction_id
          WHERE t.user_id = ${userId} GROUP BY ta.transaction_id`
    );
    const txsWithAllocations = new Set(existingAllocResult.rows.map((r) => Number(r.transaction_id)));
    const newAllocs = [];
    for (const tx of incomeTxs) {
      if (!txsWithAllocations.has(tx.id)) {
        const shares = distributeWithLargestRemainder(tx.amount, rawAccounts);
        for (const s of shares) newAllocs.push({ transactionId: tx.id, accountId: s.id, amount: s.share });
      }
    }
    if (newAllocs.length > 0) {
      console.log(`[recalculate] criando ${newAllocs.length} aloca\xE7\xF5es em falta`);
      await db.insert(transactionAllocations).values(newAllocs);
    }
    const result = await computeDerivedBalances(userId, rawAccounts);
    const ecosystemTotal = result.reduce((sum, a) => sum + a.balance, 0);
    const incomeTotal = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
    const expenseTxs = await db.select().from(transactions).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(transactions.userId, userId), (0, import_drizzle_orm.eq)(transactions.type, "expense")));
    const expenseTotal = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
    console.log(`[recalculate] ecossistema=${ecosystemTotal} entradas=${incomeTotal} sa\xEDdas=${expenseTotal} diff=${ecosystemTotal - (incomeTotal - expenseTotal)}`);
    return result;
  }
  async getStripeProduct(productId) {
    const result = await db.execute(
      import_drizzle_orm.sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }
  async getStripeSubscription(subscriptionId) {
    const result = await db.execute(
      import_drizzle_orm.sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }
  async listStripeProductsWithPrices() {
    const result = await db.execute(
      import_drizzle_orm.sql`
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
};
var storage = new DatabaseStorage();

// shared/routes.ts
var import_zod2 = require("zod");
var errorSchemas = {
  validation: import_zod2.z.object({ message: import_zod2.z.string(), field: import_zod2.z.string().optional() }),
  notFound: import_zod2.z.object({ message: import_zod2.z.string() }),
  internal: import_zod2.z.object({ message: import_zod2.z.string() })
};
var api = {
  user: {
    get: {
      method: "GET",
      path: "/api/user",
      responses: {
        200: import_zod2.z.custom(),
        404: errorSchemas.notFound
      }
    },
    update: {
      method: "PATCH",
      path: "/api/user",
      input: insertUserSchema.partial(),
      responses: {
        200: import_zod2.z.custom()
      }
    }
  },
  accounts: {
    list: {
      method: "GET",
      path: "/api/accounts",
      responses: {
        200: import_zod2.z.array(import_zod2.z.custom())
      }
    },
    updatePercentages: {
      method: "POST",
      path: "/api/accounts/percentages",
      input: import_zod2.z.object({
        updates: import_zod2.z.array(import_zod2.z.object({ id: import_zod2.z.number(), percentage: import_zod2.z.number() }))
      }),
      responses: {
        200: import_zod2.z.array(import_zod2.z.custom()),
        400: errorSchemas.validation
      }
    }
  },
  transactions: {
    list: {
      method: "GET",
      path: "/api/transactions",
      responses: {
        200: import_zod2.z.array(import_zod2.z.custom())
      }
    },
    create: {
      method: "POST",
      path: "/api/transactions",
      input: insertTransactionSchema,
      responses: {
        201: import_zod2.z.custom(),
        400: errorSchemas.validation
      }
    },
    update: {
      method: "PATCH",
      path: "/api/transactions/:id",
      input: insertTransactionSchema.partial(),
      responses: {
        200: import_zod2.z.custom(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound
      }
    },
    delete: {
      method: "DELETE",
      path: "/api/transactions/:id",
      responses: {
        200: import_zod2.z.object({ ok: import_zod2.z.literal(true) }),
        404: errorSchemas.notFound
      }
    },
    distributeIncome: {
      method: "POST",
      path: "/api/transactions/distribute",
      input: import_zod2.z.object({
        amount: import_zod2.z.number(),
        description: import_zod2.z.string()
      }),
      responses: {
        200: import_zod2.z.object({
          transaction: import_zod2.z.custom(),
          updatedAccounts: import_zod2.z.array(import_zod2.z.custom())
        })
      }
    },
    reset: {
      method: "POST",
      path: "/api/transactions/reset",
      responses: {
        200: import_zod2.z.object({ ok: import_zod2.z.literal(true) })
      }
    }
  }
};

// server/routes.ts
var import_zod3 = require("zod");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// server/stripeClient.ts
var import_stripe = __toESM(require("stripe"), 1);
var connectionSettings;
async function getCredentials() {
  if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!secretKey || !publishableKey) {
      throw new Error(
        "STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY must be set when running outside of Replit"
      );
    }
    return { secretKey, publishableKey };
  }
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const environments = isProduction ? ["production", "development"] : ["development"];
  for (const env of environments) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", connectorName);
    url.searchParams.set("environment", env);
    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "X-Replit-Token": xReplitToken
      }
    });
    const data = await response.json();
    connectionSettings = data.items?.[0];
    if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
      console.log(`Stripe connected via ${env} environment`);
      return {
        publishableKey: connectionSettings.settings.publishable,
        secretKey: connectionSettings.settings.secret
      };
    }
  }
  throw new Error("Stripe connection not found in any environment");
}
async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new import_stripe.default(secretKey, {
    apiVersion: "2025-08-27.basil"
  });
}
async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
var stripeSync = null;
async function getStripeSync() {
  if (!stripeSync) {
    if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
      throw new Error(
        "stripe-replit-sync is only available in the Replit environment. On Vercel, Stripe syncing is not supported."
      );
    }
    const { StripeSync } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL,
        max: 2
      },
      stripeSecretKey: secretKey
    });
  }
  return stripeSync;
}

// server/email.ts
var import_resend = require("resend");
var resend = new import_resend.Resend(process.env.RESEND_API_KEY);
var FROM_EMAIL = "Mente Financeira <onboarding@resend.dev>";
async function sendTrialExpiredEmail(to, name) {
  const plansUrl = "https://financial-prosperity.replit.app/planos";
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Seu per\xEDodo gratuito expirou \u2014 Mente Financeira",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 14px; margin-bottom: 12px;">
              <span style="color: white; font-weight: 800; font-size: 18px; letter-spacing: -1px;">MF</span>
            </div>
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 8px 0 0;">Mente Financeira</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Prosperar \xE9 Viver</p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Ol\xE1, <strong>${name}</strong>!</p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            O seu per\xEDodo de avalia\xE7\xE3o gratuita de <strong>7 dias</strong> do Mente Financeira chegou ao fim.
          </p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Esperamos que estes dias tenham sido \xFAteis para explorar o M\xE9todo das 6 Contas e dar os primeiros passos na sua transforma\xE7\xE3o financeira. \u{1F680}
          </p>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
              \u26A0\uFE0F O acesso \xE0s funcionalidades premium foi temporariamente suspenso. Escolha um plano para continuar a sua jornada.
            </p>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Os seus dados est\xE3o seguros e aguardam por si. Basta escolher um plano para retomar de onde parou:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${plansUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 14px 36px;
                      border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
              Ver Planos e Continuar \u2192
            </a>
          </div>

          <div style="background: #f0fdf4; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
            <p style="color: #166534; font-size: 13px; margin: 0 0 8px; font-weight: 600;">\u{1F3AF} Planos dispon\xEDveis:</p>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding: 0 0 0 20px; line-height: 2;">
              <li><strong>Mente Financeira App</strong> \u2014 \u20AC47 (pagamento \xFAnico)</li>
              <li><strong>M\xE9todo Mente Financeira</strong> \u2014 \u20AC197 (app + m\xE9todo completo)</li>
              <li><strong>Mentoria Transforma\xE7\xE3o</strong> \u2014 \u20AC697 (programa premium)</li>
            </ul>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

          <p style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
            SGS Group \u2014 Foco na Solu\xE7\xE3o<br/>
            Este \xE9 um email autom\xE1tico enviado uma \xFAnica vez. Por favor, n\xE3o responda.<br/>
            <a href="${plansUrl}" style="color: #4F46E5; text-decoration: none;">Aceder aos planos</a>
          </p>
        </div>
      </div>
    `
  });
  if (error) {
    console.error("Trial expired email send error:", error);
  }
  return data;
}
async function sendPasswordResetEmail(to, name, resetUrl) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Redefinir sua senha \u2014 Mente Financeira",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Mente Financeira</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Prosperar \xE9 Viver</p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Ol\xE1, <strong>${name}</strong>!</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Recebemos uma solicita\xE7\xE3o para redefinir a senha da sua conta. 
            Clique no bot\xE3o abaixo para criar uma nova senha:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #1a1a2e; color: white; padding: 14px 32px; 
                      border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Este link expira em <strong>1 hora</strong>. Se voc\xEA n\xE3o solicitou a redefini\xE7\xE3o de senha, 
            ignore este email \u2014 sua conta permanece segura.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            SGS Group \u2014 Foco na Solu\xE7\xE3o<br/>
            Este \xE9 um email autom\xE1tico, por favor n\xE3o responda.
          </p>
        </div>
      </div>
    `
  });
  if (error) {
    console.error("Email send error:", error);
    throw new Error("Erro ao enviar email de recupera\xE7\xE3o");
  }
  return data;
}

// server/routes.ts
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  next();
}
async function markTrialExpiredAndNotify(user) {
  await storage.updateUser(user.id, { subscriptionStatus: "trial_expired" });
  if (!user.trialExpiredEmailSent) {
    await storage.updateUser(user.id, { trialExpiredEmailSent: true });
    sendTrialExpiredEmail(user.email, user.name).catch((err) => {
      console.error("Failed to send trial expired email:", err);
    });
  }
}
async function requireActiveSubscription(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Usu\xE1rio n\xE3o encontrado" });
  }
  if (user.subscriptionStatus === "active" || user.planTier && user.planTier !== "free") {
    return next();
  }
  if (user.subscriptionStatus === "trial") {
    if (user.trialEndDate && new Date(user.trialEndDate) > /* @__PURE__ */ new Date()) {
      return next();
    }
    await markTrialExpiredAndNotify(user);
    return res.status(403).json({ message: "Per\xEDodo de teste expirou. Escolha um plano para continuar.", code: "TRIAL_EXPIRED" });
  }
  return res.status(403).json({ message: "Assinatura inativa. Escolha um plano para continuar.", code: "SUBSCRIPTION_INACTIVE" });
}
async function registerRoutes(httpServer, app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Este email j\xE1 est\xE1 cadastrado" });
      }
      const passwordHash = await import_bcryptjs.default.hash(data.password, 12);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash
      });
      await storage.seedDefaultAccounts(user.id);
      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof import_zod3.z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      const valid = await import_bcryptjs.default.compare(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof import_zod3.z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro no login" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Erro ao sair" });
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email \xE9 obrigat\xF3rio" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ ok: true });
      }
      const token = import_crypto.default.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1e3);
      await storage.updateUser(user.id, {
        resetToken: token,
        resetTokenExpiry: expiry
      });
      const domains = process.env.REPLIT_DOMAINS;
      const baseUrl = domains ? `https://${domains.split(",")[0]}` : `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      res.json({ ok: true });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Erro ao processar solicita\xE7\xE3o" });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: "Token e senha (m\xEDn. 6 caracteres) s\xE3o obrigat\xF3rios" });
      }
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || new Date(user.resetTokenExpiry) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ message: "Link expirado ou inv\xE1lido. Solicite um novo." });
      }
      const passwordHash = await import_bcryptjs.default.hash(password, 12);
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o encontrado" });
    }
    if (user.subscriptionStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) <= /* @__PURE__ */ new Date()) {
      await markTrialExpiredAndNotify(user);
      user.subscriptionStatus = "trial_expired";
    }
    if (user.stripeCustomerId && (user.planTier === "free" || user.subscriptionStatus === "trial")) {
      try {
        const stripe = await getUncachableStripeClient();
        const PRICE_TO_TIER3 = {
          "price_1T7u82Fmxmf4g4Sf6Gib2xs3": "app",
          "price_1T7uAiFmxmf4g4Sf0I2xPZoM": "method",
          "price_1T7uCTFmxmf4g4Sfkh9uIlYm": "mentoria"
        };
        const tierHierarchy = { free: 0, app: 1, method: 2, mentoria: 3 };
        const sessions = await stripe.checkout.sessions.list({
          customer: user.stripeCustomerId,
          limit: 10
        });
        let highestTier = user.planTier || "free";
        let highestLevel = tierHierarchy[highestTier] || 0;
        for (const session2 of sessions.data) {
          if (session2.payment_status !== "paid") continue;
          const lineItems = await stripe.checkout.sessions.listLineItems(session2.id, { limit: 5 });
          for (const item of lineItems.data) {
            const priceId = item.price?.id;
            if (priceId && PRICE_TO_TIER3[priceId]) {
              const itemTier = PRICE_TO_TIER3[priceId];
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
            subscriptionStatus: "active",
            planTier: highestTier
          });
          user.planTier = highestTier;
          user.subscriptionStatus = "active";
        }
      } catch (syncErr) {
        console.error("Auto-sync plan error:", syncErr);
      }
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.get(api.user.get.path, requireActiveSubscription, async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.patch(api.user.update.path, requireActiveSubscription, async (req, res) => {
    try {
      const { currency } = req.body;
      const updated = await storage.updateUserCurrency(req.session.userId, currency);
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  app2.get(api.accounts.list.path, requireActiveSubscription, async (req, res) => {
    const userAccounts = await storage.getAccounts(req.session.userId);
    res.json(userAccounts);
  });
  app2.post(api.accounts.list.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = req.body;
      input.userId = req.session.userId;
      const newAccount = await storage.createAccount(input);
      res.status(201).json(newAccount);
    } catch (err) {
      res.status(400).json({ message: "Erro ao criar conta" });
    }
  });
  app2.patch("/api/accounts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAccountForUser(req.session.userId, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: "Conta n\xE3o encontrada" });
    }
  });
  app2.delete("/api/accounts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccountForUser(req.session.userId, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: "Conta n\xE3o encontrada" });
    }
  });
  app2.post(api.accounts.updatePercentages.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = api.accounts.updatePercentages.input.parse(req.body);
      const redistribute = req.body.redistribute === true;
      const updated = await storage.updateAccountPercentages(req.session.userId, input.updates, redistribute);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/accounts/recalculate", requireActiveSubscription, async (req, res) => {
    try {
      const updatedAccounts = await storage.recalculateAccountBalances(req.session.userId);
      res.json(updatedAccounts);
    } catch (err) {
      console.error("Recalculate error:", err);
      res.status(500).json({ message: "Erro ao recalcular saldos" });
    }
  });
  app2.get(api.transactions.list.path, requireActiveSubscription, async (req, res) => {
    const userTransactions = await storage.getTransactions(req.session.userId);
    res.json(userTransactions);
  });
  app2.post(api.transactions.create.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = req.body;
      input.userId = req.session.userId;
      if (input.date) {
        input.date = new Date(input.date);
      }
      const newTx = await storage.createTransaction(input);
      res.status(201).json(newTx);
    } catch (err) {
      res.status(400).json({ message: "Erro ao criar transa\xE7\xE3o" });
    }
  });
  app2.post(api.transactions.distributeIncome.path, requireActiveSubscription, async (req, res) => {
    try {
      const input = req.body;
      const date = input.date ? new Date(input.date) : void 0;
      const result = await storage.distributeIncome(req.session.userId, { amount: input.amount, description: input.description }, date);
      res.json(result);
    } catch (err) {
      res.status(400).json({ message: "Erro ao distribuir entrada" });
    }
  });
  app2.patch(api.transactions.update.path, requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateTransactionForUser(req.session.userId, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  });
  app2.delete(api.transactions.delete.path, requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransactionForUser(req.session.userId, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: "Transa\xE7\xE3o n\xE3o encontrada" });
    }
  });
  app2.post(api.transactions.reset.path, requireActiveSubscription, async (req, res) => {
    try {
      await storage.resetAllData(req.session.userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Erro ao resetar dados" });
    }
  });
  app2.get("/api/commitments", requireActiveSubscription, async (req, res) => {
    const items = await storage.getCommitments(req.session.userId);
    res.json(items);
  });
  app2.post("/api/commitments", requireActiveSubscription, async (req, res) => {
    try {
      const parsed = insertCommitmentSchema.parse({ ...req.body, userId: req.session.userId });
      const c = await storage.createCommitment(parsed);
      res.status(201).json(c);
    } catch (err) {
      if (err instanceof import_zod3.z.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: err.errors });
      }
      res.status(400).json({ message: err.message });
    }
  });
  app2.patch("/api/commitments/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCommitment(req.session.userId, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  });
  app2.delete("/api/commitments/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCommitment(req.session.userId, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  });
  app2.get("/api/debts", requireActiveSubscription, async (req, res) => {
    const items = await storage.getDebts(req.session.userId);
    res.json(items);
  });
  app2.post("/api/debts", requireActiveSubscription, async (req, res) => {
    try {
      const parsed = insertDebtSchema.parse({ ...req.body, userId: req.session.userId });
      const d = await storage.createDebt(parsed);
      res.status(201).json(d);
    } catch (err) {
      if (err instanceof import_zod3.z.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: err.errors });
      }
      res.status(400).json({ message: err.message });
    }
  });
  app2.patch("/api/debts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateDebt(req.session.userId, id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  });
  app2.delete("/api/debts/:id", requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDebt(req.session.userId, id);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  });
  app2.get("/api/stripe/publishable-key", requireAuth, async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar chave Stripe" });
    }
  });
  const TIER_TO_PRICE = {
    app: "price_1T7u82Fmxmf4g4Sf6Gib2xs3",
    method: "price_1T7uAiFmxmf4g4Sf0I2xPZoM",
    mentoria: "price_1T7uCTFmxmf4g4Sfkh9uIlYm"
  };
  app2.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      const { planTier } = req.body;
      const priceId = TIER_TO_PRICE[planTier];
      if (!priceId) {
        return res.status(400).json({ message: "Plano inv\xE1lido" });
      }
      const stripe = await getUncachableStripeClient();
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: String(user.id) }
        });
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const successUrl = planTier === "mentoria" ? `${baseUrl}/mentoria/boas-vindas?status=success&tier=${planTier}` : `${baseUrl}/planos?status=success&tier=${planTier}`;
      const sessionConfig = {
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: successUrl,
        cancel_url: `${baseUrl}/planos?status=cancel`,
        payment_intent_data: {
          metadata: { userId: String(user.id), planTier }
        }
      };
      const session2 = await stripe.checkout.sessions.create(sessionConfig);
      res.json({ url: session2.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Erro ao criar sess\xE3o de pagamento" });
    }
  });
  app2.post("/api/stripe/create-portal", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "Nenhuma assinatura encontrada" });
      }
      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session2 = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/planos`
      });
      res.json({ url: session2.url });
    } catch (err) {
      console.error("Portal error:", err);
      res.status(500).json({ message: "Erro ao abrir portal" });
    }
  });
  app2.get("/api/stripe/products", async (req, res) => {
    try {
      const rows = await storage.listStripeProductsWithPrices();
      const productsMap = /* @__PURE__ */ new Map();
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
            active: row.price_active
          });
        }
      }
      res.json(Array.from(productsMap.values()));
    } catch (err) {
      console.error("Products error:", err);
      res.json([]);
    }
  });
  const PRICE_TO_TIER2 = {
    "price_1T7u82Fmxmf4g4Sf6Gib2xs3": "app",
    "price_1T7uAiFmxmf4g4Sf0I2xPZoM": "method",
    "price_1T7uCTFmxmf4g4Sfkh9uIlYm": "mentoria"
  };
  app2.post("/api/stripe/sync-purchase", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user?.stripeCustomerId) return res.json({ status: null });
      const stripe = await getUncachableStripeClient();
      const tierHierarchy = { free: 0, app: 1, method: 2, mentoria: 3 };
      const sessions = await stripe.checkout.sessions.list({
        customer: user.stripeCustomerId,
        limit: 10
      });
      let highestTier = user.planTier || "free";
      let highestLevel = tierHierarchy[highestTier] || 0;
      for (const session2 of sessions.data) {
        if (session2.payment_status !== "paid") continue;
        const lineItems = await stripe.checkout.sessions.listLineItems(session2.id, { limit: 5 });
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          if (priceId && PRICE_TO_TIER2[priceId]) {
            const itemTier = PRICE_TO_TIER2[priceId];
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
          subscriptionStatus: "active",
          planTier: highestTier
        });
        return res.json({ status: "active", planTier: highestTier });
      }
      if (highestLevel > 0 && user.subscriptionStatus !== "active") {
        await storage.updateUser(user.id, { subscriptionStatus: "active" });
      }
      res.json({ status: highestLevel > 0 ? "active" : null, planTier: highestTier });
    } catch (err) {
      console.error("Purchase sync error:", err);
      res.json({ status: null });
    }
  });
  return httpServer;
}

// server/webhookHandlers.ts
var PRICE_TO_TIER = {
  "price_1T7u82Fmxmf4g4Sf6Gib2xs3": "app",
  "price_1T7uAiFmxmf4g4Sf0I2xPZoM": "method",
  "price_1T7uCTFmxmf4g4Sfkh9uIlYm": "mentoria"
};
var TIER_HIERARCHY = { free: 0, app: 1, method: 2, mentoria: 3 };
var WebhookHandlers = class _WebhookHandlers {
  static async processWebhook(payload, signature) {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. Received type: " + typeof payload + ". "
      );
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    const event = JSON.parse(payload.toString());
    if (event.type === "checkout.session.completed") {
      await _WebhookHandlers.handleCheckoutCompleted(event.data.object);
    }
  }
  static async handleCheckoutCompleted(session2) {
    try {
      if (session2.payment_status !== "paid") {
        console.log("Webhook: Checkout session not paid, skipping plan update");
        return;
      }
      const stripe = await getUncachableStripeClient();
      let userId = null;
      let planTier = null;
      if (session2.payment_intent) {
        const paymentIntentId = typeof session2.payment_intent === "string" ? session2.payment_intent : session2.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata?.userId) {
          userId = parseInt(pi.metadata.userId, 10);
        }
        const VALID_TIERS = new Set(Object.values(PRICE_TO_TIER));
        if (pi.metadata?.planTier && VALID_TIERS.has(pi.metadata.planTier)) {
          planTier = pi.metadata.planTier;
        }
      }
      if (!userId && session2.customer_email) {
        const user2 = await storage.getUserByEmail(session2.customer_email);
        if (user2) userId = user2.id;
      }
      if (!userId && session2.customer) {
        const customerId = typeof session2.customer === "string" ? session2.customer : session2.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if (!("deleted" in customer && customer.deleted) && customer.email) {
          const user2 = await storage.getUserByEmail(customer.email);
          if (user2) userId = user2.id;
        }
      }
      if (!userId) {
        console.error("Webhook: Could not identify user for checkout session", session2.id);
        return;
      }
      if (!planTier) {
        const lineItems = await stripe.checkout.sessions.listLineItems(session2.id, { limit: 5 });
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          if (priceId && PRICE_TO_TIER[priceId]) {
            const itemTier = PRICE_TO_TIER[priceId];
            if (!planTier || (TIER_HIERARCHY[itemTier] || 0) > (TIER_HIERARCHY[planTier] || 0)) {
              planTier = itemTier;
            }
          }
        }
      }
      if (!planTier) {
        console.error("Webhook: Could not determine plan tier for checkout session", session2.id);
        return;
      }
      const user = await storage.getUser(userId);
      if (!user) {
        console.error("Webhook: User not found with id", userId);
        return;
      }
      const currentLevel = TIER_HIERARCHY[user.planTier || "free"] || 0;
      const newLevel = TIER_HIERARCHY[planTier] || 0;
      if (newLevel > currentLevel) {
        await storage.updateUser(userId, {
          planTier,
          subscriptionStatus: "active"
        });
        console.log(`Webhook: Updated user ${userId} plan from "${user.planTier}" to "${planTier}"`);
      } else if (user.subscriptionStatus !== "active") {
        await storage.updateUser(userId, { subscriptionStatus: "active" });
        console.log(`Webhook: Activated subscription for user ${userId} (plan already ${user.planTier})`);
      } else {
        console.log(`Webhook: User ${userId} already has plan "${user.planTier}" (>= "${planTier}"), no update needed`);
      }
    } catch (err) {
      console.error("Webhook: Error handling checkout.session.completed:", err);
    }
  }
};

// server/vercelHandler.ts
var PgStore = (0, import_connect_pg_simple.default)(import_express_session.default);
var app = (0, import_express.default)();
app.post(
  "/api/stripe/webhook",
  import_express.default.raw({ type: "application/json" }),
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
      await WebhookHandlers.processWebhook(req.body, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);
app.use(
  import_express.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express.default.urlencoded({ extended: false }));
app.use(
  (0, import_express_session.default)({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    }
  })
);
var initPromise = null;
function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      const httpServer = (0, import_http.createServer)(app);
      await registerRoutes(httpServer, app);
      app.use((err, _req, res, next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
    })();
  }
  return initPromise;
}
async function handler(req, res) {
  try {
    await ensureInitialized();
  } catch (err) {
    console.error("[vercel] Initialization failed:", err.message);
    initPromise = null;
    res.status(500).json({ message: "Server initialization failed: " + err.message });
    return;
  }
  return app(req, res);
}
