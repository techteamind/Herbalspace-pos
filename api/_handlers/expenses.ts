import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expenses, expenseCategories } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";

export default createHandler({
  async GET(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return; // modul keuangan: manager+
    const section = req.query.section as string | undefined;
    if (section === "categories") {
      const catConditions = [eq(expenseCategories.tenantId, auth.tenantId)];
      const catOf = outletFilter(expenseCategories.outletId, auth.outletId);
      if (catOf) catConditions.push(catOf);
      const rows = await db.query.expenseCategories.findMany({
        where: and(...catConditions),
      });
      res.json(rows);
      return;
    }
    // Filter rentang tanggal opsional (from/to ISO). Halaman Pengeluaran mengirim
    // batas bulan WIB agar total & daftar konsisten (bukan cap client-side).
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const expOf = outletFilter(expenses.outletId, auth.outletId);
    const conds = [eq(expenses.tenantId, auth.tenantId)];
    if (expOf) conds.push(expOf);
    if (from) conds.push(gte(expenses.spentAt, new Date(from)));
    if (to) conds.push(lt(expenses.spentAt, new Date(to)));
    const expWhere = and(...conds);

    // section=summary → total server-side (SUM), tak terpengaruh cap baris.
    if (section === "summary") {
      const [row] = await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
        .from(expenses).where(expWhere);
      res.json({ total: Number(row?.total ?? 0) });
      return;
    }

    const rows = await db.query.expenses.findMany({
      where: expWhere,
      orderBy: desc(expenses.spentAt),
      limit: Math.min(Number(req.query.limit) || 500, 2000),
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
    if (!(Number(amount) >= 0)) { res.status(400).json({ error: "Jumlah pengeluaran harus angka ≥ 0" }); return; }
    if (!description || typeof description !== "string") { res.status(400).json({ error: "Deskripsi wajib" }); return; }
    if (!spentAt || isNaN(new Date(spentAt).getTime())) { res.status(400).json({ error: "Tanggal wajib" }); return; }
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
    if (amount !== undefined && !(Number(amount) >= 0)) { res.status(400).json({ error: "Jumlah pengeluaran harus angka ≥ 0" }); return; }
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
