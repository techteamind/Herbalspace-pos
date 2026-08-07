import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Expense, ExpenseCategory } from "@/types";

type ExpenseWithCategory = Expense & { category: ExpenseCategory | null };

// Rentang WIB opsional (ISO). Server memfilter & total dari section=summary,
// jadi tak salah hitung saat >100 entri/bulan.
export function useExpenses(from?: string, to?: string) {
  const qs = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
  return useQuery<ExpenseWithCategory[]>({
    queryKey: ["expenses", from ?? "all", to ?? "all"],
    queryFn: () => apiFetch(`expenses${qs}`),
  });
}

export function useExpenseTotal(from: string, to: string) {
  return useQuery<{ total: number }>({
    queryKey: ["expenses-total", from, to],
    queryFn: () => apiFetch(`expenses?section=summary&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  });
}

export function useExpenseCategories() {
  return useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: () => apiFetch("expenses?section=categories"),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { categoryId?: string; description: string; amount: number; spentAt: string }) =>
      apiFetch("expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-total"] }); qc.invalidateQueries({ queryKey: ["reports"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiFetch("expenses?section=categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-categories"] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; categoryId?: string; description?: string; amount?: number; spentAt?: string }) =>
      apiFetch("expenses", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-total"] }); qc.invalidateQueries({ queryKey: ["reports"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`expenses?id=${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-total"] }); qc.invalidateQueries({ queryKey: ["reports"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}
