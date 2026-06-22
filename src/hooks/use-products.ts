import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ProductWithCategory } from "@/types";

export function useProducts() {
  return useQuery<ProductWithCategory[]>({
    queryKey: ["products"],
    queryFn: () => apiFetch("products"),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; price: number; costPrice?: number; categoryId?: string; sku?: string; imageUrl?: string }) =>
      apiFetch("products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; [key: string]: unknown }) =>
      apiFetch("products", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`products?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export interface PriceHistoryEntry {
  id: string;
  productId: string;
  oldPrice: string;
  newPrice: string;
  changedBy: string | null;
  changedAt: string;
}

export function usePriceHistory(productId: string | undefined) {
  return useQuery<PriceHistoryEntry[]>({
    queryKey: ["price-history", productId],
    queryFn: () => apiFetch(`price-history?productId=${productId}`),
    enabled: !!productId,
  });
}
