import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/types";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiFetch("categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) =>
      apiFetch("categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; name?: string; sortOrder?: number; isActive?: boolean }) =>
      apiFetch("categories", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
