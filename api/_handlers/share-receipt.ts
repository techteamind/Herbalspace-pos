import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sharedReceipts, transactions, settings } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { randomBytes } from "crypto";

export default createHandler({
  async POST(req, res, auth) {
    const { transactionId } = req.body as { transactionId: string };
    if (!transactionId) { res.status(400).json({ error: "transactionId wajib" }); return; }

    const tx = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, transactionId), eq(transactions.tenantId, auth.tenantId)),
    });
    if (!tx) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }

    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [row] = await db.insert(sharedReceipts).values({
      tenantId: auth.tenantId,
      transactionId,
      token,
      expiresAt,
    }).returning();

    if (!row) { res.status(500).json({ error: "Gagal membuat link" }); return; }
    res.status(201).json({ token: row.token, expiresAt: row.expiresAt });
  },

  async GET(req, res, _auth) {
    const token = req.query.token as string;
    if (!token) { res.status(400).json({ error: "token wajib" }); return; }

    const shared = await db.query.sharedReceipts.findFirst({
      where: eq(sharedReceipts.token, token),
    });
    if (!shared) { res.status(404).json({ error: "Link tidak ditemukan" }); return; }
    if (new Date() > shared.expiresAt) { res.status(410).json({ error: "Link sudah kedaluwarsa" }); return; }

    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, shared.transactionId),
      with: { items: true, payments: true, customer: true, cashier: true },
    });
    if (!tx) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }

    const store = await db.query.settings.findFirst({
      where: eq(settings.tenantId, shared.tenantId),
    });

    res.json({
      storeName: store?.storeName ?? "Herbaspace",
      storeAddress: store?.address ?? "",
      storePhone: store?.phone ?? "",
      receiptHeader: store?.receiptHeader ?? "",
      receiptFooter: store?.receiptFooter ?? "",
      transaction: tx,
      expiresAt: shared.expiresAt,
    });
  },
});
