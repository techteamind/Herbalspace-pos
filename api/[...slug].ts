import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const raw = req.query["...slug"] ?? req.query.slug;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const name = parts[0];

  if (!name) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const mod = await import(`./_handlers/${name}`);
    const fn = mod.default;
    if (typeof fn !== "function") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await fn(req, res);
  } catch (err) {
    res.status(500).json({
      error: "Handler error",
      name,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
