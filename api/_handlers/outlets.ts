import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { outlets } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";

export default createHandler({
  async GET(_req, res, auth) {
    const rows = await db.select().from(outlets)
      .where(eq(outlets.tenantId, auth.tenantId))
      .orderBy(asc(outlets.name));
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, address, phone, receiptHeader, receiptFooter } = req.body;
    const [row] = await db.insert(outlets).values({
      tenantId: auth.tenantId,
      name, address: address || null, phone: phone || null,
      receiptHeader: receiptHeader || null, receiptFooter: receiptFooter || null,
    }).returning();
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address || null;
    if (data.phone !== undefined) updates.phone = data.phone || null;
    if (data.isActive !== undefined) updates.isActive = data.isActive;
    if (data.receiptHeader !== undefined) updates.receiptHeader = data.receiptHeader || null;
    if (data.receiptFooter !== undefined) updates.receiptFooter = data.receiptFooter || null;

    const [row] = await db.update(outlets).set(updates)
      .where(and(eq(outlets.id, id), eq(outlets.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Outlet tidak ditemukan" }); return; }
    res.json(row);
  },

  async DELETE(req, res, auth) {
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(outlets).where(and(eq(outlets.id, id), eq(outlets.tenantId, auth.tenantId)));
    res.status(204).end();
  },
});
