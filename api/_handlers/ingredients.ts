import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { ingredients } from "../../db/schema";
import { createHandler } from "../_lib/handler";

export default createHandler({
  async GET(_req, res, auth) {
    const rows = await db.query.ingredients.findMany({
      where: and(eq(ingredients.tenantId, auth.tenantId), eq(ingredients.isActive, true)),
      orderBy: desc(ingredients.createdAt),
      with: { unit: true },
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, unitId, currentStock, minStock, lastCost } = req.body;
    const [row] = await db.insert(ingredients).values({
      tenantId: auth.tenantId,
      name,
      unitId,
      currentStock: String(currentStock ?? 0),
      minStock: String(minStock ?? 0),
      lastCost: String(lastCost ?? 0),
    }).returning();
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.unitId !== undefined) updates.unitId = data.unitId;
    if (data.minStock !== undefined) updates.minStock = String(data.minStock);
    if (data.lastCost !== undefined) updates.lastCost = String(data.lastCost);
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const [row] = await db.update(ingredients)
      .set(updates)
      .where(and(eq(ingredients.id, id), eq(ingredients.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Bahan tidak ditemukan" }); return; }
    res.json(row);
  },
});
