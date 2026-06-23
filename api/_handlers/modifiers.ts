import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { modifierGroups, modifierOptions } from "../../db/schema.js";
import { createHandler } from "../_lib/handler.js";
import { requireRole } from "../_lib/auth.js";

export default createHandler({
  async GET(_req, res, auth) {
    const conditions = [eq(modifierGroups.tenantId, auth.tenantId)];
    if (auth.outletId) conditions.push(eq(modifierGroups.outletId, auth.outletId));
    const groups = await db.query.modifierGroups.findMany({
      where: and(...conditions),
      with: { options: true },
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    res.json(groups);
  },

  async POST(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { name, isRequired, maxSelect, options } = req.body as {
      name: string;
      isRequired?: boolean;
      maxSelect?: number;
      options: { name: string; price: number }[];
    };
    if (!name) { res.status(400).json({ error: "name wajib" }); return; }

    const group = await db.transaction(async (tx) => {
      const [grp] = await tx.insert(modifierGroups).values({
        tenantId: auth.tenantId,
        outletId: auth.outletId ?? undefined,
        name,
        isRequired: isRequired ?? false,
        maxSelect: maxSelect ?? 5,
      }).returning();

      if (grp && options?.length) {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i]!;
          await tx.insert(modifierOptions).values({
            tenantId: auth.tenantId,
            groupId: grp.id,
            name: opt.name,
            price: String(opt.price || 0),
            sortOrder: i,
          });
        }
      }
      return grp;
    });

    const full = await db.query.modifierGroups.findFirst({
      where: eq(modifierGroups.id, group!.id),
      with: { options: true },
    });
    res.status(201).json(full);
  },

  async PUT(req, res, auth) {
    if (!requireRole(auth, "manager", res)) return;
    const { id, name, isRequired, maxSelect, options } = req.body as {
      id: string;
      name: string;
      isRequired?: boolean;
      maxSelect?: number;
      options: { name: string; price: number }[];
    };
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }

    await db.transaction(async (tx) => {
      await tx.update(modifierGroups)
        .set({ name, isRequired: isRequired ?? false, maxSelect: maxSelect ?? 5 })
        .where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)));

      await tx.delete(modifierOptions).where(and(eq(modifierOptions.groupId, id), eq(modifierOptions.tenantId, auth.tenantId)));
      for (let i = 0; i < (options ?? []).length; i++) {
        const opt = options[i]!;
        await tx.insert(modifierOptions).values({
          tenantId: auth.tenantId,
          groupId: id,
          name: opt.name,
          price: String(opt.price || 0),
          sortOrder: i,
        });
      }
    });

    const full = await db.query.modifierGroups.findFirst({
      where: eq(modifierGroups.id, id),
      with: { options: true },
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
