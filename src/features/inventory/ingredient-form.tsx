import { useState } from "react";
import { FormSheet, Field, inputCls } from "@/components/shared";
import { useCreateIngredient, useUpdateIngredient, useUnits } from "@/hooks/use-ingredients";
import type { IngredientWithUnit } from "@/types";

export function IngredientForm({ initial, onClose }: { initial?: IngredientWithUnit; onClose: () => void }): JSX.Element {
  const create = useCreateIngredient();
  const update = useUpdateIngredient();
  const { data: units } = useUnits();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [unitId, setUnitId] = useState(initial?.unitId ?? "");
  const [currentStock, setCurrentStock] = useState(initial ? String(Number(initial.currentStock)) : "");
  const [minStock, setMinStock] = useState(initial ? String(Number(initial.minStock)) : "");
  const [lastCost, setLastCost] = useState(initial ? String(Number(initial.lastCost)) : "");

  const busy = create.isPending || update.isPending;
  const err = create.error || update.error;

  async function submit(): Promise<void> {
    if (editing) await update.mutateAsync({ id: initial.id, name, unitId, minStock: Number(minStock) || 0, lastCost: Number(lastCost) || 0 });
    else await create.mutateAsync({ name, unitId, currentStock: Number(currentStock) || 0, minStock: Number(minStock) || 0, lastCost: Number(lastCost) || 0 });
    onClose();
  }

  return (
    <FormSheet title={editing ? "Edit Bahan Baku" : "Tambah Bahan Baku"} onClose={onClose}>
      <Field label="Nama Bahan"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Susu Segar" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Satuan">
          <select className={inputCls} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">— Pilih —</option>
            {(units ?? []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
          </select>
        </Field>
        {!editing && <Field label="Stok Awal"><input className={inputCls} inputMode="decimal" value={currentStock} onChange={(e) => setCurrentStock(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></Field>}
        <Field label="Stok Minimum"><input className={inputCls} inputMode="decimal" value={minStock} onChange={(e) => setMinStock(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></Field>
        <Field label="Harga Beli / Satuan"><input className={inputCls} inputMode="decimal" value={lastCost} onChange={(e) => setLastCost(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></Field>
      </div>
      {editing && <p className="font-label-caps text-label-caps text-on-surface-variant">Stok saat ini diubah lewat penerimaan / penyesuaian, bukan di sini.</p>}
      {err && <p className="font-body-md text-body-md text-error">{err instanceof Error ? err.message : "Gagal menyimpan"}</p>}
      <button onClick={submit} disabled={!name || !unitId || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Bahan"}
      </button>
    </FormSheet>
  );
}
