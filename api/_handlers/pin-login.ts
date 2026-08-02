import { SignJWT } from "jose";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { profiles } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { verifyPin } from "../_lib/pin.js";

// Login cepat via PIN untuk ganti kasir di device bersama. Dipanggil DENGAN sesi
// device yang sudah login (owner) — jadi hanya device sah untuk tenant ini yang
// bisa mencoba PIN. Sukses → terbitkan JWT (HS256, SUPABASE_JWT_SECRET) utk user
// terpilih; backend memperlakukan request berikutnya sebagai user itu (role &
// atribusi benar). Terverifikasi: token HS256 self-mint diterima prod /api/me.
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET ?? "");
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export default createHandler({
  async POST(req, res, auth) {
    const { userId, pin } = req.body as { userId?: string; pin?: string };
    if (!userId || !pin) { res.status(400).json({ error: "userId & pin wajib" }); return; }

    const target = await db.query.profiles.findFirst({
      where: and(eq(profiles.id, userId), eq(profiles.tenantId, auth.tenantId)),
    });
    if (!target || !target.isActive) { res.status(404).json({ error: "Karyawan tidak ditemukan" }); return; }
    if (!target.pinHash) { res.status(400).json({ error: "PIN belum diatur untuk karyawan ini" }); return; }

    const now = new Date();
    if (target.pinLockedUntil && target.pinLockedUntil > now) {
      const mins = Math.ceil((target.pinLockedUntil.getTime() - now.getTime()) / 60000);
      res.status(423).json({ error: `Terkunci karena salah PIN. Coba lagi ${mins} menit lagi.` });
      return;
    }

    if (!verifyPin(pin, target.pinHash)) {
      const attempts = (target.pinFailedAttempts ?? 0) + 1;
      const lock = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null;
      await db.update(profiles)
        .set({ pinFailedAttempts: lock ? 0 : attempts, pinLockedUntil: lock })
        .where(eq(profiles.id, userId));
      res.status(401).json({
        error: lock
          ? `PIN salah ${MAX_ATTEMPTS}×. Terkunci ${LOCK_MINUTES} menit.`
          : `PIN salah. Sisa ${MAX_ATTEMPTS - attempts} percobaan.`,
      });
      return;
    }

    // sukses — reset lockout
    if (target.pinFailedAttempts || target.pinLockedUntil) {
      await db.update(profiles).set({ pinFailedAttempts: 0, pinLockedUntil: null }).where(eq(profiles.id, userId));
    }

    const token = await new SignJWT({ email: target.email, role: "authenticated" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("14h")
      .sign(secret);

    res.status(200).json({
      token,
      user: { id: target.id, name: target.fullName, role: target.role, outletId: target.outletId },
    });
  },
});
