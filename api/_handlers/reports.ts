import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

// Agregasi laporan di SERVER (SUM/GROUP BY) — menggantikan hitung di klien atas
// daftar transaksi yang di-cap 1000 & pengeluaran 100 (omzet/laba jadi salah saat
// periode ramai). Scope: tenant + (outlet aktif ATAU null) sesuai dashboard.
export default createHandler({
  async GET(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return; // laporan keuangan: manager+
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    if (!from || !to) { res.status(400).json({ error: "from & to (ISO) wajib" }); return; }

    const tOutlet = auth.outletId ? sql` AND (t.outlet_id = ${auth.outletId}::uuid OR t.outlet_id IS NULL)` : sql``;
    const eOutlet = auth.outletId ? sql` AND (e.outlet_id = ${auth.outletId}::uuid OR e.outlet_id IS NULL)` : sql``;
    const pOutlet = auth.outletId ? sql` AND (p.outlet_id = ${auth.outletId}::uuid OR p.outlet_id IS NULL)` : sql``;
    const iOutlet = auth.outletId ? sql` AND (i.outlet_id = ${auth.outletId}::uuid OR i.outlet_id IS NULL)` : sql``;

    const num = (v: unknown): number => Number(v ?? 0);

    const [salesRow] = await db.execute(sql`
      SELECT
        COALESCE(SUM(t.total::numeric), 0)       AS omzet,
        COALESCE(SUM(t.cogs_total::numeric), 0)  AS hpp,
        COALESCE(SUM(t.discount::numeric), 0)    AS discount,
        COALESCE(SUM(t.tax_amount::numeric + t.service_charge::numeric), 0) AS tax_service,
        COUNT(*)::int                            AS trx_count
      FROM transactions t
      WHERE t.tenant_id = ${auth.tenantId}::uuid AND t.status = 'paid'
        AND t.created_at >= ${from}::timestamptz AND t.created_at < ${to}::timestamptz
        ${tOutlet}
    `);
    const s = salesRow as Record<string, unknown>;

    const [expRow] = await db.execute(sql`
      SELECT COALESCE(SUM(e.amount::numeric), 0) AS total
      FROM expenses e
      WHERE e.tenant_id = ${auth.tenantId}::uuid
        AND e.spent_at >= ${from}::timestamptz AND e.spent_at < ${to}::timestamptz
        ${eOutlet}
    `);

    const expenseByCategory = await db.execute(sql`
      SELECT COALESCE(ec.name, 'Lainnya') AS category, SUM(e.amount::numeric) AS total
      FROM expenses e LEFT JOIN expense_categories ec ON ec.id = e.category_id
      WHERE e.tenant_id = ${auth.tenantId}::uuid
        AND e.spent_at >= ${from}::timestamptz AND e.spent_at < ${to}::timestamptz
        ${eOutlet}
      GROUP BY COALESCE(ec.name, 'Lainnya')
      ORDER BY total DESC
    `);

    const topProducts = await db.execute(sql`
      SELECT ti.product_name AS name, SUM(ti.line_total::numeric) AS total
      FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.tenant_id = ${auth.tenantId}::uuid AND t.status = 'paid'
        AND t.created_at >= ${from}::timestamptz AND t.created_at < ${to}::timestamptz
        ${tOutlet}
      GROUP BY ti.product_name ORDER BY total DESC LIMIT 5
    `);

    const paymentBreakdown = await db.execute(sql`
      SELECT pm.method AS method, COUNT(DISTINCT t.id)::int AS trx, SUM(pm.amount::numeric) AS total
      FROM payments pm JOIN transactions t ON t.id = pm.transaction_id
      WHERE t.tenant_id = ${auth.tenantId}::uuid AND t.status = 'paid'
        AND t.created_at >= ${from}::timestamptz AND t.created_at < ${to}::timestamptz
        ${tOutlet}
      GROUP BY pm.method ORDER BY total DESC
    `);

    // Penjualan per kategori (qty terjual, omzet, HPP) untuk laporan detail.
    const categoryBreakdown = await db.execute(sql`
      SELECT COALESCE(c.name, 'Tanpa Kategori') AS category,
             SUM(ti.quantity)::int              AS qty,
             SUM(ti.line_total::numeric)        AS total,
             SUM(ti.unit_cogs::numeric * ti.quantity) AS hpp
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE t.tenant_id = ${auth.tenantId}::uuid AND t.status = 'paid'
        AND t.created_at >= ${from}::timestamptz AND t.created_at < ${to}::timestamptz
        ${tOutlet}
      GROUP BY COALESCE(c.name, 'Tanpa Kategori')
      ORDER BY total DESC
    `);

    const [ingRow] = await db.execute(sql`
      SELECT COALESCE(SUM(i.current_stock::numeric * i.last_cost::numeric), 0) AS value
      FROM ingredients i
      WHERE i.tenant_id = ${auth.tenantId}::uuid AND i.is_active = true ${iOutlet}
    `);

    // Nilai stok barang jadi: varian diutamakan; produk tanpa varian pakai stok produk.
    const [prodRow] = await db.execute(sql`
      SELECT
        COALESCE((SELECT SUM(COALESCE(v.stock, 0) * v.cost_price::numeric)
                  FROM product_variants v JOIN products p ON p.id = v.product_id
                  WHERE p.tenant_id = ${auth.tenantId}::uuid AND p.is_active = true ${pOutlet}), 0)
      + COALESCE((SELECT SUM(COALESCE(p.stock, 0) * p.cost_price::numeric)
                  FROM products p
                  WHERE p.tenant_id = ${auth.tenantId}::uuid AND p.is_active = true ${pOutlet}
                    AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)), 0)
        AS value
    `);

    const rowsOf = (r: unknown): Record<string, unknown>[] => r as Record<string, unknown>[];

    res.json({
      omzet: num(s.omzet),
      hpp: num(s.hpp),
      totalDiscount: num(s.discount),
      taxService: num(s.tax_service),
      trxCount: num(s.trx_count),
      expenseTotal: num((expRow as Record<string, unknown>).total),
      expenseByCategory: rowsOf(expenseByCategory).map((r) => ({ category: String(r.category), total: num(r.total) })),
      topProducts: rowsOf(topProducts).map((r) => ({ name: String(r.name), total: num(r.total) })),
      paymentBreakdown: rowsOf(paymentBreakdown).map((r) => ({ method: String(r.method), trx: num(r.trx), total: num(r.total) })),
      categoryBreakdown: rowsOf(categoryBreakdown).map((r) => ({ category: String(r.category), qty: num(r.qty), total: num(r.total), hpp: num(r.hpp) })),
      stockValue: num((ingRow as Record<string, unknown>).value),
      productStockValue: num((prodRow as Record<string, unknown>).value),
    });
  },
});
