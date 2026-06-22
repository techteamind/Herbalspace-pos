import type { VercelRequest, VercelResponse } from "@vercel/node";

const handlers: Record<string, () => Promise<{ default: (req: VercelRequest, res: VercelResponse) => void | Promise<void> }>> = {
  "audit-logs": () => import("./_handlers/audit-logs"),
  categories: () => import("./_handlers/categories"),
  customers: () => import("./_handlers/customers"),
  dashboard: () => import("./_handlers/dashboard"),
  employees: () => import("./_handlers/employees"),
  expenses: () => import("./_handlers/expenses"),
  health: () => import("./_handlers/health"),
  ingredients: () => import("./_handlers/ingredients"),
  me: () => import("./_handlers/me"),
  modifiers: () => import("./_handlers/modifiers"),
  outlets: () => import("./_handlers/outlets"),
  "price-history": () => import("./_handlers/price-history"),
  "product-modifiers": () => import("./_handlers/product-modifiers"),
  products: () => import("./_handlers/products"),
  promos: () => import("./_handlers/promos"),
  recipes: () => import("./_handlers/recipes"),
  sales: () => import("./_handlers/sales"),
  settings: () => import("./_handlers/settings"),
  "share-receipt": () => import("./_handlers/share-receipt"),
  shifts: () => import("./_handlers/shifts"),
  "stock-movements": () => import("./_handlers/stock-movements"),
  transactions: () => import("./_handlers/transactions"),
  units: () => import("./_handlers/units"),
  variants: () => import("./_handlers/variants"),
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const slug = req.query.slug;
  const name = Array.isArray(slug) ? slug[0] : slug;

  if (!name || !handlers[name]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const mod = await handlers[name]();
  await mod.default(req, res);
}
