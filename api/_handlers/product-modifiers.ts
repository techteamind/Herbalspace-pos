import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productModifiers } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

export default createHandler({
  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { productId, modifierGroupIds } = req.body as { productId: string; modifierGroupIds: string[] };
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }

    await db.delete(productModifiers).where(
      and(eq(productModifiers.tenantId, auth.tenantId), eq(productModifiers.productId, productId))
    );

    for (const gid of modifierGroupIds ?? []) {
      await db.insert(productModifiers).values({
        tenantId: auth.tenantId,
        productId,
        modifierGroupId: gid,
      });
    }

    res.status(201).json({ ok: true });
  },
});
