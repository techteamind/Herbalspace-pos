import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productModifiers, products, modifierGroups } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

export default createHandler({
  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { productId, modifierGroupIds } = req.body as { productId: string; modifierGroupIds: string[] };
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }
    const gids = [...new Set((modifierGroupIds ?? []).filter(Boolean))];

    // Validasi kepemilikan tenant: produk + semua grup modifier harus milik tenant
    // ini (cegah attach/baca-balik grup modifier tenant lain via join produk).
    const owned = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.tenantId, auth.tenantId)),
      columns: { id: true },
    });
    if (!owned) { res.status(404).json({ error: "Produk tidak ditemukan" }); return; }
    if (gids.length) {
      const valid = await db.select({ id: modifierGroups.id }).from(modifierGroups)
        .where(and(eq(modifierGroups.tenantId, auth.tenantId), inArray(modifierGroups.id, gids)));
      if (valid.length !== gids.length) { res.status(400).json({ error: "Grup modifier tidak valid" }); return; }
    }

    await db.transaction(async (tx) => {
      await tx.delete(productModifiers).where(
        and(eq(productModifiers.tenantId, auth.tenantId), eq(productModifiers.productId, productId))
      );
      for (const gid of gids) {
        await tx.insert(productModifiers).values({ tenantId: auth.tenantId, productId, modifierGroupId: gid });
      }
    });

    res.status(201).json({ ok: true });
  },
});
