import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Customer } from "@/types";

export function useCustomers(search?: string) {
  const params = search ? `?q=${encodeURIComponent(search)}` : "";
  return useQuery<Customer[]>({
    queryKey: ["customers", search],
    queryFn: () => apiFetch(`customers${params}`),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; note?: string }) =>
      apiFetch("customers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; name?: string; phone?: string; email?: string; note?: string }) =>
      apiFetch("customers", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export type CustomerDetail = Customer & {
  transactions: import("@/types").TransactionWithItems[];
  totalSpend: number;
};

export function useCustomer(id: string) {
  return useQuery<CustomerDetail>({
    queryKey: ["customer", id],
    queryFn: () => apiFetch(`customers?id=${id}`),
    enabled: !!id,
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`customers?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
