import { eq, and, desc, gte, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { stockMovements, ingredients, units } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";

export default createHandler({
  async POST(req, res, auth) {
    const { ingredientId, type, qtyChange, note } = req.body as {
      ingredientId: string;
      type: "adjustment" | "waste" | "purchase" | "return";
      qtyChange: number;
      note?: string;
    };
    if (!ingredientId || !type || qtyChange === undefined) {
      res.status(400).json({ error: "ingredientId, type, dan qtyChange wajib" });
      return;
    }

    const ingredient = await db.query.ingredients.findFirst({
      where: and(eq(ingredients.id, ingredientId), eq(ingredients.tenantId, auth.tenantId)),
    });
    if (!ingredient) { res.status(404).json({ error: "Bahan tidak ditemukan" }); return; }

    const newBalance = Number(ingredient.currentStock) + qtyChange;

    await db.update(ingredients)
      .set({ currentStock: String(newBalance), updatedAt: new Date() })
      .where(eq(ingredients.id, ingredientId));

    const [row] = await db.insert(stockMovements).values({
      tenantId: auth.tenantId,
      ingredientId,
      type,
      qtyChange: String(qtyChange),
      balanceAfter: String(newBalance),
      unitCost: ingredient.lastCost,
      note: note || null,
      createdBy: auth.userId,
    }).returning();

    res.status(201).json(row);
  },

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
