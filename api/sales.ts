import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { authenticate, unauthorized } from "./_lib/auth";

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

/**
 * POST /api/sales — membuat transaksi penjualan secara atomik via create_sale().
 * Stok bahan baku otomatis terpotong & tercatat di stock_movements.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method tidak diizinkan" });
    return;
  }
  const auth = await authenticate(req);
  if (!auth) return unauthorized(res);

  const { customerId, discount, taxPercent, items, payments } = req.body as {
    customerId?: string | null;
    discount?: number;
    taxPercent?: number;
    items: SaleItem[];
    payments: SalePayment[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Item transaksi kosong" });
    return;
  }

  try {
    const result = await db.execute(sql`
      SELECT * FROM create_sale(
        ${auth.tenantId}::uuid,
        ${auth.userId}::uuid,
        ${customerId ?? null}::uuid,
        ${discount ?? 0}::numeric,
        ${taxPercent ?? 0}::numeric,
        ${JSON.stringify(items)}::jsonb,
        ${JSON.stringify(payments ?? [])}::jsonb
      );
    `);
    res.status(201).json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Gagal membuat transaksi" });
  }
}
