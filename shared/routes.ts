import { z } from "zod";
import {
  insertUserSchema,
  insertAccountSchema,
  insertTransactionSchema,
  users,
  accounts,
  transactions,
} from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  user: {
    get: {
      method: "GET" as const,
      path: "/api/user" as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/user" as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
  },
  accounts: {
    list: {
      method: "GET" as const,
      path: "/api/accounts" as const,
      responses: {
        200: z.array(z.custom<typeof accounts.$inferSelect>()),
      },
    },
    updatePercentages: {
      method: "POST" as const,
      path: "/api/accounts/percentages" as const,
      input: z.object({
        updates: z.array(z.object({ id: z.number(), percentage: z.number() })),
      }),
      responses: {
        200: z.array(z.custom<typeof accounts.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
  },
  transactions: {
    list: {
      method: "GET" as const,
      path: "/api/transactions" as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/transactions" as const,
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/transactions/:id" as const,
      input: insertTransactionSchema.partial(),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/transactions/:id" as const,
      responses: {
        200: z.object({ ok: z.literal(true) }),
        404: errorSchemas.notFound,
      },
    },
    distributeIncome: {
      method: "POST" as const,
      path: "/api/transactions/distribute" as const,
      input: z.object({
        amount: z.number(),
        description: z.string(),
      }),
      responses: {
        200: z.object({
          transaction: z.custom<typeof transactions.$inferSelect>(),
          updatedAccounts: z.array(z.custom<typeof accounts.$inferSelect>()),
        }),
      },
    },
    reset: {
      method: "POST" as const,
      path: "/api/transactions/reset" as const,
      responses: {
        200: z.object({ ok: z.literal(true) }),
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DistributeIncomeResponse = z.infer<
  (typeof api.transactions.distributeIncome.responses)[200]
>;
