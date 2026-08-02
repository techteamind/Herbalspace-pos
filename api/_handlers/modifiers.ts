import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { modifierGroups, modifierOptions, modifierOptionIngredients, ingredients } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole, outletFilter } from "../_lib/auth.js";

interface OptIn { name: string; price: number; ingredients?: { ingredientId: string; quantity: number }[] }

// Simpan opsi sebuah grup + bahan yang dikonsumsi tiap opsi (untuk potong stok).
// Bahan divalidasi milik tenant. Dipakai POST & PUT (options di-replace penuh).
async function insertOptions(tx: typeof db, tenantId: string, groupId: string, options: OptIn[]): Promise<void> {
  // kumpulkan semua ingredientId → validasi kepemilikan tenant sekali
  const ingIds = [...new Set((options ?? []).flatMap((o) => (o.ingredients ?? []).map((x) => x.ingredientId).filter(Boolean)))];
  let owned = new Set<string>();
  if (ingIds.length > 0) {
    const rows = await tx.query.ingredients.findMany({
      where: and(inArray(ingredients.id, ingIds), eq(ingredients.tenantId, tenantId)),
      columns: { id: true },
    });
    owned = new Set(rows.map((r) => r.id));
    if (owned.size !== ingIds.length) throw new Error("Ada bahan add-on yang tidak ditemukan di outlet Anda");
  }
  for (let i = 0; i < (options ?? []).length; i++) {
    const opt = options[i]!;
    const [o] = await tx.insert(modifierOptions).values({
      tenantId, groupId, name: opt.name, price: String(opt.price || 0), sortOrder: i,
    }).returning({ id: modifierOptions.id });
    const ings = (opt.ingredients ?? []).filter((x) => x.ingredientId && Number(x.quantity) > 0);
    if (o && ings.length > 0) {
      await tx.insert(modifierOptionIngredients).values(ings.map((x) => ({
        tenantId, optionId: o.id, ingredientId: x.ingredientId, quantity: String(x.quantity),
      })));
    }
  }
}

const withOptions = {
  options: { with: { ingredients: { with: { ingredient: { with: { unit: true } } } } } },
} as const;

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(modifierGroups.tenantId, auth.tenantId)];
    const of = outletFilter(modifierGroups.outletId, auth.outletId);
    if (of) conditions.push(of);
    const groups = await db.query.modifierGroups.findMany({
      where: and(...conditions),
      with: withOptions,
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    res.json(groups);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { name, isRequired, maxSelect, options } = req.body as {
      name: string; isRequired?: boolean; maxSelect?: number; options: OptIn[];
    };
    if (!name) { res.status(400).json({ error: "name wajib" }); return; }

    let group;
    try {
      group = await db.transaction(async (tx) => {
        const [grp] = await tx.insert(modifierGroups).values({
          tenantId: auth.tenantId, outletId: auth.outletId ?? undefined,
          name, isRequired: isRequired ?? false, maxSelect: maxSelect ?? 5,
        }).returning();
        if (grp && options?.length) await insertOptions(tx, auth.tenantId, grp.id, options);
        return grp;
      });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Gagal menyimpan" }); return;
    }

    const full = await db.query.modifierGroups.findFirst({
      where: and(eq(modifierGroups.id, group!.id), eq(modifierGroups.tenantId, auth.tenantId)),
      with: withOptions,
    });
    res.status(201).json(full);
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { id, name, isRequired, maxSelect, options } = req.body as {
      id: string; name: string; isRequired?: boolean; maxSelect?: number; options: OptIn[];
    };
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    const owned = await db.query.modifierGroups.findFirst({
      where: and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)),
      columns: { id: true },
    });
    if (!owned) { res.status(404).json({ error: "Grup modifier tidak ditemukan" }); return; }

    try {
      await db.transaction(async (tx) => {
        await tx.update(modifierGroups)
          .set({ name, isRequired: isRequired ?? false, maxSelect: maxSelect ?? 5 })
          .where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)));
        // hapus opsi lama (cascade menghapus modifier_option_ingredients-nya) lalu tulis ulang
        await tx.delete(modifierOptions).where(and(eq(modifierOptions.groupId, id), eq(modifierOptions.tenantId, auth.tenantId)));
        await insertOptions(tx, auth.tenantId, id, options ?? []);
      });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Gagal menyimpan" }); return;
    }

    const full = await db.query.modifierGroups.findFirst({
      where: and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)),
      with: withOptions,
    });
    res.json(full);
  },

  async DELETE(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(modifierGroups).where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)));
    res.json({ ok: true });
  },
});
