import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expenses, expenseCategories } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

export default createHandler({
  async GET(req, res, auth) {
    const section = req.query.section as string | undefined;
    if (section === "categories") {
      const catConditions = [eq(expenseCategories.tenantId, auth.tenantId)];
      if (auth.outletId) catConditions.push(eq(expenseCategories.outletId, auth.outletId));
      const rows = await db.query.expenseCategories.findMany({
        where: and(...catConditions),
      });
      res.json(rows);
      return;
    }
    const expWhere = auth.outletId
      ? and(eq(expenses.tenantId, auth.tenantId), eq(expenses.outletId, auth.outletId))
      : eq(expenses.tenantId, auth.tenantId);
    const rows = await db.query.expenses.findMany({
      where: expWhere,
      orderBy: desc(expenses.spentAt),
      limit: 100,
      with: { category: true, createdByProfile: true },
    });
    res.json(rows);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { section } = req.query;
    if (section === "categories") {
      const { name } = req.body;
      const [row] = await db.insert(expenseCategories).values({ tenantId: auth.tenantId, outletId: auth.outletId ?? undefined, name }).returning();
      res.status(201).json(row);
      return;
    }
    const { categoryId, description, amount, spentAt } = req.body;
    const [row] = await db.insert(expenses).values({
      tenantId: auth.tenantId,
      outletId: auth.outletId,
      categoryId: categoryId || null,
      description,
      amount: String(amount),
      spentAt: new Date(spentAt),
      createdBy: auth.userId,
    }).returning();
    res.status(201).json(row);
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { id, categoryId, description, amount, spentAt } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (categoryId !== undefined) updates.categoryId = categoryId || null;
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = String(amount);
    if (spentAt !== undefined) updates.spentAt = new Date(spentAt);
    const [row] = await db.update(expenses).set(updates)
      .where(and(eq(expenses.id, id), eq(expenses.tenantId, auth.tenantId))).returning();
    if (!row) { res.status(404).json({ error: "Pengeluaran tidak ditemukan" }); return; }
    res.json(row);
  },

  async DELETE(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.tenantId, auth.tenantId)));
    res.status(204).end();
  },
});
