import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: "owner" | "manager" | "cashier";
  isActive: boolean;
  outletId: string | null;
  outlet?: { id: string; name: string } | null;
  createdAt: string;
}

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => apiFetch("employees"),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fullName: string; email: string; password: string; role: string; outletId?: string | null }) =>
      apiFetch("employees", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; role?: string; outletId?: string | null; isActive?: boolean }) =>
      apiFetch("employees", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}
