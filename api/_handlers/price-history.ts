import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { priceHistory } from "../../db/schema";
import { createHandler } from "../_lib/handler";

export default createHandler({
  async GET(req, res, auth) {
    const productId = String(req.query.productId ?? "");
    if (!productId) { res.status(400).json({ error: "productId wajib" }); return; }
    const rows = await db.select().from(priceHistory)
      .where(and(eq(priceHistory.productId, productId), eq(priceHistory.tenantId, auth.tenantId)))
      .orderBy(desc(priceHistory.changedAt))
      .limit(50);
    res.json(rows);
  },
});
