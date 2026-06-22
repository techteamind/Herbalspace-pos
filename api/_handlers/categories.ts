import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { categories } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";

export default createHandler({
  async GET(_req, res, auth) {
    const rows = await db.select().from(categories)
      .where(eq(categories.tenantId, auth.tenantId))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, sortOrder } = req.body;
    const [row] = await db.insert(categories).values({
      tenantId: auth.tenantId,
      name,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  },

  async DELETE(req, res, auth) {
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.tenantId, auth.tenantId)));
    res.status(204).end();
  },

  async PUT(req, res, auth) {
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const [row] = await db.update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Kategori tidak ditemukan" }); return; }
    res.json(row);
  },
});
