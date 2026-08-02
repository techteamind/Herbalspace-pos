import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { recipeItems, products, ingredients } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

export default createHandler({
  // GET /api/recipes?productId= -> daftar bahan resep + info bahan
  async GET(req, res, auth) {
    const productId = String(req.query.productId ?? "");
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }
    const rows = await db.query.recipeItems.findMany({
      where: and(eq(recipeItems.productId, productId), eq(recipeItems.tenantId, auth.tenantId)),
      with: { ingredient: { with: { unit: true } } },
    });
    res.json(rows);
  },

  // PUT /api/recipes -> ganti seluruh resep produk + hitung ulang HPP
  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { productId, items } = req.body as {
      productId: string;
      items: { ingredientId: string; quantity: number }[];
    };
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }
    if (!Array.isArray(items)) { res.status(400).json({ error: "items wajib berupa array" }); return; }
    // Validasi: qty > 0 (qty negatif bisa MENAMBAH stok saat jual) & bahan valid.
    for (const it of items) {
      if (!it.ingredientId || !(Number(it.quantity) > 0)) {
        res.status(400).json({ error: "Item resep tidak valid: qty harus lebih dari 0" });
        return;
      }
    }
    // Bahan wajib milik tenant ini (cegah resep merujuk bahan tenant lain → HPP bocor).
    const ingIds = [...new Set(items.map((it) => it.ingredientId))];
    if (ingIds.length > 0) {
      const owned = await db.query.ingredients.findMany({
        where: and(inArray(ingredients.id, ingIds), eq(ingredients.tenantId, auth.tenantId)),
        columns: { id: true },
      });
      if (owned.length !== ingIds.length) {
        res.status(400).json({ error: "Ada bahan yang tidak ditemukan di outlet Anda" });
        return;
      }
    }

    const result = await db.transaction(async (tx) => {
      await tx.delete(recipeItems).where(
        and(eq(recipeItems.productId, productId), eq(recipeItems.tenantId, auth.tenantId)),
      );
      if (items.length > 0) {
        await tx.insert(recipeItems).values(items.map((it) => ({
          tenantId: auth.tenantId,
          productId,
          ingredientId: it.ingredientId,
          quantity: String(it.quantity),
        })));
      }
      // hitung HPP dari resep × harga bahan terakhir
      const withCost = await tx.query.recipeItems.findMany({
        where: and(eq(recipeItems.productId, productId), eq(recipeItems.tenantId, auth.tenantId)),
        with: { ingredient: true },
      });
      const hpp = withCost.reduce((sum, r) => sum + Number(r.quantity) * Number(r.ingredient.lastCost), 0);
      await tx.update(products)
        .set({ costPrice: String(hpp), updatedAt: new Date() })
        .where(and(eq(products.id, productId), eq(products.tenantId, auth.tenantId)));
      return { hpp };
    });

    res.json(result);
  },
});
