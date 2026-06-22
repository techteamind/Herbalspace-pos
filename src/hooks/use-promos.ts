import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Promo {
  id: string;
  tenantId: string;
  name: string;
  type: "discount_percent" | "discount_amount" | "buy_x_get_y" | "happy_hour";
  value: string;
  minPurchase: string;
  buyQty: number | null;
  getQty: number | null;
  productId: string | null;
  startAt: string | null;
  endAt: string | null;
  startHour: string | null;
  endHour: string | null;
  daysOfWeek: number[] | null;
  isActive: boolean;
  createdAt: string;
}

export function usePromos() {
  return useQuery<Promo[]>({
    queryKey: ["promos"],
    queryFn: () => apiFetch("promos"),
  });
}

export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Promo>) => apiFetch("promos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promos"] }),
  });
}

export function useUpdatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Promo> & { id: string }) => apiFetch("promos", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promos"] }),
  });
}

export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`promos?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promos"] }),
  });
}

export function useActivePromos() {
  const { data: promos } = usePromos();
  const now = new Date();
  const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const currentDay = now.getDay();

  return (promos ?? []).filter((p) => {
    if (!p.isActive) return false;
    if (p.startAt && new Date(p.startAt) > now) return false;
    if (p.endAt && new Date(p.endAt) < now) return false;
    if (p.startHour && p.endHour && (currentHour < p.startHour || currentHour > p.endHour)) return false;
    if (p.daysOfWeek && p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(currentDay)) return false;
    return true;
  });
}
