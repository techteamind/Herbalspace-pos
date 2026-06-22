import { eq, and, desc, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "../../db";
import { profiles } from "../../db/schema";
import { createHandler } from "../_lib/handler";

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum di-set di .env");
  return createClient(url.trim().replace(/\/$/, ""), key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default createHandler({
  async GET(_req, res, auth) {
    if (auth.role !== "owner" && auth.role !== "manager") {
      res.status(403).json({ error: "Hanya owner/manager yang bisa melihat karyawan" });
      return;
    }
    try {
      const rows = await db.query.profiles.findMany({
        where: eq(profiles.tenantId, auth.tenantId),
        orderBy: desc(profiles.createdAt),
        with: { outlet: true },
      });
      res.json(rows);
    } catch {
      const rows = await db.execute(sql`
        SELECT id, tenant_id AS "tenantId", full_name AS "fullName", email, role,
               is_active AS "isActive", created_at AS "createdAt"
        FROM profiles WHERE tenant_id = ${auth.tenantId}::uuid
        ORDER BY created_at DESC
      `);
      res.json(rows.map((r: any) => ({ ...r, outletId: null, outlet: null })));
    }
  },

  async POST(req, res, auth) {
    if (auth.role !== "owner") {
      res.status(403).json({ error: "Hanya owner yang bisa menambah karyawan" });
      return;
    }
    const { fullName, email, password, role, outletId } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({ error: "Nama, email, dan password wajib diisi" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password minimal 6 karakter" });
      return;
    }

    try {
      const admin = getAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      const [profile] = await db.insert(profiles).values({
        id: data.user.id,
        tenantId: auth.tenantId,
        fullName,
        email,
        role: role || "cashier",
        outletId: outletId || null,
        isActive: true,
      }).returning();

      res.status(201).json(profile);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Gagal menambah karyawan" });
    }
  },

  async PUT(req, res, auth) {
    if (auth.role !== "owner") {
      res.status(403).json({ error: "Hanya owner yang bisa mengubah data karyawan" });
      return;
    }
    const { id, role, outletId, isActive } = req.body;
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (role !== undefined) updates.role = role;
    if (outletId !== undefined) updates.outletId = outletId || null;
    if (isActive !== undefined) updates.isActive = isActive;

    try {
      const [row] = await db.update(profiles).set(updates)
        .where(and(eq(profiles.id, id), eq(profiles.tenantId, auth.tenantId))).returning();
      if (!row) { res.status(404).json({ error: "Karyawan tidak ditemukan" }); return; }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Gagal menyimpan" });
    }
  },
});
