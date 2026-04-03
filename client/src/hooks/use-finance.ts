import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api, buildUrl } from "@shared/routes";
import type { User, Account, Transaction, Commitment, Debt } from "@shared/schema";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
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
    let msg = "Erro";
    try { const d = await res.json(); if (d.message) msg = d.message; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// CENTRAL SYNC — invalidates ALL financial queries at once.
// Call this after any action that changes financial state.
// ---------------------------------------------------------------------------

export function useFinancialSync() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
    queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
    queryClient.invalidateQueries({ queryKey: [api.user.get.path] });
  }, [queryClient]);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

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

export function useCommitments() {
  return useQuery<Commitment[]>({
    queryKey: ["/api/commitments"],
    queryFn: () => apiFetch<Commitment[]>("/api/commitments"),
  });
}

export function useDebts() {
  return useQuery<Debt[]>({
    queryKey: ["/api/debts"],
    queryFn: () => apiFetch<Debt[]>("/api/debts"),
  });
}

// ---------------------------------------------------------------------------
// Account mutations
// ---------------------------------------------------------------------------

export function useUpdateAccountPercentages() {
  const queryClient = useQueryClient();
  const sync = useFinancialSync();
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
    onSuccess: (updatedAccounts) => {
      // Instantly show the new accounts — no waiting for a refetch round-trip
      queryClient.setQueryData([api.accounts.list.path], updatedAccounts);
      // Then sync all queries to ensure full consistency
      sync();
    },
  });
}

// ---------------------------------------------------------------------------
// Transaction mutations
// ---------------------------------------------------------------------------

export function useCreateTransaction() {
  const sync = useFinancialSync();
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
    onSuccess: () => sync(),
  });
}

export function useDistributeIncome() {
  const queryClient = useQueryClient();
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: async (data: { amount: number; description: string; date?: string }) => {
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
    onSuccess: (result) => {
      // Instantly populate accounts from the response — zero extra round-trip
      queryClient.setQueryData([api.accounts.list.path], result.updatedAccounts);
      // Full sync for transactions and all other queries
      sync();
    },
  });
}

export function useUpdateTransaction() {
  const sync = useFinancialSync();
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
    onSuccess: () => sync(),
  });
}

export function useDeleteTransaction() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.delete.path, { id });
      return fetchWithZod<{ ok: true }>(
        url,
        { method: api.transactions.delete.method },
        api.transactions.delete.responses[200],
      );
    },
    onSuccess: () => sync(),
  });
}

// ---------------------------------------------------------------------------
// Commitment mutations
// ---------------------------------------------------------------------------

export function useCreateCommitment() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: (data: Omit<Commitment, "id" | "createdAt">) =>
      apiFetch<Commitment>("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => sync(),
  });
}

export function useUpdateCommitment() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Commitment> }) =>
      apiFetch<Commitment>(`/api/commitments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => sync(),
  });
}

export function useDeleteCommitment() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ ok: true }>(`/api/commitments/${id}`, { method: "DELETE" }),
    onSuccess: () => sync(),
  });
}

// ---------------------------------------------------------------------------
// Debt mutations
// ---------------------------------------------------------------------------

export function useCreateDebt() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: (data: Omit<Debt, "id" | "createdAt">) =>
      apiFetch<Debt>("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => sync(),
  });
}

export function useUpdateDebt() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Debt> }) =>
      apiFetch<Debt>(`/api/debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => sync(),
  });
}

export function useDeleteDebt() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ ok: true }>(`/api/debts/${id}`, { method: "DELETE" }),
    onSuccess: () => sync(),
  });
}

// ---------------------------------------------------------------------------
// Balance recalculation (manual trigger from Dashboard)
// ---------------------------------------------------------------------------

export function useRecalculateBalances() {
  const sync = useFinancialSync();
  return useMutation({
    mutationFn: () =>
      apiFetch<Account[]>("/api/accounts/recalculate", { method: "POST" }),
    onSuccess: () => sync(),
  });
}
