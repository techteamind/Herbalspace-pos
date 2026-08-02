import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { stockMovements, ingredients, units } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";

export default createHandler({
  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { ingredientId, type, qtyChange, unitCost, note } = req.body as {
      ingredientId: string;
      type: "adjustment" | "waste" | "purchase" | "return";
      qtyChange: number;
      unitCost?: number;
      note?: string;
    };
    const TYPES = ["adjustment", "waste", "purchase", "return"] as const;
    if (!ingredientId || !type || qtyChange === undefined) {
      res.status(400).json({ error: "ingredientId, type, dan qtyChange wajib" });
      return;
    }
    if (!TYPES.includes(type)) { res.status(400).json({ error: "Jenis tidak valid" }); return; }
    if (typeof qtyChange !== "number" || isNaN(qtyChange) || qtyChange === 0) {
      res.status(400).json({ error: "qtyChange harus angka bukan 0" });
      return;
    }

    // Tanda DITURUNKAN server (jangan percaya tanda dari klien): purchase selalu
    // menambah, waste/return selalu mengurangi, adjustment = selisih apa adanya.
    const mag = Math.abs(qtyChange);
    const delta = type === "adjustment" ? qtyChange : type === "purchase" ? mag : -mag;
    // Pembelian boleh membawa harga satuan → perbarui HPP bahan (metode last-cost)
    // supaya COGS tak basi saat harga bahan berubah.
    const setCost = type === "purchase" && typeof unitCost === "number" && unitCost > 0;

    // Atomik: hitung stok baru DI DB (bukan read-modify-write) agar penyesuaian
    // bersamaan tidak saling menimpa. RETURNING sekaligus jadi cek keberadaan.
    const [updated] = await db.update(ingredients)
      .set({
        currentStock: sql`${ingredients.currentStock} + ${delta}`,
        ...(setCost ? { lastCost: String(unitCost) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(ingredients.id, ingredientId), eq(ingredients.tenantId, auth.tenantId)))
      .returning({ currentStock: ingredients.currentStock, lastCost: ingredients.lastCost });
    if (!updated) { res.status(404).json({ error: "Bahan tidak ditemukan" }); return; }

    const [row] = await db.insert(stockMovements).values({
      tenantId: auth.tenantId,
      ingredientId,
      type,
      qtyChange: String(delta),
      balanceAfter: updated.currentStock,
      unitCost: updated.lastCost,
      note: note || null,
      createdBy: auth.userId,
    }).returning();

    res.status(201).json(row);
  },

  async GET(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return; // modul inventori: manager+
    const { from, to, type, limit: limitStr } = req.query;
    const limit = Math.min(Number(limitStr) || 100, 300);

    const conditions = [eq(stockMovements.tenantId, auth.tenantId)];
    const smOf = outletFilter(ingredients.outletId, auth.outletId);
    if (smOf) conditions.push(smOf);
    if (from) conditions.push(gte(stockMovements.createdAt, new Date(from as string)));
    if (to) conditions.push(lt(stockMovements.createdAt, new Date(to as string)));
    if (type) conditions.push(eq(stockMovements.type, type as typeof stockMovements.type.enumValues[number]));

    const rows = await db
      .select({
        id: stockMovements.id,
        ingredientName: ingredients.name,
        unitCode: units.code,
        type: stockMovements.type,
        qtyChange: stockMovements.qtyChange,
        balanceAfter: stockMovements.balanceAfter,
        note: stockMovements.note,
        referenceId: stockMovements.referenceId,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(ingredients, eq(ingredients.id, stockMovements.ingredientId))
      .innerJoin(units, eq(units.id, ingredients.unitId))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);

    res.json(rows);
  },
});
