import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { recipeItems, products } from "../db/schema";
import { createHandler } from "./_lib/handler";

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
    const { productId, items } = req.body as {
      productId: string;
      items: { ingredientId: string; quantity: number }[];
    };
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }

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
