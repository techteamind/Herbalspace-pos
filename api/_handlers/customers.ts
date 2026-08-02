import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customers, transactions } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { outletFilter } from "../_lib/auth.js";

export default createHandler({
  async GET(req, res, auth) {
    const id = req.query.id as string | undefined;
    if (id) {
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)),
      });
      if (!customer) { res.status(404).json({ error: "Pelanggan tidak ditemukan" }); return; }
      const history = await db.query.transactions.findMany({
        where: and(eq(transactions.customerId, id), eq(transactions.tenantId, auth.tenantId)),
        orderBy: desc(transactions.createdAt),
        limit: 50,
        with: { items: true, payments: true, customer: true, cashier: true },
      });
      // totalSpend dari kolom tersimpan (dijaga atomik saat jual & void), BUKAN
      // dihitung ulang dari history yang di-cap 50 → akurat utk pelanggan >50 trx.
      res.json({ ...customer, transactions: history, totalSpend: Number(customer.totalSpent) });
      return;
    }

    const search = req.query.q as string | undefined;
    const conditions = [eq(customers.tenantId, auth.tenantId)];
    const of = outletFilter(customers.outletId, auth.outletId);
    if (of) conditions.push(of);
    if (search) {
      const escaped = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(customers.name, `%${escaped}%`), ilike(customers.phone, `%${escaped}%`))!);
    }
    const rows = await db.query.customers.findMany({ where: and(...conditions), orderBy: desc(customers.createdAt), limit: 50 });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { id, name, phone, email, note } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "Nama pelanggan wajib diisi" }); return; }
    try {
      const [row] = await db.insert(customers).values({
        // id opsional dari klien: sale offline pakai id ini agar link pelanggan terjaga.
        ...(id ? { id: String(id) } : {}),
        tenantId: auth.tenantId, outletId: auth.outletId ?? undefined, name, phone: phone || null, email: email || null, note: note || null,
      }).returning();
      res.status(201).json(row);
    } catch (err) {
      const dup = err instanceof Error && /customers_tenant_phone_unq|duplicate key/.test(err.message);
      // Replay (id sama) atau HP sudah terdaftar → kembalikan yang ada, bukan 500.
      if (dup && id) {
        const existing = await db.query.customers.findFirst({
          where: and(eq(customers.id, String(id)), eq(customers.tenantId, auth.tenantId)),
        });
        if (existing) { res.status(200).json(existing); return; }
      }
      if (dup && phone) {
        const existing = await db.query.customers.findFirst({
          where: and(eq(customers.tenantId, auth.tenantId), eq(customers.phone, phone)),
        });
        if (existing) { res.status(200).json(existing); return; }
      }
      throw err;
    }
  },

  async PUT(req, res, auth) {
    const { id, name, phone, email, note } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (note !== undefined) updates.note = note || null;
    const [row] = await db.update(customers).set(updates)
      .where(and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId))).returning();
    if (!row) { res.status(404).json({ error: "Pelanggan tidak ditemukan" }); return; }
    res.json(row);
  },

  async DELETE(req, res, auth) {
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const [txnCount] = await db.select({ count: sql<number>`count(*)::int` }).from(transactions)
      .where(and(eq(transactions.customerId, id), eq(transactions.tenantId, auth.tenantId)));
    if ((txnCount?.count ?? 0) > 0) {
      res.status(400).json({ error: "Pelanggan memiliki riwayat transaksi dan tidak bisa dihapus" });
      return;
    }
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)));
    res.status(204).end();
  },
});
