import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormSheet, Field, inputCls, Icon } from "@/components/shared";
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import type { ProductWithCategory } from "@/types";

export function ProductForm({ initial, onClose }: { initial?: ProductWithCategory; onClose: () => void }): JSX.Element {
  const navigate = useNavigate();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const { data: categories } = useCategories();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(Number(initial.price)) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");

  const busy = create.isPending || update.isPending || del.isPending;
  const err = create.error || update.error || del.error;

  async function submit(): Promise<void> {
    if (editing) await update.mutateAsync({ id: initial.id, name, price: Number(price), categoryId: categoryId || undefined, sku: sku || undefined });
    else await create.mutateAsync({ name, price: Number(price) || 0, categoryId: categoryId || undefined, sku: sku || undefined });
    onClose();
  }
  async function remove(): Promise<void> {
    if (!initial) return;
    if (!confirm(`Hapus produk "${initial.name}"?`)) return;
    await del.mutateAsync(initial.id);
    onClose();
  }

  return (
    <FormSheet title={editing ? "Edit Produk" : "Tambah Produk"} onClose={onClose}>
      <Field label="Nama Produk"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kopi Susu Gula Aren" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Harga Jual"><input className={inputCls} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="25000" /></Field>
        <Field label="Kategori">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Pilih —</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="SKU (opsional)"><input className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="KSG-001" /></Field>

      {editing && (
        <button onClick={() => { onClose(); navigate(`/produk/${initial.id}/resep`); }}
          className="w-full flex items-center justify-between bg-primary-container/10 border border-primary-container rounded-xl px-4 h-touch-target-min text-primary">
          <span className="flex items-center gap-2"><Icon name="science" /><span className="font-body-md text-body-md font-semibold">Atur Resep Bahan Baku</span></span>
          <Icon name="chevron_right" />
        </button>
      )}

      {err && <p className="font-body-md text-body-md text-error">{err instanceof Error ? err.message : "Gagal menyimpan"}</p>}
      <button onClick={submit} disabled={!name || !price || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Produk"}
      </button>
      {editing && (
        <button onClick={remove} disabled={busy} className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2">
          <Icon name="delete" />Hapus Produk
        </button>
      )}
    </FormSheet>
  );
}
