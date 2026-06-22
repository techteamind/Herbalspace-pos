import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Outlet {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  isActive: boolean;
  createdAt: string;
}

export function useOutlets() {
  return useQuery<Outlet[]>({
    queryKey: ["outlets"],
    queryFn: () => apiFetch("outlets"),
  });
}

export function useCreateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; address?: string; phone?: string }) =>
      apiFetch("outlets", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}

export function useUpdateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; [key: string]: unknown }) =>
      apiFetch("outlets", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}

export function useDeleteOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`outlets?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}
