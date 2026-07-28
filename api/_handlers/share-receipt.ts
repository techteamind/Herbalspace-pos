import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sharedReceipts, transactions, settings } from "../../db/schema.js";
import { authenticate } from "../_lib/auth.js";
import { randomBytes } from "crypto";

// Handler kustom (bukan createHandler): POST butuh auth, GET publik.
// Pelanggan membuka link struk TANPA login — kalau di-auth semua, link selalu 401.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === "POST") {
    const auth = await authenticate(req);
    if (!auth) { res.status(401).json({ error: "Tidak terautentikasi" }); return; }

    const { transactionId } = req.body as { transactionId: string };
    if (!transactionId) { res.status(400).json({ error: "transactionId wajib" }); return; }

    const tx = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, transactionId), eq(transactions.tenantId, auth.tenantId)),
    });
    if (!tx) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }
    if (tx.status === "void") { res.status(400).json({ error: "Transaksi sudah dibatalkan" }); return; }

    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [row] = await db.insert(sharedReceipts).values({
      tenantId: auth.tenantId, transactionId, token, expiresAt,
    }).returning();
    if (!row) { res.status(500).json({ error: "Gagal membuat link" }); return; }
    res.status(201).json({ token: row.token, expiresAt: row.expiresAt });
    return;
  }

  if (req.method === "GET") {
    const token = req.query.token as string;
    if (!token) { res.status(400).json({ error: "token wajib" }); return; }

    const shared = await db.query.sharedReceipts.findFirst({
      where: eq(sharedReceipts.token, token),
    });
    if (!shared) { res.status(404).json({ error: "Link tidak ditemukan" }); return; }
    if (new Date() > shared.expiresAt) { res.status(410).json({ error: "Link sudah kedaluwarsa" }); return; }

    // Proyeksi AMAN: hanya kolom yang tampil di struk pelanggan. TIDAK menyertakan
    // unit_cogs (HPP/margin), id internal, atau data lintas-tenant lainnya.
    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, shared.transactionId),
      columns: { number: true, subtotal: true, discount: true, taxAmount: true, total: true, createdAt: true, status: true },
      with: {
        items: { columns: { productName: true, quantity: true, unitPrice: true, lineTotal: true, note: true } },
        payments: { columns: { method: true, amount: true, amountReceived: true, changeAmount: true } },
        customer: { columns: { name: true } },
        cashier: { columns: { fullName: true } },
      },
    });
    if (!tx) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }
    if (tx.status === "void") { res.status(410).json({ error: "Struk sudah dibatalkan" }); return; }

    const store = await db.query.settings.findFirst({
      where: eq(settings.tenantId, shared.tenantId),
    });

    res.json({
      storeName: store?.storeName ?? "Herbaspace",
      storeAddress: store?.address ?? "",
      storePhone: store?.phone ?? "",
      receiptHeader: store?.receiptHeader ?? "",
      receiptFooter: store?.receiptFooter ?? "",
      transaction: {
        number: tx.number, subtotal: tx.subtotal, discount: tx.discount,
        taxAmount: tx.taxAmount, total: tx.total, createdAt: tx.createdAt,
        customer: tx.customer, cashier: tx.cashier, items: tx.items, payments: tx.payments,
      },
      expiresAt: shared.expiresAt,
    });
    return;
  }

  res.status(405).json({ error: "Method tidak diizinkan" });
}
