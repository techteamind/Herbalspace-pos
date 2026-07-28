import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, productVariants } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

// Terima / sesuaikan stok barang jadi (produk atau varian). qtyChange positif =
// terima barang, negatif = koreksi. Atomik (COALESCE(stock,0)+delta) supaya
// penerimaan bersamaan tidak saling menimpa; produk yang tadinya tak dilacak
// (stock NULL) otomatis mulai dilacak begitu diterima.
export default createHandler({
  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { adjustments } = req.body as {
      adjustments: { productId?: string; variantId?: string; qtyChange: number }[];
    };
    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      res.status(400).json({ error: "adjustments wajib" });
      return;
    }

    await db.transaction(async (tx) => {
      for (const a of adjustments) {
        const qty = Number(a.qtyChange);
        if (!Number.isFinite(qty) || qty === 0) continue;
        if (a.variantId) {
          await tx.update(productVariants)
            .set({ stock: sql`COALESCE(${productVariants.stock}, 0) + ${qty}` })
            .where(and(eq(productVariants.id, a.variantId), eq(productVariants.tenantId, auth.tenantId)));
        } else if (a.productId) {
          await tx.update(products)
            .set({ stock: sql`COALESCE(${products.stock}, 0) + ${qty}`, updatedAt: new Date() })
            .where(and(eq(products.id, a.productId), eq(products.tenantId, auth.tenantId)));
        }
      }
    });

    await logAudit(auth, "adjust", "product", adjustments[0]?.productId ?? adjustments[0]?.variantId ?? "", { count: adjustments.length });
    res.json({ success: true });
  },
});
