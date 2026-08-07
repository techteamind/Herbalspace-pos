import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReportSummary {
  omzet: number;
  hpp: number;
  totalDiscount: number;
  taxService: number;
  trxCount: number;
  expenseTotal: number;
  expenseByCategory: { category: string; total: number }[];
  topProducts: { name: string; total: number }[];
  paymentBreakdown: { method: string; trx: number; total: number }[];
  categoryBreakdown: { category: string; qty: number; total: number; hpp: number }[];
  stockValue: number;
  productStockValue: number;
}

// Agregasi periode dari server (bukan cap 1000/100 di klien). outletId masuk key
// supaya ganti outlet me-refetch.
export function useReport(from: string, to: string) {
  const { outletId } = useAuth();
  return useQuery<ReportSummary>({
    queryKey: ["reports", from, to, outletId ?? "all"],
    queryFn: () => apiFetch(`reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  });
}
