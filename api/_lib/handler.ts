import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, unauthorized, type AuthContext } from "./auth.js";

type MethodHandlers = {
  [method: string]: (req: VercelRequest, res: VercelResponse, auth: AuthContext) => Promise<void>;
};

export function createHandler(handlers: MethodHandlers) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const method = req.method ?? "GET";
    const handler = handlers[method];
    if (!handler) {
      res.status(405).json({ error: "Method tidak diizinkan" });
      return;
    }

    const auth = await authenticate(req);
    if (!auth) {
      const reason = (req as unknown as { __authReason?: string }).__authReason;
      res.status(401).json({ error: "Tidak terautentikasi", reason });
      return;
    }
    void unauthorized;

    try {
      await handler(req, res, auth);
    } catch (err) {
      console.error(`[API Error] ${method} ${req.url}:`, err);
      // Pesan RAISE EXCEPTION dari fungsi DB aman ditampilkan; error teknis
      // (query/driver, mengandung SQL & parameter) tidak boleh bocor ke klien.
      const msg = err instanceof Error ? err.message : "";
      const isDbUserError = /Kuantitas|Harga item|Total transaksi/.test(msg);
      res.status(isDbUserError ? 400 : 500).json({
        error: isDbUserError ? msg : "Terjadi kesalahan pada server. Coba lagi.",
      });
    }
  };
}
