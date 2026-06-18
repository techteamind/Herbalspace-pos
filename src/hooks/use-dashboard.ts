import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DashboardStats, TopProduct, LowStockItem, TransactionWithItems } from "@/types";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiFetch("dashboard?section=stats"),
  });
}

export function useRecentTransactions() {
  return useQuery<TransactionWithItems[]>({
    queryKey: ["dashboard", "recent-transactions"],
    queryFn: () => apiFetch("dashboard?section=recent-transactions"),
  });
}

export function useTopProducts() {
  return useQuery<TopProduct[]>({
    queryKey: ["dashboard", "top-products"],
    queryFn: () => apiFetch("dashboard?section=top-products"),
  });
}

export function useLowStock() {
  return useQuery<LowStockItem[]>({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () => apiFetch("dashboard?section=low-stock"),
  });
}
