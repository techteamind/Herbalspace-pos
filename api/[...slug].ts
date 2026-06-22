import type { VercelRequest, VercelResponse } from "@vercel/node";

import auditLogs from "./_handlers/audit-logs";
import categories from "./_handlers/categories";
import customers from "./_handlers/customers";
import dashboard from "./_handlers/dashboard";
import employees from "./_handlers/employees";
import expenses from "./_handlers/expenses";
import health from "./_handlers/health";
import ingredients from "./_handlers/ingredients";
import me from "./_handlers/me";
import modifiers from "./_handlers/modifiers";
import outlets from "./_handlers/outlets";
import priceHistory from "./_handlers/price-history";
import productModifiers from "./_handlers/product-modifiers";
import products from "./_handlers/products";
import promos from "./_handlers/promos";
import recipes from "./_handlers/recipes";
import sales from "./_handlers/sales";
import settings from "./_handlers/settings";
import shareReceipt from "./_handlers/share-receipt";
import shifts from "./_handlers/shifts";
import stockMovements from "./_handlers/stock-movements";
import transactions from "./_handlers/transactions";
import units from "./_handlers/units";
import variants from "./_handlers/variants";

type Handler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

const routes: Record<string, Handler> = {
  "audit-logs": auditLogs,
  categories,
  customers,
  dashboard,
  employees,
  expenses,
  health,
  ingredients,
  me,
  modifiers,
  outlets,
  "price-history": priceHistory,
  "product-modifiers": productModifiers,
  products,
  promos,
  recipes,
  sales,
  settings,
  "share-receipt": shareReceipt,
  shifts,
  "stock-movements": stockMovements,
  transactions,
  units,
  variants,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const raw = req.query["...slug"] ?? req.query.slug;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const name = parts[0];

  const route = name ? routes[name] : undefined;
  if (!route) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await route(req, res);
}
