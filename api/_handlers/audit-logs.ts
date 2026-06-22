import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLogs } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";

export default createHandler({
  async GET(req, res, auth) {
    if (auth.role !== "owner" && auth.role !== "manager") {
      res.status(403).json({ error: "Akses ditolak" });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const conditions = [eq(auditLogs.tenantId, auth.tenantId)];
    if (auth.outletId) conditions.push(eq(auditLogs.outletId, auth.outletId));
    const rows = await db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    res.json(rows);
  },
});
