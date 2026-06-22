import { eq, and, desc, gte, sql, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { shifts, transactions, payments } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { logAudit } from "../_lib/audit.js";

export default createHandler({
  async GET(req, res, auth) {
    const active = req.query.active === "true";
    if (active) {
      const conds = [eq(shifts.tenantId, auth.tenantId), isNull(shifts.closedAt)];
      if (auth.outletId) conds.push(eq(shifts.outletId, auth.outletId));
      const row = await db.query.shifts.findFirst({
        where: and(...conds),
        with: { cashier: true },
      });
      res.json(row ?? null);
      return;
    }

    const where = auth.outletId
      ? and(eq(shifts.tenantId, auth.tenantId), eq(shifts.outletId, auth.outletId))
      : eq(shifts.tenantId, auth.tenantId);
    const rows = await db.query.shifts.findMany({
      where,
      orderBy: desc(shifts.openedAt),
      limit: 50,
      with: { cashier: true },
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const existConds = [eq(shifts.tenantId, auth.tenantId), isNull(shifts.closedAt)];
    if (auth.outletId) existConds.push(eq(shifts.outletId, auth.outletId));
    const existing = await db.query.shifts.findFirst({
      where: and(...existConds),
    });
    if (existing) { res.status(400).json({ error: "Sudah ada shift aktif. Tutup dulu sebelum buka baru." }); return; }

    const { openingCash } = req.body;
    const [row] = await db.insert(shifts).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId,
      cashierId: auth.userId,
      cashierName: auth.profileName,
      openingCash: String(openingCash ?? 0),
    }).returning();
    if (row) await logAudit(auth, "open", "shift", row.id, { openingCash: String(openingCash ?? 0) });
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    const { id, action, closingCash, note } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }

    if (action === "close") {
      const shift = await db.query.shifts.findFirst({
        where: and(eq(shifts.id, id), eq(shifts.tenantId, auth.tenantId)),
      });
      if (!shift) { res.status(404).json({ error: "Shift tidak ditemukan" }); return; }
      if (shift.closedAt) { res.status(400).json({ error: "Shift sudah ditutup" }); return; }

      const salesResult = await db
        .select({
          total: sql<string>`coalesce(sum(${transactions.total}), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, auth.tenantId),
            eq(transactions.status, "paid"),
            gte(transactions.createdAt, shift.openedAt),
          ),
        );

      const cashPayments = await db
        .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .innerJoin(transactions, eq(payments.transactionId, transactions.id))
        .where(
          and(
            eq(transactions.tenantId, auth.tenantId),
            eq(transactions.status, "paid"),
            eq(payments.method, "cash"),
            gte(transactions.createdAt, shift.openedAt),
          ),
        );

      const totalSales = salesResult[0]?.total ?? "0";
      const txnCount = salesResult[0]?.count ?? 0;
      const expectedCash = Number(shift.openingCash) + Number(cashPayments[0]?.total ?? 0);

      const [updated] = await db.update(shifts).set({
        closedAt: new Date(),
        closingCash: String(closingCash ?? 0),
        expectedCash: String(expectedCash),
        totalSales,
        totalTransactions: txnCount,
        note: note || null,
      }).where(eq(shifts.id, id)).returning();

      await logAudit(auth, "close", "shift", id, { closingCash: String(closingCash ?? 0), totalSales, txnCount });
      res.json(updated);
      return;
    }

    res.status(400).json({ error: "Action tidak valid" });
  },
});
