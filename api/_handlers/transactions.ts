import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { transactions, stockMovements, ingredients, customers } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { logAudit } from "../_lib/audit.js";
import { outletFilter, requireRole } from "../_lib/auth.js";

export default createHandler({
  async GET(req, res, auth) {
    const { from, to, limit: limitStr, outletId: qsOutletId } = req.query;
    // ponytail: cap 1000 baris; laporan periode panjang butuh agregasi server
    const limit = Math.min(Number(limitStr) || 50, 1000);

    // kasir terkunci ke outlet-nya sendiri; hanya manager/owner boleh memilih outlet lain
    const canPickOutlet = auth.role === "manager" || auth.role === "owner";
    const effectiveOutletId = canPickOutlet && qsOutletId ? (qsOutletId as string) : auth.outletId;
    const conditions = [eq(transactions.tenantId, auth.tenantId)];
    const txOf = outletFilter(transactions.outletId, effectiveOutletId);
    if (txOf) conditions.push(txOf);
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

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { id, action, reason } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }

    if (action === "void") {
      const txn = await db.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.tenantId, auth.tenantId)),
      });
      if (!txn) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }
      if (txn.status === "void") { res.status(400).json({ error: "Transaksi sudah di-void" }); return; }

      let alreadyVoided = false;
      await db.transaction(async (tx) => {
        // gate atomik: hanya satu void yang lolos; mencegah double-restore stok
        const flipped = await tx.update(transactions).set({ status: "void" })
          .where(and(
            eq(transactions.id, id),
            eq(transactions.tenantId, auth.tenantId),
            sql`${transactions.status} <> 'void'`,
          ))
          .returning({ id: transactions.id });
        if (flipped.length === 0) { alreadyVoided = true; return; }

        if (txn.customerId) {
          const total = Number(txn.total);
          const earnedPoints = Math.floor(total / 10000);
          await tx.update(customers).set({
            points: sql`GREATEST(${customers.points} - ${earnedPoints}, 0)`,
            totalSpent: sql`GREATEST(${customers.totalSpent} - ${total}, 0)`,
          }).where(and(eq(customers.id, txn.customerId), eq(customers.tenantId, auth.tenantId)));
        }

        // restore berdasar movement yang TERCATAT saat penjualan (bukan resep saat
        // ini) — akurat walau resep sudah berubah sejak transaksi dibuat
        const saleMovements = await tx.select().from(stockMovements)
          .where(and(
            eq(stockMovements.tenantId, auth.tenantId),
            eq(stockMovements.referenceId, id),
            eq(stockMovements.type, "sale"),
          ));

        for (const mv of saleMovements) {
          const restoreQty = -Number(mv.qtyChange);
          if (restoreQty <= 0) continue;
          const [updated] = await tx.update(ingredients)
            .set({ currentStock: sql`${ingredients.currentStock} + ${restoreQty}` })
            .where(and(eq(ingredients.id, mv.ingredientId), eq(ingredients.tenantId, auth.tenantId)))
            .returning({ currentStock: ingredients.currentStock });

          await tx.insert(stockMovements).values({
            tenantId: auth.tenantId,
            ingredientId: mv.ingredientId,
            type: "return",
            qtyChange: String(restoreQty),
            balanceAfter: String(updated?.currentStock ?? 0),
            refType: "transaction",
            referenceId: id,
            note: reason ? `Void: ${reason}` : `Void transaksi ${txn.number}`,
            createdBy: auth.userId,
          });
        }
      });
      if (alreadyVoided) { res.status(400).json({ error: "Transaksi sudah di-void" }); return; }

      await logAudit(auth, "void", "transaction", id, { number: txn.number, reason });
      res.json({ success: true });
      return;
    }

    res.status(400).json({ error: "Action tidak valid" });
  },
});
