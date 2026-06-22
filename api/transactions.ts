import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { transactions, stockMovements, ingredients, recipeItems } from "../db/schema";
import { createHandler } from "./_lib/handler";
import { logAudit } from "./_lib/audit";

export default createHandler({
  async GET(req, res, auth) {
    const { from, to, limit: limitStr, outletId: qsOutletId } = req.query;
    const limit = Math.min(Number(limitStr) || 50, 200);

    const effectiveOutletId = (qsOutletId as string) || auth.outletId;
    const conditions = [eq(transactions.tenantId, auth.tenantId)];
    if (effectiveOutletId) conditions.push(eq(transactions.outletId, effectiveOutletId));
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
    const { id, action, reason } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }

    if (action === "void") {
      const txn = await db.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.tenantId, auth.tenantId)),
        with: { items: true },
      });
      if (!txn) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }
      if (txn.status === "void") { res.status(400).json({ error: "Transaksi sudah di-void" }); return; }

      await db.transaction(async (tx) => {
        await tx.update(transactions).set({ status: "void" })
          .where(eq(transactions.id, id));

        for (const item of txn.items) {
          if (!item.productId) continue;
          const recipes = await tx.select().from(recipeItems)
            .where(eq(recipeItems.productId, item.productId));

          for (const recipe of recipes) {
            const restoreQty = Number(recipe.quantity) * item.quantity;
            const [updated] = await tx.update(ingredients)
              .set({ currentStock: sql`${ingredients.currentStock} + ${restoreQty}` })
              .where(eq(ingredients.id, recipe.ingredientId))
              .returning({ currentStock: ingredients.currentStock });

            await tx.insert(stockMovements).values({
              tenantId: auth.tenantId,
              ingredientId: recipe.ingredientId,
              type: "return",
              qtyChange: String(restoreQty),
              balanceAfter: String(updated?.currentStock ?? 0),
              refType: "transaction",
              referenceId: id,
              note: reason ? `Void: ${reason}` : `Void transaksi ${txn.number}`,
              createdBy: auth.userId,
            });
          }
        }
      });

      await logAudit(auth, "void", "transaction", id, { number: txn.number, reason });
      res.json({ success: true });
      return;
    }

    res.status(400).json({ error: "Action tidak valid" });
  },
});
