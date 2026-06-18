import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { RecipeItem, Ingredient, Unit } from "@/types";

export type RecipeItemFull = RecipeItem & { ingredient: Ingredient & { unit: Unit } };

export function useRecipe(productId: string) {
  return useQuery<RecipeItemFull[]>({
    queryKey: ["recipe", productId],
    queryFn: () => apiFetch(`recipes?productId=${productId}`),
    enabled: !!productId,
  });
}

export function useSaveRecipe(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { ingredientId: string; quantity: number }[]) =>
      apiFetch("recipes", { method: "PUT", body: JSON.stringify({ productId, items }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipe", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
