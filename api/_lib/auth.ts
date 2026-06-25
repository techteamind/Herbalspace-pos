import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";
import { eq, or, isNull, type SQL, type Column } from "drizzle-orm";
import { db } from "../../db/index.js";
import { profiles, tenants, settings } from "../../db/schema.js";

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  role: "owner" | "manager" | "cashier";
  profileName: string;
  outletId: string | null;
}

const hsSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET ?? "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
  .trim()
  .replace(/\/$/, "");

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(): ReturnType<typeof createRemoteJWKSet> | null {
  if (!jwks && supabaseUrl) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Verifikasi access token Supabase. Project lama memakai HS256 (JWT secret),
 * project baru memakai kunci asimetris (JWKS). Keduanya didukung.
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (process.env.SUPABASE_JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(token, hsSecret);
      return payload;
    } catch {
      // lanjut coba JWKS
    }
  }
  const set = getJwks();
  if (set) {
    try {
      const { payload } = await jwtVerify(token, set);
      return payload;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Verifikasi token lalu muat profil (tenantId & role). Jika user sudah
 * terautentikasi namun belum punya profil, profil + tenant + settings dibuat
 * otomatis (owner) agar aplikasi langsung bisa dipakai. Mengembalikan null
 * jika token tidak valid.
 */
export async function authenticate(req: VercelRequest): Promise<AuthContext | null> {
  const setReason = (r: string): null => {
    (req as unknown as { __authReason?: string }).__authReason = r;
    return null;
  };

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return setReason("no_bearer");

  const token = header.slice(7);
  const payload = await verifyToken(token);
  if (!payload?.sub) return setReason("verify_failed");

  const userId = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : "";

  let profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) });

  if (!profile) {
    const name = email ? email.split("@")[0] : "Cafe Saya";
    const [tenant] = await db
      .insert(tenants)
      .values({ name: `Cafe ${name}` })
      .returning();
    if (!tenant) return null;

    const inserted = await db
      .insert(profiles)
      .values({
        id: userId,
        tenantId: tenant.id,
        fullName: email || "Owner",
        email: email || `${userId}@local`,
        role: "owner",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      await db.insert(settings).values({ tenantId: tenant.id }).onConflictDoNothing();
      profile = inserted[0];
    } else {
      // Request lain sudah membuat profil (race) — ambil ulang.
      profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) });
    }
  }

  if (!profile) return setReason("no_profile");
  if (!profile.isActive) return setReason("inactive");

  let outletId = profile.outletId ?? null;
  if (profile.role === "owner") {
    const headerOutlet = req.headers["x-outlet-id"];
    if (typeof headerOutlet === "string" && headerOutlet) {
      outletId = headerOutlet;
    }
  }

  return { userId, email: profile.email, tenantId: profile.tenantId, role: profile.role, profileName: profile.fullName, outletId };
}

/** Helper untuk mengembalikan 401. */
export function unauthorized(res: VercelResponse): void {
  res.status(401).json({ error: "Tidak terautentikasi" });
}

export function outletFilter(column: Column, outletId: string | null): SQL | undefined {
  if (!outletId) return undefined;
  return or(eq(column, outletId), isNull(column));
}

const ROLE_LEVEL: Record<string, number> = { cashier: 0, manager: 1, owner: 2 };

export function requireRole(auth: AuthContext, minRole: "manager" | "owner", res: VercelResponse): boolean {
  if ((ROLE_LEVEL[auth.role] ?? 0) < (ROLE_LEVEL[minRole] ?? 0)) {
    res.status(403).json({ error: "Akses ditolak — membutuhkan role " + minRole });
    return false;
  }
  return true;
}
