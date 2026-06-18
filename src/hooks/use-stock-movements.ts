import { useQuery } from "@tanstack/react-query";
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

export function useStockMovements(type?: string) {
  const qs = type ? `?type=${type}` : "";
  return useQuery<StockMovementRow[]>({
    queryKey: ["stock-movements", type],
    queryFn: () => apiFetch(`stock-movements${qs}`),
  });
}
