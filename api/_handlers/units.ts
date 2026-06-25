import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { units } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(units.tenantId, auth.tenantId)];
    const of = outletFilter(units.outletId, auth.outletId);
    if (of) conditions.push(of);
    const rows = await db.query.units.findMany({
      where: and(...conditions),
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { code, name } = req.body;
    if (!code || !name) { res.status(400).json({ error: "code dan name wajib" }); return; }
    const [row] = await db.insert(units).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId ?? undefined,
      code,
      name,
    }).returning();
    res.status(201).json(row);
  },
});
