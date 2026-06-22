import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export function useAuditLogs() {
  return useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch("audit-logs") as Promise<AuditLog[]>,
  });
}
