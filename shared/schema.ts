import { pgTable, text, serial, integer, real, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  currency: text("currency").notNull().default("EUR"),
  accountType: text("account_type").notNull().default("personal"),
  trialStartDate: timestamp("trial_start_date").notNull().defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  planTier: text("plan_tier").notNull().default("free"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  trialExpiredEmailSent: boolean("trial_expired_email_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  percentage: real("percentage").notNull(),
  balance: integer("balance").notNull().default(0),
  color: text("color").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountId: integer("account_id"),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  isRecurring: boolean("is_recurring").default(false),
  category: text("category"),
});

export const commitments = pgTable("commitments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountId: integer("account_id"),
  description: text("description").notNull(),
  value: integer("value").notNull(),
  startDate: text("start_date").notNull(),
  dueDate: text("due_date"),
  recurrence: text("recurrence").notNull(),
  installments: integer("installments"),
  category: text("category").notNull(),
  commitmentType: text("commitment_type").notNull().default("expense"),
  paidPeriods: text("paid_periods").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionAllocations = pgTable("transaction_allocations", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  accountId: integer("account_id").notNull(),
  amount: integer("amount").notNull(),
});

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  creditor: text("creditor").notNull(),
  amount: integer("amount").notNull(),
  registeredDate: text("registered_date").notNull(),
  priority: text("priority").notNull().default("medium"),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  retentionPct: real("retention_pct").notNull().default(0),
  partnersPct: real("partners_pct").notNull().default(0),
  mentorshipPct: real("mentorship_pct").notNull().default(0),
});

export const fixedCosts = pgTable("fixed_costs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  category: text("category"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, trialStartDate: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, date: true })
  .extend({
    amount: z.number(),
    accountId: z.number().optional().nullable(),
  });
export const insertCommitmentSchema = createInsertSchema(commitments).omit({ id: true, createdAt: true });
export const insertDebtSchema = createInsertSchema(debts).omit({ id: true, createdAt: true });
export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({ id: true });
export const insertFixedCostSchema = createInsertSchema(fixedCosts).omit({ id: true });

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  accountType: z.enum(["personal", "business"]).default("personal"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Commitment = typeof commitments.$inferSelect;
export type InsertCommitment = z.infer<typeof insertCommitmentSchema>;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

export type TransactionAllocation = typeof transactionAllocations.$inferSelect;

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

export type FixedCost = typeof fixedCosts.$inferSelect;
export type InsertFixedCost = z.infer<typeof insertFixedCostSchema>;

export type UpdateAccountPercentagesRequest = {
  updates: { id: number; percentage: number }[];
};

export type DistributeIncomeRequest = {
  amount: number;
  description: string;
};
