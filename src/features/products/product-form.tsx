import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormSheet, Field, inputCls, Icon, ConfirmDialog, useToast } from "@/components/shared";
import { useCreateProduct, useUpdateProduct, useDeleteProduct, usePriceHistory } from "@/hooks/use-products";
import { formatRupiah } from "@/lib/utils";
import { useCategories } from "@/hooks/use-categories";
import { uploadProductImage, compressImage, deleteProductImage } from "@/lib/upload";
import { haptic, hapticError } from "@/lib/haptic";
import type { ProductWithCategory } from "@/types";
import { VariantEditor } from "./variant-editor";
import { apiFetch } from "@/lib/api-client";
import { useModifiers } from "@/hooks/use-modifiers";

export function ProductForm({ initial, onClose }: { initial?: ProductWithCategory; onClose: () => void }): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const { data: categories } = useCategories();
  const { data: priceHist } = usePriceHistory(initial?.id);
  const { data: allModifiers } = useModifiers();
  const editing = !!initial;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(Number(initial.price)) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const initGroups = (initial?.variantGroups ?? []).map((g) => ({
    name: g.name,
    options: g.options.map((o) => o.label),
  }));
  const initVariants = (initial?.variants ?? []).map((v) => ({
    optionIds: v.optionIds as string[],
    label: v.label,
    sku: v.sku ?? "",
    price: String(Number(v.price)),
  }));
  const [variantGroups, setVariantGroups] = useState(initGroups);
  const [variants, setVariants] = useState(initVariants);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>(
    () => (initial?.modifiers ?? []).map((m) => m.modifierGroupId)
  );

  const busy = create.isPending || update.isPending || del.isPending || uploading;
  const err = create.error || update.error || del.error;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadProductImage(compressed, "products");
      setImageUrl(url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Gagal upload gambar");
      setImagePreview(initial?.imageUrl ?? null);
      setImageUrl(initial?.imageUrl ?? "");
    }
    setUploading(false);
  }

  async function removeImage(): Promise<void> {
    if (imageUrl && imageUrl !== initial?.imageUrl) {
      await deleteProductImage(imageUrl).catch(() => {});
    }
    setImageUrl("");
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(): Promise<void> {
    let productId: string;
    if (editing) {
      await update.mutateAsync({ id: initial.id, name, price: Number(price), categoryId: categoryId || undefined, sku: sku || undefined, imageUrl: imageUrl || undefined });
      productId = initial.id;
    } else {
      const created = await create.mutateAsync({ name, price: Number(price) || 0, categoryId: categoryId || undefined, sku: sku || undefined, imageUrl: imageUrl || undefined });
      productId = (created as { id: string }).id;
    }
    if (variantGroups.length > 0 && variants.length > 0) {
      const validGroups = variantGroups.filter((g) => g.name && g.options.some((o) => o));
      if (validGroups.length > 0) {
        await apiFetch("variants", {
          method: "POST",
          body: JSON.stringify({
            productId,
            groups: validGroups.map((g) => ({ name: g.name, options: g.options.filter((o) => o) })),
            variants: variants.map((v) => ({
              optionIds: v.optionIds,
              label: v.label,
              sku: v.sku || undefined,
              price: Number(v.price) || Number(price) || 0,
            })),
          }),
        });
      }
    } else if (editing) {
      await apiFetch("variants", {
        method: "POST",
        body: JSON.stringify({ productId, groups: [], variants: [] }),
      });
    }
    await apiFetch("product-modifiers", {
      method: "POST",
      body: JSON.stringify({ productId, modifierGroupIds: selectedModifierIds }),
    });
    haptic();
    toast(editing ? "Produk diperbarui" : "Produk ditambahkan");
    onClose();
  }

  async function remove(): Promise<void> {
    if (!initial) return;
    if (initial.imageUrl) await deleteProductImage(initial.imageUrl).catch(() => {});
    await del.mutateAsync(initial.id);
    hapticError();
    toast("Produk dihapus", "error");
    onClose();
  }

  return (
    <FormSheet title={editing ? "Edit Produk" : "Tambah Produk"} onClose={onClose}>
      {/* Image upload */}
      <div className="flex flex-col items-center gap-2">
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className="w-32 h-32 rounded-xl bg-surface-container border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors relative"
        >
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-on-surface-variant">
              <Icon name="add_photo_alternate" className="text-[32px]" />
              <span className="font-label-caps text-label-caps">Tambah Foto</span>
            </div>
          )}
        </div>
        {imagePreview && !uploading && (
          <button onClick={removeImage} type="button" className="font-label-caps text-label-caps text-error flex items-center gap-1">
            <Icon name="close" className="text-[14px]" />Hapus Foto
          </button>
        )}
        {uploadErr && <p className="font-label-caps text-label-caps text-error">{uploadErr}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <Field label="Nama Produk" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kopi Susu Gula Aren" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Harga Jual" required><input className={inputCls} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="25000" /></Field>
        <Field label="Kategori">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Pilih —</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="SKU (opsional)"><input className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="KSG-001" /></Field>

      <VariantEditor
        basePrice={Number(price) || 0}
        groups={variantGroups}
        variants={variants}
        onChange={(g, v) => { setVariantGroups(g); setVariants(v); }}
      />

      {/* Modifier groups assignment */}
      {(allModifiers ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <Icon name="add_circle" className="text-[14px]" /> Add-ons / Modifier
          </p>
          <div className="flex flex-wrap gap-2">
            {(allModifiers ?? []).map((mg) => {
              const active = selectedModifierIds.includes(mg.id);
              return (
                <button key={mg.id} type="button"
                  onClick={() => setSelectedModifierIds((prev) => active ? prev.filter((id) => id !== mg.id) : [...prev, mg.id])}
                  className={`h-9 px-3 rounded-full font-body-md text-body-md transition-colors ${active ? "bg-primary text-on-primary shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
                  {mg.name} ({mg.options.length})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <button onClick={() => { onClose(); navigate(`/produk/${initial.id}/resep`); }}
          className="w-full flex items-center justify-between bg-primary-container/10 border border-primary-container rounded-xl px-4 h-touch-target-min text-primary">
          <span className="flex items-center gap-2"><Icon name="science" /><span className="font-body-md text-body-md font-semibold">Atur Resep Bahan Baku</span></span>
          <Icon name="chevron_right" />
        </button>
      )}

      {editing && (priceHist ?? []).length > 0 && (
        <div className="bg-surface-container rounded-xl p-3 space-y-2">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <Icon name="history" className="text-[14px]" /> Riwayat Harga
          </p>
          {(priceHist ?? []).slice(0, 5).map((h) => (
            <div key={h.id} className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {new Date(h.changedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant line-through">{formatRupiah(h.oldPrice)}</span>
                <Icon name="arrow_forward" className="text-[12px] text-on-surface-variant" />
                <span className="font-label-caps text-label-caps text-primary font-semibold">{formatRupiah(h.newPrice)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {err && <p className="font-body-md text-body-md text-error">{err instanceof Error ? err.message : "Gagal menyimpan"}</p>}
      <button onClick={submit} disabled={!name || !price || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Produk"}
      </button>
      {editing && (
        <button onClick={() => setShowDeleteConfirm(true)} disabled={busy} className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2">
          <Icon name="delete" />Hapus Produk
        </button>
      )}
      <ConfirmDialog open={showDeleteConfirm} title={`Hapus produk "${initial?.name}"?`} message="Produk yang dihapus tidak dapat dikembalikan."
        onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
    </FormSheet>
  );
}
