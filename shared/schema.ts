import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  currency: text("currency").notNull().default("BRL"),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  percentage: integer("percentage").notNull(),
  balance: integer("balance").notNull().default(0), // stored in cents
  color: text("color").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountId: integer("account_id"), // null if income is distributed across accounts
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // stored in cents
  type: text("type").notNull(), // 'income' | 'expense'
  date: timestamp("date").notNull().defaultNow(),
  isRecurring: boolean("is_recurring").default(false),
  category: text("category"), // for expenses
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, date: true })
  .extend({
    amount: z.number(),
    accountId: z.number().optional().nullable(),
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// API Contract Types
export type UpdateAccountPercentagesRequest = {
  updates: { id: number; percentage: number }[];
};

export type DistributeIncomeRequest = {
  amount: number;
  description: string;
};
