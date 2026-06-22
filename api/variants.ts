import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { variantGroups, variantOptions, productVariants } from "../db/schema";
import { createHandler } from "./_lib/handler";

export default createHandler({
  async GET(req, res, auth) {
    const productId = String(req.query.productId ?? "");
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }
    const groups = await db.query.variantGroups.findMany({
      where: and(eq(variantGroups.tenantId, auth.tenantId), eq(variantGroups.productId, productId)),
      with: { options: true },
    });
    const variants = await db.query.productVariants.findMany({
      where: and(eq(productVariants.tenantId, auth.tenantId), eq(productVariants.productId, productId)),
    });
    res.json({ groups, variants });
  },

  async POST(req, res, auth) {
    const { productId, groups, variants } = req.body as {
      productId: string;
      groups: { name: string; options: string[] }[];
      variants: { optionIds: string[]; label: string; sku?: string; price: number; costPrice?: number }[];
    };
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }

    await db.delete(productVariants).where(and(eq(productVariants.tenantId, auth.tenantId), eq(productVariants.productId, productId)));
    const existingGroups = await db.query.variantGroups.findMany({
      where: and(eq(variantGroups.tenantId, auth.tenantId), eq(variantGroups.productId, productId)),
    });
    for (const g of existingGroups) {
      await db.delete(variantOptions).where(eq(variantOptions.groupId, g.id));
    }
    await db.delete(variantGroups).where(and(eq(variantGroups.tenantId, auth.tenantId), eq(variantGroups.productId, productId)));

    const optionIdMap: Record<string, string> = {};
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]!;
      const [grp] = await db.insert(variantGroups).values({
        tenantId: auth.tenantId,
        productId,
        name: g.name,
        sortOrder: gi,
      }).returning();
      if (!grp) continue;
      for (let oi = 0; oi < g.options.length; oi++) {
        const label = g.options[oi]!;
        const [opt] = await db.insert(variantOptions).values({
          tenantId: auth.tenantId,
          groupId: grp.id,
          label,
          sortOrder: oi,
        }).returning();
        if (opt) optionIdMap[`${gi}-${oi}`] = opt.id;
      }
    }

    const createdVariants = [];
    for (const v of variants) {
      const resolvedIds = v.optionIds.map((key) => optionIdMap[key] ?? key);
      const [row] = await db.insert(productVariants).values({
        tenantId: auth.tenantId,
        productId,
        optionIds: resolvedIds,
        label: v.label,
        sku: v.sku || null,
        price: String(v.price),
        costPrice: String(v.costPrice ?? 0),
      }).returning();
      createdVariants.push(row);
    }

    res.status(201).json({ ok: true, variants: createdVariants });
  },
});
