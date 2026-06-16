import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { profiles } from "../../db/schema";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: "owner" | "manager" | "cashier";
}

const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET ?? "");

/**
 * Verifikasi Supabase access token (Bearer) lalu muat profil user
 * untuk mendapatkan tenantId & role. Mengembalikan null jika tidak valid.
 */
export async function authenticate(req: VercelRequest): Promise<AuthContext | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const token = header.slice(7);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    if (!userId) return null;

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    });
    if (!profile || !profile.isActive) return null;

    return { userId, tenantId: profile.tenantId, role: profile.role };
  } catch {
    return null;
  }
}

/** Helper untuk mengembalikan 401. */
export function unauthorized(res: VercelResponse): void {
  res.status(401).json({ error: "Tidak terautentikasi" });
}
