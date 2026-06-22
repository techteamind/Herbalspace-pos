import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../db/index.js";
import { sql } from "drizzle-orm";

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const info: Record<string, unknown> = {
    status: "ok",
    service: "herbaspace-pos-api",
    version: "2026-06-22-catchall",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    time: new Date().toISOString(),
    supabaseDbUrl: process.env.SUPABASE_DB_URL ? "SET" : "NOT SET",
    postgresUrl: (process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || "NOT SET").replace(/:[^@]+@/, ":***@"),
  };

  if (_req.query.db === "1") {
    try {
      const result = await db.execute(sql`SELECT 1 as ping`);
      info.db = "connected";
      info.dbResult = result;
    } catch (e: unknown) {
      info.db = "error";
      info.dbError = e instanceof Error ? e.message : String(e);
    }
  }

  res.status(200).json(info);
}
