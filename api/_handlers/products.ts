import { eq, and, asc, or, isNull } from "drizzle-orm";
import { db } from "../../db";
import { products, priceHistory } from "../../db/schema";
import { createHandler } from "../_lib/handler";
import { logAudit } from "../_lib/audit";

export default createHandler({
  async GET(_req, res, auth) {
    const where = auth.outletId
      ? and(eq(products.tenantId, auth.tenantId), or(eq(products.outletId, auth.outletId), isNull(products.outletId)))
      : eq(products.tenantId, auth.tenantId);
    const rows = await db.query.products.findMany({
      where,
      with: { category: true, variantGroups: { with: { options: true } }, variants: true, modifiers: { with: { modifierGroup: { with: { options: true } } } } },
      orderBy: asc(products.name),
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, price, costPrice, categoryId, sku, imageUrl } = req.body;
    const [row] = await db.insert(products).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId,
      name,
      price: String(price ?? 0),
      costPrice: String(costPrice ?? 0),
      categoryId: categoryId || null,
      sku: sku || null,
      imageUrl: imageUrl || null,
    }).returning();
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    const { id, ...data } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.price !== undefined) updates.price = String(data.price);
    if (data.costPrice !== undefined) updates.costPrice = String(data.costPrice);
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId || null;
    if (data.sku !== undefined) updates.sku = data.sku || null;
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl || null;
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
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(products).where(and(eq(products.id, id), eq(products.tenantId, auth.tenantId)));
    await logAudit(auth, "delete", "product", id);
    res.status(204).end();
  },
});
