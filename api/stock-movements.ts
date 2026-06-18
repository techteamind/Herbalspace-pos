import { eq, and, desc, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { stockMovements, ingredients, units } from "../db/schema";
import { createHandler } from "./_lib/handler";

export default createHandler({
  async GET(req, res, auth) {
    const { from, to, type, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 300);

    const conditions = [eq(stockMovements.tenantId, auth.tenantId)];
    if (from) conditions.push(gte(stockMovements.createdAt, new Date(from as string)));
    if (to) conditions.push(lt(stockMovements.createdAt, new Date(to as string)));
    if (type) conditions.push(eq(stockMovements.type, type as typeof stockMovements.type.enumValues[number]));

    const rows = await db
      .select({
        id: stockMovements.id,
        ingredientName: ingredients.name,
        unitCode: units.code,
        type: stockMovements.type,
        qtyChange: stockMovements.qtyChange,
        balanceAfter: stockMovements.balanceAfter,
        note: stockMovements.note,
        referenceId: stockMovements.referenceId,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(ingredients, eq(ingredients.id, stockMovements.ingredientId))
      .innerJoin(units, eq(units.id, ingredients.unitId))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);

    res.json(rows);
  },
});
