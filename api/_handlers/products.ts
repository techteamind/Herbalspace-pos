import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, priceHistory, categories } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

// Kategori (kalau diisi) wajib milik tenant ini — cegah point/baca-balik kategori tenant lain.
async function ownedCategory(categoryId: string, tenantId: string): Promise<boolean> {
  const row = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)),
    columns: { id: true },
  });
  return !!row;
}

export default createHandler({
  async GET(_req, res, auth) {
    const pOf = outletFilter(products.outletId, auth.outletId);
    const where = pOf
      ? and(eq(products.tenantId, auth.tenantId), pOf)
      : eq(products.tenantId, auth.tenantId);
    const rows = await db.query.products.findMany({
      where,
      with: { category: true, variantGroups: { with: { options: true } }, variants: true, modifiers: { with: { modifierGroup: { with: { options: true } } } } },
      orderBy: asc(products.name),
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { name, price, costPrice, categoryId, sku, imageUrl, stock } = req.body;
    if (!name || typeof name !== "string") { res.status(400).json({ error: "name wajib" }); return; }
    if (price === undefined || isNaN(Number(price))) { res.status(400).json({ error: "price wajib dan harus angka" }); return; }
    if (Number(price) < 0 || Number(costPrice ?? 0) < 0) { res.status(400).json({ error: "Harga & modal tidak boleh negatif" }); return; }
    if (stock !== undefined && stock !== null && stock !== "" && Number(stock) < 0) { res.status(400).json({ error: "Stok tidak boleh negatif" }); return; }
    if (categoryId && !(await ownedCategory(categoryId, auth.tenantId))) { res.status(400).json({ error: "Kategori tidak ditemukan" }); return; }
    const [row] = await db.insert(products).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId,
      name,
      price: String(price ?? 0),
      costPrice: String(costPrice ?? 0),
      categoryId: categoryId || null,
      sku: sku || null,
      imageUrl: imageUrl || null,
      stock: stock === undefined || stock === null || stock === "" ? null : Number(stock),
    }).returning();
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    if ((data.price !== undefined && Number(data.price) < 0) || (data.costPrice !== undefined && Number(data.costPrice) < 0)) {
      res.status(400).json({ error: "Harga & modal tidak boleh negatif" }); return;
    }
    if (data.stock !== undefined && data.stock !== null && data.stock !== "" && Number(data.stock) < 0) {
      res.status(400).json({ error: "Stok tidak boleh negatif" }); return;
    }
    if (data.categoryId && !(await ownedCategory(data.categoryId, auth.tenantId))) { res.status(400).json({ error: "Kategori tidak ditemukan" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.price !== undefined) updates.price = String(data.price);
    if (data.costPrice !== undefined) updates.costPrice = String(data.costPrice);
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId || null;
    if (data.sku !== undefined) updates.sku = data.sku || null;
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl || null;
    if (data.stock !== undefined) updates.stock = data.stock === null || data.stock === "" ? null : Number(data.stock);
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    let oldPrice: string | undefined;
    if (data.price !== undefined) {
      const [existing] = await db.select({ price: products.price }).from(products)
        .where(and(eq(products.id, id), eq(products.tenantId, auth.tenantId)));
      if (existing && existing.price !== String(data.price)) oldPrice = existing.price;
    }

    const [row] = await db.update(products)
      .set(updates)
      .where(and(eq(products.id, id), eq(products.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Produk tidak ditemukan" }); return; }

    if (oldPrice !== undefined) {
      await db.insert(priceHistory).values({
        tenantId: auth.tenantId,
        productId: id,
        oldPrice,
        newPrice: String(data.price),
        changedBy: auth.userId,
      });
      await logAudit(auth, "price_change", "product", id, { name: row.name, oldPrice, newPrice: String(data.price) });
    }

    res.json(row);
  },

  async DELETE(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const [row] = await db.update(products).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Produk tidak ditemukan" }); return; }
    await logAudit(auth, "deactivate", "product", id, { name: row.name });
    res.json(row);
  },
});
