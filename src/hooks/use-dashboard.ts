import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DashboardStats, TopProduct, LowStockItem, TransactionWithItems } from "@/types";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiFetch("dashboard?section=stats"),
    refetchInterval: 30_000,
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
    refetchInterval: 30_000,
  });
}

export interface WeeklyRevenue {
  date: string;
  revenue: number;
  trxCount: number;
}

export function useWeeklyRevenue() {
  return useQuery<WeeklyRevenue[]>({
    queryKey: ["dashboard", "weekly-revenue"],
    queryFn: () => apiFetch("dashboard?section=weekly-revenue"),
    refetchInterval: 60_000,
  });
}

export function useLowStock() {
  return useQuery<LowStockItem[]>({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () => apiFetch("dashboard?section=low-stock"),
    refetchInterval: 60_000,
  });
}
