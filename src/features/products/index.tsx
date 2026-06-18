import { useState, type MouseEvent } from "react";
import { PageHeader, Icon } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import type { ProductWithCategory } from "@/types";
import { ProductForm } from "./product-form";

export function ProductsPage(): JSX.Element {
  const [tab, setTab] = useState<"produk" | "kategori">("produk");
  const [search, setSearch] = useState("");

  const { data: products, isLoading, isError, error } = useProducts();
  const { data: categories } = useCategories();
  const createCat = useCreateCategory();
  const updateProduct = useUpdateProduct();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductWithCategory | null>(null);

  function onAdd(): void {
    if (tab === "kategori") {
      const name = prompt("Nama kategori baru:");
      if (name) createCat.mutate({ name });
    } else setShowForm(true);
  }

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()));

  function toggleActive(p: ProductWithCategory, e: MouseEvent): void {
    e.stopPropagation();
    updateProduct.mutate({ id: p.id, isActive: !p.isActive });
  }

  return (
    <>
      <PageHeader title="Produk" rightIcon="search" />
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
            className="w-full h-touch-target-min pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:border-primary font-body-md text-body-md" placeholder="Cari produk..." />
        </div>
        <button onClick={onAdd} className="bg-primary text-on-primary h-touch-target-min px-4 rounded-xl flex items-center gap-1 font-body-md text-body-md font-semibold active:scale-95 transition-transform shadow-card shrink-0">
          <Icon name="add" filled className="text-[20px]" />Tambah
        </button>
      </div>

      {tab === "produk" ? (
        <div className="px-container-padding space-y-2">
          {isLoading && <ListSkeleton />}
          {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat produk"} />}
          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState icon="local_cafe" title="Belum ada produk" subtitle="Tambah produk pertama untuk mulai berjualan." />
          )}
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setEditing(p)}
              className="w-full bg-surface-container-lowest p-3 rounded-xl shadow-card border border-transparent active:scale-[0.98] transition-transform flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="local_cafe" className="text-outline" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-body-md text-body-md font-semibold text-on-surface truncate">{p.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.category && <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{p.category.name}</span>}
                  <span className="font-body-md text-body-md text-primary font-semibold">{formatRupiah(p.price)}</span>
                </div>
              </div>
              <span role="switch" aria-checked={p.isActive} onClick={(e) => toggleActive(p, e)}
                className={`w-11 h-6 rounded-full relative shrink-0 cursor-pointer ${p.isActive ? "bg-primary-container" : "bg-surface-container-highest"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${p.isActive ? "right-0.5" : "left-0.5"}`} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-container-padding space-y-2">
          {(categories ?? []).length === 0 && (
            <EmptyState icon="category" title="Belum ada kategori" subtitle="Buat kategori untuk mengelompokkan produk." />
          )}
          {(categories ?? []).map((c) => (
            <div key={c.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-card flex items-center justify-between">
              <span className="font-body-md text-body-md font-semibold text-on-surface">{c.name}</span>
              <Icon name="chevron_right" className="text-on-surface-variant opacity-50" />
            </div>
          ))}
        </div>
      )}
      {showForm && <ProductForm onClose={() => setShowForm(false)} />}
      {editing && <ProductForm initial={editing} onClose={() => setEditing(null)} />}
    </>
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
