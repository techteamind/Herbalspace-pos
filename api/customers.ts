import { eq, and, desc, ilike, or } from "drizzle-orm";
import { db } from "../db";
import { customers, transactions } from "../db/schema";
import { createHandler } from "./_lib/handler";

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
      const totalSpend = history.filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.total), 0);
      res.json({ ...customer, transactions: history, totalSpend });
      return;
    }

    const search = req.query.q as string | undefined;
    let where = eq(customers.tenantId, auth.tenantId);
    if (search) {
      const escaped = search.replace(/[%_\\]/g, "\\$&");
      where = and(where, or(ilike(customers.name, `%${escaped}%`), ilike(customers.phone, `%${escaped}%`)))!;
    }
    const rows = await db.query.customers.findMany({ where, orderBy: desc(customers.createdAt), limit: 50 });
    res.json(rows);
  },

  async POST(req, res, auth) {
    const { name, phone, email, note } = req.body;
    const [row] = await db.insert(customers).values({
      tenantId: auth.tenantId, name, phone: phone || null, email: email || null, note: note || null,
    }).returning();
    res.status(201).json(row);
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
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)));
    res.status(204).end();
  },
});
