import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, unauthorized, type AuthContext } from "./auth";

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
      res.status(500).json({ error: err instanceof Error ? err.message : "Terjadi kesalahan" });
    }
  };
}
