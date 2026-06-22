import { eq, desc } from "drizzle-orm";
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
    const rows = await db.select().from(auditLogs)
      .where(eq(auditLogs.tenantId, auth.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    res.json(rows);
  },
});
