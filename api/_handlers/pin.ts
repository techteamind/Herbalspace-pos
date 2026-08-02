import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { profiles } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";
import { hashPin, isValidPinFormat } from "../_lib/pin.js";

// Atur/ganti PIN. Set PIN sendiri: boleh siapa saja. Set PIN karyawan lain: manager+.
export default createHandler({
  async POST(req, res, auth) {
    const { userId, pin } = req.body as { userId?: string; pin?: string };
    if (!isValidPinFormat(pin)) { res.status(400).json({ error: "PIN harus 4–8 angka" }); return; }
    const targetId = userId ?? auth.userId;
    if (targetId !== auth.userId && !requireRole(auth, "manager", res)) return;

    const target = await db.query.profiles.findFirst({
      where: and(eq(profiles.id, targetId), eq(profiles.tenantId, auth.tenantId)),
    });
    if (!target) { res.status(404).json({ error: "Karyawan tidak ditemukan" }); return; }

    await db.update(profiles)
      .set({ pinHash: hashPin(pin), pinFailedAttempts: 0, pinLockedUntil: null })
      .where(eq(profiles.id, targetId));
    res.status(200).json({ ok: true });
  },
});
