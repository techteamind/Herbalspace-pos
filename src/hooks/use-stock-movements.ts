import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface StockMovementRow {
  id: string;
  ingredientName: string;
  unitCode: string;
  type: "sale" | "purchase" | "adjustment" | "waste" | "return";
  qtyChange: string;
  balanceAfter: string;
  note: string | null;
  referenceId: string | null;
  createdAt: string;
}

export function useCreateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ingredientId: string; type: "adjustment" | "waste" | "purchase" | "return"; qtyChange: number; note?: string }) =>
      apiFetch("stock-movements", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useStockMovements(type?: string) {
  const qs = type ? `?type=${type}` : "";
  return useQuery<StockMovementRow[]>({
    queryKey: ["stock-movements", type],
    queryFn: () => apiFetch(`stock-movements${qs}`),
  });
}
