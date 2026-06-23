import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { settings } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

export default createHandler({
  async GET(_req, res, auth) {
    const row = await db.query.settings.findFirst({
      where: eq(settings.tenantId, auth.tenantId),
    });
    if (!row) {
      const [created] = await db.insert(settings).values({ tenantId: auth.tenantId }).returning();
      res.json(created);
      return;
    }
    res.json(row);
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const data = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.cafeName !== undefined) updates.cafeName = data.cafeName;
    if (data.address !== undefined) updates.address = data.address || null;
    if (data.phone !== undefined) updates.phone = data.phone || null;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl || null;
    if (data.taxPercent !== undefined) updates.taxPercent = String(data.taxPercent);
    if (data.serviceChargePercent !== undefined) updates.serviceChargePercent = String(data.serviceChargePercent);
    if (data.receiptHeader !== undefined) updates.receiptHeader = data.receiptHeader || null;
    if (data.receiptFooter !== undefined) updates.receiptFooter = data.receiptFooter || null;
    if (data.enabledPaymentMethods !== undefined) updates.enabledPaymentMethods = data.enabledPaymentMethods;

    const [row] = await db.update(settings)
      .set(updates)
      .where(eq(settings.tenantId, auth.tenantId))
      .returning();
    if (!row) { res.status(404).json({ error: "Settings tidak ditemukan" }); return; }
    res.json(row);
  },
});
