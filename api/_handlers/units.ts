import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { units } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(units.tenantId, auth.tenantId)];
    if (auth.outletId) conditions.push(eq(units.outletId, auth.outletId));
    const rows = await db.query.units.findMany({
      where: and(...conditions),
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { code, name } = req.body;
    const [row] = await db.insert(units).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId ?? undefined,
      code,
      name,
    }).returning();
    res.status(201).json(row);
  },
});
