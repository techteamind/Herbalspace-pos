import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { IngredientWithUnit, Unit } from "@/types";

export function useIngredients() {
  return useQuery<IngredientWithUnit[]>({
    queryKey: ["ingredients"],
    queryFn: () => apiFetch("ingredients"),
  });
}

export function useUnits() {
  return useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: () => apiFetch("units"),
  });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; unitId: string; currentStock?: number; minStock?: number; lastCost?: number }) =>
      apiFetch("ingredients", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; [key: string]: unknown }) =>
      apiFetch("ingredients", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}
