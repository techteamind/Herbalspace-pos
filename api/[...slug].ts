import type { VercelRequest, VercelResponse } from "@vercel/node";

import auditLogs from "./_handlers/audit-logs.js";
import changePassword from "./_handlers/change-password.js";
import categories from "./_handlers/categories.js";
import customers from "./_handlers/customers.js";
import dashboard from "./_handlers/dashboard.js";
import employees from "./_handlers/employees.js";
import expenses from "./_handlers/expenses.js";
import health from "./_handlers/health.js";
import ingredients from "./_handlers/ingredients.js";
import me from "./_handlers/me.js";
import modifiers from "./_handlers/modifiers.js";
import outlets from "./_handlers/outlets.js";
import priceHistory from "./_handlers/price-history.js";
import productModifiers from "./_handlers/product-modifiers.js";
import products from "./_handlers/products.js";
import promos from "./_handlers/promos.js";
import recipes from "./_handlers/recipes.js";
import sales from "./_handlers/sales.js";
import settings from "./_handlers/settings.js";
import shareReceipt from "./_handlers/share-receipt.js";
import shifts from "./_handlers/shifts.js";
import stockMovements from "./_handlers/stock-movements.js";
import transactions from "./_handlers/transactions.js";
import units from "./_handlers/units.js";
import variants from "./_handlers/variants.js";

type Handler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

const routes: Record<string, Handler> = {
  "audit-logs": auditLogs,
  "change-password": changePassword,
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

const ALLOWED_ORIGINS = [
  "https://herbalspace-pos.vercel.app",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
];

function setCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("https://herbaspace-pos-") && origin.endsWith(".vercel.app");
  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Outlet-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const raw = req.query["...slug"] ?? req.query.slug;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const name = parts[0];

  const route = name ? routes[name] : undefined;
  if (!route) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    await route(req, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[catch-all] ${name} error:`, message, stack);
    if (!res.headersSent) {
      res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : message });
    }
  }
}
