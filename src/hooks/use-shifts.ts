import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Shift {
  id: string;
  tenantId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: string;
  closingCash: string | null;
  expectedCash: string | null;
  totalSales: string | null;
  totalTransactions: number | null;
  note: string | null;
}

export function useActiveShift() {
  return useQuery<Shift | null>({
    queryKey: ["shifts", "active"],
    queryFn: () => apiFetch("shifts?active=true"),
  });
}

export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: () => apiFetch("shifts"),
  });
}

export function useOpenShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { openingCash: number }) =>
      apiFetch("shifts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useCloseShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; closingCash: number; note?: string }) =>
      apiFetch("shifts", { method: "PUT", body: JSON.stringify({ ...data, action: "close" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}
