import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Expense, ExpenseCategory } from "@/types";

type ExpenseWithCategory = Expense & { category: ExpenseCategory | null };

export function useExpenses() {
  return useQuery<ExpenseWithCategory[]>({
    queryKey: ["expenses"],
    queryFn: () => apiFetch("expenses"),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`expenses?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
