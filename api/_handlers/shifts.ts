import { eq, and, desc, gte, sql, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { shifts, transactions, payments, settings } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { logAudit } from "../_lib/audit.js";
import { outletFilter } from "../_lib/auth.js";

type OpenShift = typeof shifts.$inferSelect;

// Batas "shift kadaluarsa" = kemunculan jam tutup toko (WIB) paling akhir. Shift
// yang dibuka sebelum batas ini berarti lupa ditutup semalam → auto-tutup.
// closingTime "HH:MM"; kalau null pakai tengah malam WIB (awal hari ini).
function mostRecentClosingBoundary(closingTime: string | null): Date {
  const WIB = 7 * 3600_000;
  const nowWib = new Date(Date.now() + WIB);
  const [h, m] = (closingTime && /^\d{1,2}:\d{2}$/.test(closingTime))
    ? closingTime.split(":").map(Number) : [0, 0];
  const todayClose = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate(), h, m));
  const boundaryWib = nowWib >= todayClose ? todayClose : new Date(todayClose.getTime() - 86400_000);
  return new Date(boundaryWib.getTime() - WIB); // kembali ke UTC
}

// Tutup shift secara sistem (pergantian kasir / lupa tutup). closingCash = expected
// (tak ada yang hitung manual), ditandai supaya owner tahu.
async function autoCloseShift(shift: OpenShift, reason: string): Promise<void> {
  const [sales] = await db.select({ total: sql<string>`coalesce(sum(${transactions.total}),0)`, count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.tenantId, shift.tenantId), eq(transactions.status, "paid"),
      gte(transactions.createdAt, shift.openedAt), ...(shift.outletId ? [eq(transactions.outletId, shift.outletId)] : [])));
  const [cash] = await db.select({ total: sql<string>`coalesce(sum(${payments.amount}),0)` })
    .from(payments).innerJoin(transactions, eq(payments.transactionId, transactions.id))
    .where(and(eq(transactions.tenantId, shift.tenantId), eq(transactions.status, "paid"), eq(payments.method, "cash"),
      gte(transactions.createdAt, shift.openedAt), ...(shift.outletId ? [eq(transactions.outletId, shift.outletId)] : [])));
  const expected = Number(shift.openingCash) + Number(cash?.total ?? 0);
  await db.update(shifts).set({
    closedAt: new Date(), closingCash: String(expected), expectedCash: String(expected),
    totalSales: sales?.total ?? "0", totalTransactions: sales?.count ?? 0,
    note: `Ditutup otomatis (${reason})`,
  }).where(eq(shifts.id, shift.id));
}

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

    const shiftOf = outletFilter(shifts.outletId, auth.outletId);
    const where = shiftOf
      ? and(eq(shifts.tenantId, auth.tenantId), shiftOf)
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
    // Shift wajib terikat outlet: tanpa itu, rekonsiliasi kas saat tutup akan
    // menjumlah SELURUH outlet tenant (angka kas ngawur di bisnis multi-outlet).
    if (!auth.outletId) {
      res.status(400).json({ error: "Pilih outlet dulu sebelum membuka shift" });
      return;
    }
    const existConds = [eq(shifts.tenantId, auth.tenantId), isNull(shifts.closedAt)];
    if (auth.outletId) existConds.push(eq(shifts.outletId, auth.outletId));
    const existing = await db.query.shifts.findFirst({
      where: and(...existConds),
    });
    if (existing) {
      const st = await db.query.settings.findFirst({ where: eq(settings.tenantId, auth.tenantId), columns: { closingTime: true } });
      const stale = existing.openedAt < mostRecentClosingBoundary(st?.closingTime ?? null);
      if (existing.cashierId === auth.userId && !stale) {
        // Shift sendiri masih aktif hari ini → lanjutkan (jangan buat duplikat).
        res.status(200).json(existing);
        return;
      }
      // Shift kasir lain / lupa ditutup semalam → tutup otomatis, lalu buka baru.
      await autoCloseShift(existing, stale ? "lupa ditutup" : "pergantian kasir");
    }

    const { openingCash } = req.body;
    let row;
    try {
      // unique index shifts_open_unq adalah gate sebenarnya: dua "buka shift"
      // bersamaan tak bisa dua-duanya lolos (cek di atas cuma fast-path).
      [row] = await db.insert(shifts).values({
        tenantId: auth.tenantId,
        outletId: auth.outletId,
        cashierId: auth.userId,
        cashierName: auth.profileName,
        openingCash: String(openingCash ?? 0),
      }).returning();
    } catch (err) {
      if (err instanceof Error && /shifts_open_unq|duplicate key/.test(err.message)) {
        res.status(409).json({ error: "Sudah ada shift aktif. Tutup dulu sebelum buka baru." });
        return;
      }
      throw err;
    }
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
      // Hanya kasir pemilik shift, atau manager/owner, yang boleh menutup shift.
      const isPrivileged = auth.role === "manager" || auth.role === "owner";
      if (shift.cashierId !== auth.userId && !isPrivileged) {
        res.status(403).json({ error: "Tidak bisa menutup shift kasir lain" });
        return;
      }

      const shiftOutletId = shift.outletId;
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
            ...(shiftOutletId ? [eq(transactions.outletId, shiftOutletId)] : []),
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
            ...(shiftOutletId ? [eq(transactions.outletId, shiftOutletId)] : []),
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
      }).where(and(eq(shifts.id, id), eq(shifts.tenantId, auth.tenantId))).returning();

      await logAudit(auth, "close", "shift", id, { closingCash: String(closingCash ?? 0), totalSales, txnCount });
      res.json(updated);
      return;
    }

    res.status(400).json({ error: "Action tidak valid" });
  },
});
