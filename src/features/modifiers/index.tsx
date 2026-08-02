import { useState } from "react";
import { PageHeader, Icon, ListSkeleton, EmptyState, inputCls, Field, FormSheet, ConfirmDialog, useToast } from "@/components/shared";
import { useModifiers, useCreateModifier, useUpdateModifier, useDeleteModifier } from "@/hooks/use-modifiers";
import { useIngredients } from "@/hooks/use-ingredients";
import { formatRupiah } from "@/lib/utils";
import type { ModifierGroupWithOptions } from "@/types";

interface OptState { name: string; price: string; ingredients: { ingredientId: string; quantity: string }[] }

export function ModifiersPage(): JSX.Element {
  const { data: groups, isLoading } = useModifiers();
  const [editing, setEditing] = useState<ModifierGroupWithOptions | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <PageHeader title="Add-ons / Modifier" leftIcon="arrow_back" onLeft={() => window.history.back()} />
      <div className="px-container-padding space-y-3 pb-24">
        {isLoading && <ListSkeleton rows={4} />}
        {!isLoading && (groups ?? []).length === 0 && (
          <EmptyState icon="add_circle" title="Belum ada modifier" subtitle="Tambah grup add-on seperti Ukuran Botol, Kemasan, Gift Wrap, dll." />
        )}
        {(groups ?? []).map((g) => (
          <button key={g.id} onClick={() => { setEditing(g); setShowForm(true); }}
            className="w-full text-left bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-elevation-1 p-4 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-body-md text-body-md font-semibold text-on-surface">{g.name}</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">
                  {g.isRequired ? "Wajib" : "Opsional"} · Maks {g.maxSelect} pilihan
                </p>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {g.options.map((o) => (
                <span key={o.id} className="h-6 px-2 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-[10px] flex items-center gap-1">
                  {o.name} {Number(o.price) > 0 && <span className="text-primary">+{formatRupiah(o.price)}</span>}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => { setEditing(null); setShowForm(true); }}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-on-primary shadow-elevation-3 flex items-center justify-center z-40 active:scale-95 transition-transform">
        <Icon name="add" className="text-[28px]" />
      </button>

      {showForm && (
        <ModifierForm initial={editing} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </>
  );
}

function ModifierForm({ initial, onClose }: { initial: ModifierGroupWithOptions | null; onClose: () => void }): JSX.Element {
  const toast = useToast();
  const create = useCreateModifier();
  const update = useUpdateModifier();
  const del = useDeleteModifier();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? false);
  const [maxSelect, setMaxSelect] = useState(String(initial?.maxSelect ?? 5));
  const { data: allIngredients } = useIngredients();
  const [options, setOptions] = useState<OptState[]>(
    initial?.options.map((o) => ({
      name: o.name, price: String(Number(o.price)),
      ingredients: (o.ingredients ?? []).map((ing) => ({ ingredientId: ing.ingredientId, quantity: String(Number(ing.quantity)) })),
    })) ?? [{ name: "", price: "0", ingredients: [] }]
  );
  const [showDelete, setShowDelete] = useState(false);

  const busy = create.isPending || update.isPending || del.isPending;

  function addOption() {
    setOptions((prev) => [...prev, { name: "", price: "0", ingredients: [] }]);
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, field: "name" | "price", val: string) {
    setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  }

  function addIngredient(oi: number) {
    setOptions((prev) => prev.map((o, idx) => idx === oi ? { ...o, ingredients: [...o.ingredients, { ingredientId: "", quantity: "" }] } : o));
  }
  function removeIngredient(oi: number, ii: number) {
    setOptions((prev) => prev.map((o, idx) => idx === oi ? { ...o, ingredients: o.ingredients.filter((_, k) => k !== ii) } : o));
  }
  function updateIngredient(oi: number, ii: number, field: "ingredientId" | "quantity", val: string) {
    setOptions((prev) => prev.map((o, idx) => idx === oi
      ? { ...o, ingredients: o.ingredients.map((g, k) => k === ii ? { ...g, [field]: val } : g) } : o));
  }

  async function submit() {
    const validOptions = options.filter((o) => o.name.trim());
    const data = {
      name,
      isRequired,
      maxSelect: Number(maxSelect) || 5,
      options: validOptions.map((o) => ({
        name: o.name, price: Number(o.price) || 0,
        ingredients: o.ingredients
          .filter((g) => g.ingredientId && Number(g.quantity) > 0)
          .map((g) => ({ ingredientId: g.ingredientId, quantity: Number(g.quantity) })),
      })),
    };

    if (editing) {
      await update.mutateAsync({ id: initial!.id, ...data });
      toast("Modifier diperbarui");
    } else {
      await create.mutateAsync(data);
      toast("Modifier ditambahkan");
    }
    onClose();
  }

  async function remove() {
    if (!initial) return;
    await del.mutateAsync(initial.id);
    toast("Modifier dihapus", "error");
    onClose();
  }

  return (
    <FormSheet title={editing ? "Edit Modifier" : "Tambah Modifier"} onClose={onClose}>
      <Field label="Nama Grup" required>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Ukuran, Tipe, Aroma" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Wajib dipilih?">
          <button type="button" onClick={() => setIsRequired(!isRequired)}
            className={`w-full h-touch-target-min rounded-xl border font-body-md text-body-md font-semibold transition-colors ${isRequired ? "bg-primary-container text-on-primary-container border-transparent" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"}`}>
            {isRequired ? "Ya, Wajib" : "Opsional"}
          </button>
        </Field>
        <Field label="Maks pilihan">
          <input className={inputCls} inputMode="numeric" value={maxSelect}
            onChange={(e) => setMaxSelect(e.target.value.replace(/[^0-9]/g, ""))} />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Opsi</p>
        {options.map((o, i) => (
          <div key={i} className="rounded-xl border border-outline-variant/40 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <input className={`${inputCls} flex-1`} value={o.name} onChange={(e) => updateOption(i, "name", e.target.value)} placeholder="Nama opsi" />
              <div className="relative w-28 shrink-0">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-label-caps text-label-caps text-on-surface-variant">+Rp</span>
                <input className={`${inputCls} pl-10`} inputMode="numeric" value={o.price}
                  onChange={(e) => updateOption(i, "price", e.target.value.replace(/[^0-9]/g, ""))} />
              </div>
              {options.length > 1 && (
                <button type="button" onClick={() => removeOption(i)} className="text-error p-1 shrink-0">
                  <Icon name="close" className="text-[18px]" />
                </button>
              )}
            </div>
            {/* Bahan yang dikonsumsi opsi ini (potong stok saat dijual) */}
            {o.ingredients.map((g, k) => {
              const unit = (allIngredients ?? []).find((x) => x.id === g.ingredientId)?.unit.code;
              return (
                <div key={k} className="flex items-center gap-2 pl-1">
                  <Icon name="subdirectory_arrow_right" className="text-[16px] text-on-surface-variant/50 shrink-0" />
                  <select className={`${inputCls} flex-1`} value={g.ingredientId} onChange={(e) => updateIngredient(i, k, "ingredientId", e.target.value)}>
                    <option value="">Pilih bahan…</option>
                    {(allIngredients ?? []).map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                  </select>
                  <div className="relative w-24 shrink-0">
                    <input className={`${inputCls} pr-8`} inputMode="decimal" value={g.quantity} placeholder="Qty"
                      onChange={(e) => updateIngredient(i, k, "quantity", e.target.value.replace(/[^0-9.]/g, ""))} />
                    {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 font-label-caps text-[10px] text-on-surface-variant">{unit}</span>}
                  </div>
                  <button type="button" onClick={() => removeIngredient(i, k)} className="text-error p-1 shrink-0"><Icon name="close" className="text-[16px]" /></button>
                </div>
              );
            })}
            <button type="button" onClick={() => addIngredient(i)}
              className="text-[11px] text-on-surface-variant/80 hover:text-primary flex items-center gap-1 pl-1">
              <Icon name="add" className="text-[14px]" /> Bahan terpakai (opsional)
            </button>
          </div>
        ))}
        <button type="button" onClick={addOption}
          className="w-full h-10 rounded-lg border border-dashed border-outline-variant text-on-surface-variant font-label-caps text-label-caps flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors">
          <Icon name="add" className="text-[16px]" /> Tambah Opsi
        </button>
      </div>

      <button onClick={submit} disabled={!name || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan"}
      </button>

      {editing && (
        <button onClick={() => setShowDelete(true)} disabled={busy}
          className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2">
          <Icon name="delete" /> Hapus Modifier
        </button>
      )}
      <ConfirmDialog open={showDelete} title={`Hapus "${initial?.name}"?`} message="Modifier yang dihapus tidak dapat dikembalikan."
        onConfirm={remove} onCancel={() => setShowDelete(false)} />
    </FormSheet>
  );
}
