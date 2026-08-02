import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { profiles } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";
import { hashPin, isValidPinFormat } from "../_lib/pin.js";

const LEVEL: Record<string, number> = { cashier: 0, manager: 1, owner: 2 };

// Atur/ganti PIN. Set PIN sendiri: boleh siapa saja. Set PIN karyawan lain: manager+,
// TAPI hanya untuk role yang lebih rendah — kalau tidak, manager bisa set PIN owner
// lalu login sebagai owner (eskalasi privilege via pin-login).
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
    // Cegah eskalasi: tak boleh atur PIN untuk role setara/lebih tinggi dari diri sendiri.
    if (targetId !== auth.userId && LEVEL[target.role] >= LEVEL[auth.role]) {
      res.status(403).json({ error: "Tidak bisa mengatur PIN untuk role setara atau lebih tinggi" });
      return;
    }

    await db.update(profiles)
      .set({ pinHash: hashPin(pin), pinFailedAttempts: 0, pinLockedUntil: null })
      .where(eq(profiles.id, targetId));
    res.status(200).json({ ok: true });
  },
});
