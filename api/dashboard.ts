import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { transactions, ingredients, units } from "../db/schema";
import { createHandler } from "./_lib/handler";

export default createHandler({
  async GET(req, res, auth) {
    const { section } = req.query;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    if (section === "stats") {
      const [todayRows] = await db.execute(sql`
        SELECT
          COALESCE(SUM(total::numeric), 0) AS revenue,
          COUNT(*)::int AS trx_count,
          COALESCE(SUM((SELECT SUM(quantity) FROM transaction_items ti WHERE ti.transaction_id = t.id)), 0)::int AS products_sold
        FROM transactions t
        WHERE t.tenant_id = ${auth.tenantId}::uuid
          AND t.status = 'paid'
          AND t.created_at >= ${todayStart.toISOString()}::timestamptz
      `);
      const [yesterdayRows] = await db.execute(sql`
        SELECT
          COALESCE(SUM(total::numeric), 0) AS revenue,
          COUNT(*)::int AS trx_count,
          COALESCE(SUM((SELECT SUM(quantity) FROM transaction_items ti WHERE ti.transaction_id = t.id)), 0)::int AS products_sold
        FROM transactions t
        WHERE t.tenant_id = ${auth.tenantId}::uuid
          AND t.status = 'paid'
          AND t.created_at >= ${yesterdayStart.toISOString()}::timestamptz
          AND t.created_at < ${todayStart.toISOString()}::timestamptz
      `);
      const today = todayRows as Record<string, unknown>;
      const yesterday = yesterdayRows as Record<string, unknown>;
      const todayRev = Number(today.revenue ?? 0);
      const todayTrx = Number(today.trx_count ?? 0);
      res.json({
        todayRevenue: todayRev,
        todayTransactions: todayTrx,
        todayProductsSold: Number(today.products_sold ?? 0),
        avgPerTransaction: todayTrx > 0 ? Math.round(todayRev / todayTrx) : 0,
        yesterdayRevenue: Number(yesterday.revenue ?? 0),
        yesterdayTransactions: Number(yesterday.trx_count ?? 0),
        yesterdayProductsSold: Number(yesterday.products_sold ?? 0),
      });
      return;
    }

    if (section === "recent-transactions") {
      const rows = await db.query.transactions.findMany({
        where: and(
          eq(transactions.tenantId, auth.tenantId),
          eq(transactions.status, "paid"),
        ),
        orderBy: desc(transactions.createdAt),
        limit: 10,
        with: { items: true, payments: true, customer: true, cashier: true },
      });
      res.json(rows);
      return;
    }

    if (section === "top-products") {
      const rows = await db.execute(sql`
        SELECT
          ti.product_id,
          ti.product_name,
          SUM(ti.quantity)::int AS total_sold,
          SUM(ti.line_total::numeric) AS total_revenue
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.tenant_id = ${auth.tenantId}::uuid
          AND t.status = 'paid'
          AND t.created_at >= ${todayStart.toISOString()}::timestamptz
        GROUP BY ti.product_id, ti.product_name
        ORDER BY total_sold DESC
        LIMIT 10
      `);
      res.json(rows);
      return;
    }

    if (section === "low-stock") {
      const rows = await db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          currentStock: ingredients.currentStock,
          minStock: ingredients.minStock,
          unitCode: units.code,
        })
        .from(ingredients)
        .innerJoin(units, eq(units.id, ingredients.unitId))
        .where(
          and(
            eq(ingredients.tenantId, auth.tenantId),
            eq(ingredients.isActive, true),
            sql`${ingredients.currentStock}::numeric <= ${ingredients.minStock}::numeric`,
          ),
        );
      res.json(rows);
      return;
    }

    res.status(400).json({ error: "Parameter section wajib diisi: stats | recent-transactions | top-products | low-stock" });
  },
});
