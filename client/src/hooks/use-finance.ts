import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { User, Account, Transaction } from "@shared/schema";

// Custom fetching wrapper to parse and handle Zod schemas explicitly
async function fetchWithZod<T>(
  url: string,
  options: RequestInit,
  schema: any,
): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = "/";
      throw new Error("Sessão expirada");
    }
    if (res.status === 403) {
      window.location.href = "/planos";
      throw new Error("Acesso restrito");
    }
    let errorMessage = "Ocorreu um erro";
    try {
      const errData = await res.json();
      if (errData.message) errorMessage = errData.message;
    } catch {}
    throw new Error(errorMessage);
  }
  const data = await res.json();
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error("Zod Validation Error:", result.error.format());
    throw new Error("Erro na formatação dos dados da API.");
  }
  return result.data as T;
}

export function useUser() {
  return useQuery({
    queryKey: [api.user.get.path],
    queryFn: () =>
      fetchWithZod<User>(api.user.get.path, {}, api.user.get.responses[200]),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: [api.accounts.list.path],
    queryFn: () =>
      fetchWithZod<Account[]>(
        api.accounts.list.path,
        {},
        api.accounts.list.responses[200],
      ),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: () =>
      fetchWithZod<Transaction[]>(
        api.transactions.list.path,
        {},
        api.transactions.list.responses[200],
      ),
  });
}

export function useUpdateAccountPercentages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      updates: { id: number; percentage: number }[];
      redistribute?: boolean;
    }) => {
      return fetchWithZod<Account[]>(
        api.accounts.updatePercentages.path,
        {
          method: api.accounts.updatePercentages.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        api.accounts.updatePercentages.responses[200],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Transaction, "id" | "date">) => {
      return fetchWithZod<Transaction>(
        api.transactions.create.path,
        {
          method: api.transactions.create.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        api.transactions.create.responses[201],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    },
  });
}

export function useDistributeIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      return fetchWithZod<{
        transaction: Transaction;
        updatedAccounts: Account[];
      }>(
        api.transactions.distributeIncome.path,
        {
          method: api.transactions.distributeIncome.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        api.transactions.distributeIncome.responses[200],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: number; data: Partial<Transaction> }) => {
      const url = buildUrl(api.transactions.update.path, { id: payload.id });
      return fetchWithZod<Transaction>(
        url,
        {
          method: api.transactions.update.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.data),
        },
        api.transactions.update.responses[200],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.delete.path, { id });
      return fetchWithZod<{ ok: true }>(
        url,
        { method: api.transactions.delete.method },
        api.transactions.delete.responses[200],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    },
  });
}
