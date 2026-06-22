import { eq } from "drizzle-orm";
import { db } from "../../db";
import { profiles } from "../../db/schema";
import { createHandler } from "../_lib/handler";

export default createHandler({
  async GET(_req, res, auth) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, auth.userId) });
    res.json({
      userId: auth.userId,
      tenantId: auth.tenantId,
      role: auth.role,
      profileName: profile?.fullName ?? auth.profileName,
      fullName: profile?.fullName ?? auth.profileName,
      email: profile?.email ?? "",
      outletId: auth.outletId,
    });
  },

  async PUT(req, res, auth) {
    const { fullName } = req.body ?? {};
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      res.status(400).json({ error: "Nama lengkap wajib diisi" });
      return;
    }
    const [updated] = await db
      .update(profiles)
      .set({ fullName: fullName.trim(), updatedAt: new Date() })
      .where(eq(profiles.id, auth.userId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Profil tidak ditemukan" });
      return;
    }
    res.json({ ok: true, fullName: updated.fullName });
  },
});
