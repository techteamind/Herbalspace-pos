import { eq, and, desc, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { transactions } from "../db/schema";
import { createHandler } from "./_lib/handler";

export default createHandler({
  async GET(req, res, auth) {
    const { from, to, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 50, 200);

    const conditions = [eq(transactions.tenantId, auth.tenantId)];
    if (from) conditions.push(gte(transactions.createdAt, new Date(from as string)));
    if (to) conditions.push(lt(transactions.createdAt, new Date(to as string)));

    const rows = await db.query.transactions.findMany({
      where: and(...conditions),
      orderBy: desc(transactions.createdAt),
      limit,
      with: { items: true, payments: true, customer: true, cashier: true },
    });
    res.json(rows);
  },
});
