import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const slug = req.query.slug;
  const name = Array.isArray(slug) ? slug[0] : slug;
  const url = req.url;

  if (!name) {
    res.status(200).json({ debug: true, slug, url, query: req.query });
    return;
  }

  try {
    const mod = await import(`./_handlers/${name}`);
    const fn = mod.default;
    if (typeof fn !== "function") {
      res.status(404).json({ error: "Handler not a function", name });
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
