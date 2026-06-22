import { db } from "../../db";
import { auditLogs } from "../../db/schema";
import type { AuthContext } from "./auth";

export async function logAudit(
  auth: AuthContext,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditLogs).values({
    tenantId: auth.tenantId,
    userId: auth.userId,
    userName: auth.profileName,
    action,
    entity,
    entityId: entityId ?? null,
    details: details ?? null,
  }).catch(() => {});
}
