import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { DashboardStats, TopProduct, LowStockItem, TransactionWithItems } from "@/types";

// Semua data dashboard di-scope outlet aktif di server (X-Outlet-Id). Sertakan
// outletId di queryKey agar ganti outlet me-refetch, bukan tampilkan data outlet lama.
export function useDashboardStats() {
  const { outletId } = useAuth();
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats", outletId],
    queryFn: () => apiFetch("dashboard?section=stats"),
    refetchInterval: 30_000,
  });
}

export function useRecentTransactions() {
  const { outletId } = useAuth();
  return useQuery<TransactionWithItems[]>({
    queryKey: ["dashboard", "recent-transactions", outletId],
    queryFn: () => apiFetch("dashboard?section=recent-transactions"),
  });
}

export function useTopProducts() {
  const { outletId } = useAuth();
  return useQuery<TopProduct[]>({
    queryKey: ["dashboard", "top-products", outletId],
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
  const { outletId } = useAuth();
  return useQuery<WeeklyRevenue[]>({
    queryKey: ["dashboard", "weekly-revenue", outletId],
    queryFn: () => apiFetch("dashboard?section=weekly-revenue"),
    refetchInterval: 60_000,
  });
}

export function useLowStock() {
  const { outletId } = useAuth();
  return useQuery<LowStockItem[]>({
    queryKey: ["dashboard", "low-stock", outletId],
    queryFn: () => apiFetch("dashboard?section=low-stock"),
    refetchInterval: 60_000,
  });
}
