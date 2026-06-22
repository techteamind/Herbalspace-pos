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

const handlers: Record<string, (req: VercelRequest, res: VercelResponse) => void | Promise<void>> = {
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
  const slug = req.query.slug;
  const name = Array.isArray(slug) ? slug[0] : slug;

  if (!name || !handlers[name]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await handlers[name](req, res);
}
