import { useRef, useState, type MouseEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { PageHeader, Icon, FormSheet, Field, inputCls, useConfirm } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import type { ProductWithCategory, Category } from "@/types";
import { ProductForm } from "./product-form";

export function ProductsPage(): JSX.Element {
  const [tab, setTab] = useState<"produk" | "kategori">("produk");
  const [search, setSearch] = useState("");

  const { data: products, isLoading, isError, error } = useProducts();
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const deleteCategory = useDeleteCategory();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductWithCategory | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);
  const createProduct = useCreateProduct();
  const { confirm: confirmDelete, ConfirmDialog } = useConfirm();

  function onAdd(): void {
    if (tab === "kategori") setShowCatForm(true);
    else setShowForm(true);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult("");
    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { setImportResult("CSV kosong"); setImporting(false); return; }
      const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
      const nameIdx = header.findIndex((h) => h === "nama" || h === "name");
      const priceIdx = header.findIndex((h) => h === "harga" || h === "price");
      const skuIdx = header.findIndex((h) => h === "sku");
      if (nameIdx === -1 || priceIdx === -1) { setImportResult("CSV harus punya kolom 'nama' dan 'harga'"); setImporting(false); return; }

      let ok = 0;
      let fail = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]!.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[nameIdx];
        const price = Number(cols[priceIdx]?.replace(/[^0-9.]/g, ""));
        if (!name || !price) { fail++; continue; }
        try {
          await createProduct.mutateAsync({ name, price, sku: skuIdx >= 0 ? cols[skuIdx] : undefined });
          ok++;
        } catch { fail++; }
      }
      setImportResult(`${ok} produk berhasil diimpor${fail > 0 ? `, ${fail} gagal` : ""}`);
    } catch { setImportResult("Gagal membaca file CSV"); }
    setImporting(false);
    if (csvRef.current) csvRef.current.value = "";
  }

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()));

  function toggleActive(p: ProductWithCategory, e: MouseEvent): void {
    e.stopPropagation();
    updateProduct.mutate({ id: p.id, isActive: !p.isActive });
  }

  async function removeProduct(p: ProductWithCategory, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    if (await confirmDelete(`Hapus produk "${p.name}"?`, "Produk yang dihapus tidak dapat dikembalikan.")) {
      deleteProduct.mutate(p.id);
    }
  }

  async function removeCat(c: Category): Promise<void> {
    if (await confirmDelete(`Hapus kategori "${c.name}"?`, "Produk di kategori ini tidak akan terhapus.")) {
      deleteCategory.mutate(c.id);
    }
  }

  return (
    <>
      <PageHeader title="Produk" />
      <div className="px-container-padding">
        <div className="flex bg-surface-container rounded-xl p-1">
          <button onClick={() => setTab("produk")}
            className={`flex-1 h-10 rounded-lg font-body-md text-body-md ${tab === "produk" ? "bg-surface-container-lowest text-on-surface font-semibold shadow-card" : "text-on-surface-variant"}`}>Produk</button>
          <button onClick={() => setTab("kategori")}
            className={`flex-1 h-10 rounded-lg font-body-md text-body-md ${tab === "kategori" ? "bg-surface-container-lowest text-on-surface font-semibold shadow-card" : "text-on-surface-variant"}`}>Kategori</button>
        </div>
      </div>

      <div className="px-container-padding py-3 flex gap-gutter">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-touch-target-min pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:border-primary font-body-md text-body-md" placeholder={tab === "produk" ? "Cari produk..." : "Cari kategori..."} />
        </div>
        {tab === "produk" && (
          <button onClick={() => csvRef.current?.click()} disabled={importing}
            className="h-touch-target-min w-11 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50">
            <Icon name="upload_file" className="text-on-surface-variant" />
          </button>
        )}
        <button onClick={onAdd} className="bg-primary text-on-primary h-touch-target-min px-4 rounded-xl flex items-center gap-1 font-body-md text-body-md font-semibold active:scale-95 transition-transform shadow-card shrink-0">
          <Icon name="add" filled className="text-[20px]" />Tambah
        </button>
        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
      </div>
      {importResult && (
        <div className="px-container-padding">
          <div className="bg-primary-container/20 border border-primary/30 rounded-xl p-3 flex items-center justify-between">
            <p className="font-body-md text-body-md text-on-surface">{importResult}</p>
            <button onClick={() => setImportResult("")} className="text-on-surface-variant"><Icon name="close" className="text-[18px]" /></button>
          </div>
        </div>
      )}

      {tab === "produk" ? (
        <div className="px-container-padding space-y-2">
          {isLoading && <ListSkeleton />}
          {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat produk"} />}
          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState icon="inventory_2" title="Belum ada produk" subtitle="Tambah produk pertama untuk mulai berjualan." />
          )}
          {filtered.map((p) => (
            <div key={p.id} role="button" onClick={() => setEditing(p)}
              className="w-full bg-surface-container-lowest p-3 rounded-xl shadow-card border border-transparent active:scale-[0.98] transition-transform flex items-center gap-3 text-left cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="inventory_2" className="text-outline" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-body-md text-body-md font-semibold text-on-surface truncate">{p.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.category && <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{p.category.name}</span>}
                  <span className="font-body-md text-body-md text-primary font-semibold">{formatRupiah(p.price)}</span>
                </div>
              </div>
              <button onClick={(e) => removeProduct(p, e)} className="w-8 h-8 flex items-center justify-center text-error/60 hover:text-error shrink-0">
                <Icon name="delete" className="text-[20px]" />
              </button>
              <span role="switch" aria-checked={p.isActive} onClick={(e) => toggleActive(p, e)}
                className={`w-11 h-6 rounded-full relative shrink-0 cursor-pointer ${p.isActive ? "bg-primary-container" : "bg-surface-container-highest"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-surface-container-lowest rounded-full shadow transition-all ${p.isActive ? "right-0.5" : "left-0.5"}`} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-container-padding space-y-2">
          {(categories ?? []).length === 0 && (
            <EmptyState icon="category" title="Belum ada kategori" subtitle="Buat kategori untuk mengelompokkan produk." />
          )}
          {(categories ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).map((c) => (
            <div key={c.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-card flex items-center justify-between">
              <span className="font-body-md text-body-md font-semibold text-on-surface">{c.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingCat(c); setShowCatForm(true); }} className="w-8 h-8 flex items-center justify-center text-on-surface-variant">
                  <Icon name="edit" className="text-[20px]" />
                </button>
                <button onClick={() => removeCat(c)} className="w-8 h-8 flex items-center justify-center text-error/60 hover:text-error">
                  <Icon name="delete" className="text-[20px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {showForm && <ProductForm onClose={() => setShowForm(false)} />}
        {editing && <ProductForm initial={editing} onClose={() => setEditing(null)} />}
        {showCatForm && <CategoryForm initial={editingCat} onClose={() => { setShowCatForm(false); setEditingCat(null); }} />}
      </AnimatePresence>
      <ConfirmDialog />
    </>
  );
}

function CategoryForm({ initial, onClose }: { initial?: Category | null; onClose: () => void }): JSX.Element {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const busy = create.isPending || update.isPending;

  async function submit(): Promise<void> {
    if (editing) await update.mutateAsync({ id: initial!.id, name });
    else await create.mutateAsync({ name });
    onClose();
  }

  return (
    <FormSheet title={editing ? "Edit Kategori" : "Tambah Kategori"} onClose={onClose}>
      <Field label="Nama Kategori">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Herbal Serbuk" autoFocus />
      </Field>
      <button onClick={submit} disabled={!name.trim() || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Kategori"}
      </button>
    </FormSheet>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[68px] bg-surface-container-low rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <Icon name={icon} className="text-[40px] text-outline mb-2" />
      <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className="bg-error-container/40 border border-error/30 rounded-xl p-4 text-on-error-container font-body-md text-body-md flex items-center gap-2">
      <Icon name="error" />{message}
    </div>
  );
}
