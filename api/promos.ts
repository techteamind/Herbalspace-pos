import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { promos } from "../db/schema";
import { createHandler } from "./_lib/handler";
import { logAudit } from "./_lib/audit";

export default createHandler({
  async GET(_req, res, auth) {
    const rows = await db.select().from(promos)
      .where(eq(promos.tenantId, auth.tenantId))
      .orderBy(desc(promos.createdAt));
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, type, value, minPurchase, buyQty, getQty, productId, startAt, endAt, startHour, endHour, daysOfWeek } = req.body;
    const [row] = await db.insert(promos).values({
      tenantId: auth.tenantId,
      name, type, value: String(value),
      minPurchase: String(minPurchase ?? 0),
      buyQty: buyQty ?? null, getQty: getQty ?? null,
      productId: productId || null,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      startHour: startHour || null, endHour: endHour || null,
      daysOfWeek: daysOfWeek || null,
    }).returning();
    if (row) await logAudit(auth, "create", "promo", row.id, { name });
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = {};
    for (const key of ["name", "type", "value", "minPurchase", "buyQty", "getQty", "productId", "startAt", "endAt", "startHour", "endHour", "daysOfWeek", "isActive"] as const) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (updates.value) updates.value = String(updates.value);
    if (updates.minPurchase) updates.minPurchase = String(updates.minPurchase);
    if (updates.startAt) updates.startAt = new Date(updates.startAt as string);
    if (updates.endAt) updates.endAt = new Date(updates.endAt as string);

    const [row] = await db.update(promos).set(updates)
      .where(and(eq(promos.id, id), eq(promos.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Promo tidak ditemukan" }); return; }
    res.json(row);
  },

  async DELETE(req, res, auth) {
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(promos).where(and(eq(promos.id, id), eq(promos.tenantId, auth.tenantId)));
    await logAudit(auth, "delete", "promo", id);
    res.status(204).end();
  },
});
