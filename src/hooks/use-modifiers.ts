import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ModifierGroupWithOptions } from "@/types";

export function useModifiers() {
  return useQuery<ModifierGroupWithOptions[]>({
    queryKey: ["modifiers"],
    queryFn: () => apiFetch("modifiers") as Promise<ModifierGroupWithOptions[]>,
  });
}

export function useCreateModifier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; isRequired?: boolean; maxSelect?: number; options: { name: string; price: number }[] }) =>
      apiFetch("modifiers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modifiers"] }),
  });
}

export function useUpdateModifier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; name: string; isRequired?: boolean; maxSelect?: number; options: { name: string; price: number }[] }) =>
      apiFetch("modifiers", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modifiers"] }),
  });
}

export function useDeleteModifier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`modifiers?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modifiers"] }),
  });
}
