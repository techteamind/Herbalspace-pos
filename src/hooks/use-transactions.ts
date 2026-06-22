import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { TransactionWithItems } from "@/types";

export function useTransactions(opts?: { from?: string; to?: string; limit?: number; outletId?: string }) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.outletId) params.set("outletId", opts.outletId);
  const qs = params.toString();
  return useQuery<TransactionWithItems[]>({
    queryKey: ["transactions", opts],
    queryFn: () => apiFetch(`transactions${qs ? `?${qs}` : ""}`),
  });
}

interface SalePayload {
  customerId?: string | null;
  discount?: number;
  taxPercent?: number;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
  payments: {
    method: "cash" | "qris" | "card" | "transfer";
    amount: number;
    amount_received?: number;
    change_amount?: number;
  }[];
}

export function useVoidTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; reason?: string }) =>
      apiFetch("transactions", { method: "PUT", body: JSON.stringify({ ...data, action: "void" }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SalePayload) =>
      apiFetch("sales", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });
}
