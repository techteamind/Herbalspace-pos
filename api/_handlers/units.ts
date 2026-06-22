import { eq } from "drizzle-orm";
import { db } from "../../db";
import { units } from "../../db/schema";
import { createHandler } from "../_lib/handler";

export default createHandler({
  async GET(_req, res, auth) {
    const rows = await db.query.units.findMany({
      where: eq(units.tenantId, auth.tenantId),
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { code, name } = req.body;
    const [row] = await db.insert(units).values({
      tenantId: auth.tenantId,
      code,
      name,
    }).returning();
    res.status(201).json(row);
  },
});
