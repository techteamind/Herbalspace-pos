import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { categories } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(categories.tenantId, auth.tenantId)];
    const of = outletFilter(categories.outletId, auth.outletId);
    if (of) conditions.push(of);
    const rows = await db.select().from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    res.json(rows);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { name, sortOrder } = req.body;
    if (!name || typeof name !== "string") { res.status(400).json({ error: "name wajib" }); return; }
    const [row] = await db.insert(categories).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId ?? undefined,
      name,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  },

  async DELETE(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.tenantId, auth.tenantId)));
    res.status(204).end();
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
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
