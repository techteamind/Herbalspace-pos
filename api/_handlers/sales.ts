import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { createHandler } from "../_lib/handler.js";
import { logAudit } from "../_lib/audit.js";

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}
interface SalePayment {
  method: "cash" | "qris" | "card" | "transfer";
  amount: number;
  amount_received?: number;
  change_amount?: number;
}

export default createHandler({
  async POST(req, res, auth) {
    const { customerId, discount, taxPercent, serviceChargePercent, items, payments, clientRef } = req.body as {
      customerId?: string | null;
      discount?: number;
      taxPercent?: number;
      serviceChargePercent?: number;
      items: SaleItem[];
      payments: SalePayment[];
      clientRef?: string | null;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Item transaksi kosong" });
      return;
    }
    // Penjualan wajib terikat satu outlet. Tanpa ini (owner mode "Semua Outlet"),
    // transaksi outlet-null ikut terhitung di SETIAP outlet pada dashboard/laporan.
    if (!auth.outletId) {
      res.status(400).json({ error: "Pilih outlet dulu sebelum menjual" });
      return;
    }
    for (const it of items) {
      if (!Number.isInteger(it.quantity) || it.quantity <= 0 || typeof it.unit_price !== "number" || it.unit_price < 0) {
        res.status(400).json({ error: "Item transaksi tidak valid" });
        return;
      }
    }
    const itemsTotal = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
    const safeDiscount = Math.min(Math.max(discount ?? 0, 0), itemsTotal);
    const safeTax = Math.min(Math.max(taxPercent ?? 0, 0), 100);
    const safeService = Math.min(Math.max(serviceChargePercent ?? 0, 0), 100);
    if (customerId) {
      const cust = await db.execute(sql`
        SELECT id FROM customers WHERE id = ${customerId}::uuid AND tenant_id = ${auth.tenantId}::uuid
      `);
      if (cust.length === 0) {
        res.status(400).json({ error: "Pelanggan tidak ditemukan" });
        return;
      }
    }

    const result = await db.execute(sql`
      SELECT * FROM create_sale(
        ${auth.tenantId}::uuid,
        ${auth.userId}::uuid,
        ${customerId ?? null}::uuid,
        ${safeDiscount}::numeric,
        ${safeTax}::numeric,
        ${JSON.stringify(items)}::text::jsonb,
        ${JSON.stringify(payments ?? [])}::text::jsonb,
        ${auth.outletId ?? null}::uuid,
        ${clientRef ?? null}::uuid,
        ${safeService}::numeric
      );
    `);
    const sale = result[0] as { total: string };
    const saleRow = result[0] as Record<string, unknown>;
    await logAudit(auth, "create", "transaction", saleRow.transaction_id as string, { total: sale.total, items: items.length });
    res.status(201).json(saleRow);
  },
});
