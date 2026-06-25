import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { promos } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(promos.tenantId, auth.tenantId)];
    const of = outletFilter(promos.outletId, auth.outletId);
    if (of) conditions.push(of);
    const rows = await db.select().from(promos)
      .where(and(...conditions))
      .orderBy(desc(promos.createdAt));
    res.json(rows);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { name, type, value, minPurchase, buyQty, getQty, productId, startAt, endAt, startHour, endHour, daysOfWeek } = req.body;
    const [row] = await db.insert(promos).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId ?? undefined,
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
    if (!requireRole(auth, "manager", res)) return;
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = {};
    for (const key of ["name", "type", "value", "minPurchase", "buyQty", "getQty", "productId", "startAt", "endAt", "startHour", "endHour", "daysOfWeek", "isActive"] as const) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (updates.value !== undefined) updates.value = String(updates.value);
    if (updates.minPurchase !== undefined) updates.minPurchase = String(updates.minPurchase);
    if (updates.startAt) updates.startAt = new Date(updates.startAt as string);
    if (updates.endAt) updates.endAt = new Date(updates.endAt as string);

    const [row] = await db.update(promos).set(updates)
      .where(and(eq(promos.id, id), eq(promos.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Promo tidak ditemukan" }); return; }
    res.json(row);
  },

  async DELETE(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(promos).where(and(eq(promos.id, id), eq(promos.tenantId, auth.tenantId)));
    await logAudit(auth, "delete", "promo", id);
    res.status(204).end();
  },
});
