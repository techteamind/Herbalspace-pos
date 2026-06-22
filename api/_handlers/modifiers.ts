import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { modifierGroups, modifierOptions } from "../db/schema";
import { createHandler } from "./_lib/handler";

export default createHandler({
  async GET(_req, res, auth) {
    const groups = await db.query.modifierGroups.findMany({
      where: eq(modifierGroups.tenantId, auth.tenantId),
      with: { options: true },
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    res.json(groups);
  },

  async POST(req, res, auth) {
    const { name, isRequired, maxSelect, options } = req.body as {
      name: string;
      isRequired?: boolean;
      maxSelect?: number;
      options: { name: string; price: number }[];
    };
    if (!name) { res.status(400).json({ error: "name wajib" }); return; }

    const [group] = await db.insert(modifierGroups).values({
      tenantId: auth.tenantId,
      name,
      isRequired: isRequired ?? false,
      maxSelect: maxSelect ?? 5,
    }).returning();

    if (group && options?.length) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]!;
        await db.insert(modifierOptions).values({
          tenantId: auth.tenantId,
          groupId: group.id,
          name: opt.name,
          price: String(opt.price || 0),
          sortOrder: i,
        });
      }
    }

    const full = await db.query.modifierGroups.findFirst({
      where: eq(modifierGroups.id, group!.id),
      with: { options: true },
    });
    res.status(201).json(full);
  },

  async PUT(req, res, auth) {
    const { id, name, isRequired, maxSelect, options } = req.body as {
      id: string;
      name: string;
      isRequired?: boolean;
      maxSelect?: number;
      options: { name: string; price: number }[];
    };
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }

    await db.update(modifierGroups)
      .set({ name, isRequired: isRequired ?? false, maxSelect: maxSelect ?? 5 })
      .where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)));

    await db.delete(modifierOptions).where(eq(modifierOptions.groupId, id));
    for (let i = 0; i < (options ?? []).length; i++) {
      const opt = options[i]!;
      await db.insert(modifierOptions).values({
        tenantId: auth.tenantId,
        groupId: id,
        name: opt.name,
        price: String(opt.price || 0),
        sortOrder: i,
      });
    }

    const full = await db.query.modifierGroups.findFirst({
      where: eq(modifierGroups.id, id),
      with: { options: true },
    });
    res.json(full);
  },

  async DELETE(req, res, auth) {
    const id = String(req.query.id ?? "");
    if (!id) { res.status(400).json({ error: "id wajib" }); return; }
    await db.delete(modifierGroups).where(and(eq(modifierGroups.id, id), eq(modifierGroups.tenantId, auth.tenantId)));
    res.json({ ok: true });
  },
});
