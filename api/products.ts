import { eq, and, asc } from "drizzle-orm";
import { db } from "../db";
import { products } from "../db/schema";
import { createHandler } from "./_lib/handler";

export default createHandler({
  async GET(_req, res, auth) {
    const rows = await db.query.products.findMany({
      where: eq(products.tenantId, auth.tenantId),
      with: { category: true },
      orderBy: asc(products.name),
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, price, costPrice, categoryId, sku, imageUrl } = req.body;
    const [row] = await db.insert(products).values({
      tenantId: auth.tenantId,
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

    const [row] = await db.update(products)
      .set(updates)
      .where(and(eq(products.id, id), eq(products.tenantId, auth.tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Produk tidak ditemukan" }); return; }
    res.json(row);
  },

  async DELETE(req, res, auth) {
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(products).where(and(eq(products.id, id), eq(products.tenantId, auth.tenantId)));
    res.status(204).end();
  },
});
