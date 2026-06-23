import { createClient } from "@supabase/supabase-js";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { profiles } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum di-set di .env");
  return createClient(url.trim().replace(/\/$/, ""), key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default createHandler({
  async PUT(req, res, auth) {
    const { targetUserId, newPassword, currentPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "Password baru minimal 6 karakter" });
      return;
    }

    // Owner force-changing employee password
    if (targetUserId && targetUserId !== auth.userId) {
      if (auth.role !== "owner") {
        res.status(403).json({ error: "Hanya owner yang bisa reset password karyawan" });
        return;
      }

      const [target] = await db.select().from(profiles)
        .where(and(eq(profiles.id, targetUserId), eq(profiles.tenantId, auth.tenantId)));
      if (!target) {
        res.status(404).json({ error: "Karyawan tidak ditemukan" });
        return;
      }
      if (target.role === "owner") {
        res.status(403).json({ error: "Tidak bisa reset password owner lain" });
        return;
      }

      const admin = getAdminClient();
      const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ success: true });
      return;
    }

    // Self change — verify current password first
    if (!currentPassword) {
      res.status(400).json({ error: "Password lama wajib diisi" });
      return;
    }

    const admin = getAdminClient();
    const { error: signInErr } = await admin.auth.signInWithPassword({
      email: auth.email,
      password: currentPassword,
    });
    if (signInErr) {
      res.status(400).json({ error: "Password lama salah" });
      return;
    }

    const { error } = await admin.auth.admin.updateUserById(auth.userId, { password: newPassword });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  },
});
