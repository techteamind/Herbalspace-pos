import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ingredients } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(ingredients.tenantId, auth.tenantId), eq(ingredients.isActive, true)];
    const of = outletFilter(ingredients.outletId, auth.outletId);
    if (of) conditions.push(of);
    const rows = await db.query.ingredients.findMany({
      where: and(...conditions),
      orderBy: desc(ingredients.createdAt),
      with: { unit: true },
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { name, unitId, currentStock, minStock, lastCost } = req.body;
    if (!name || typeof name !== "string") { res.status(400).json({ error: "name wajib" }); return; }
    if (!unitId) { res.status(400).json({ error: "unitId wajib" }); return; }
    const [row] = await db.insert(ingredients).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId ?? undefined,
      name,
      unitId,
      currentStock: String(currentStock ?? 0),
      minStock: String(minStock ?? 0),
      lastCost: String(lastCost ?? 0),
    }).returning();
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
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
