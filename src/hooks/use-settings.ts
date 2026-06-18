import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Settings } from "@/types";

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiFetch("settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<Settings, "tenantId">>) =>
      apiFetch("settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
