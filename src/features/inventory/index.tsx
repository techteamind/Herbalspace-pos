import { useState } from "react";
import { PageHeader, Icon, ListSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useIngredients } from "@/hooks/use-ingredients";
import type { IngredientWithUnit } from "@/types";
import { IngredientForm } from "./ingredient-form";
import { StockAdjustForm } from "./stock-adjust-form";

type Status = "ok" | "low" | "out";
const FILTERS = ["Semua", "Stok Menipis", "Habis"];

function statusOf(it: IngredientWithUnit): Status {
  const stock = Number(it.currentStock), min = Number(it.minStock);
  if (stock <= 0) return "out";
  if (stock <= min) return "low";
  return "ok";
}

function StatusBadge({ status }: { status: Status }): JSX.Element {
  if (status === "ok") return <span className="bg-surface-container-low px-2 py-1 rounded text-primary font-label-caps text-label-caps flex items-center gap-1"><Icon name="check_circle" className="text-[14px]" />Aman</span>;
  if (status === "low") return <span className="bg-secondary-fixed px-2 py-1 rounded text-on-secondary-fixed-variant font-label-caps text-label-caps flex items-center gap-1 shadow-card"><Icon name="warning" className="text-[14px]" />Menipis</span>;
  return <span className="bg-error-container px-2 py-1 rounded text-on-error-container font-label-caps text-label-caps flex items-center gap-1 shadow-card"><Icon name="error" className="text-[14px]" />Habis</span>;
}

export function InventoryPage(): JSX.Element {
  const [filter, setFilter] = useState("Semua");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useIngredients();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IngredientWithUnit | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);

  const items = (data ?? []).filter((d) => {
    const s = statusOf(d);
    const statusMatch = filter === "Semua" ? true : filter === "Stok Menipis" ? s === "low" : s === "out";
    const searchMatch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <>
      <PageHeader title="Inventori" />
      <div className="px-container-padding py-2 flex gap-gutter">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-touch-target-min pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:border-primary font-body-md text-body-md" placeholder="Cari bahan baku..." />
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary text-on-primary h-touch-target-min px-4 rounded-xl flex items-center gap-1 font-body-md text-body-md font-semibold active:scale-95 transition-transform shadow-card shrink-0">
          <Icon name="add" filled className="text-[20px]" />Tambah
        </button>
      </div>
      <div className="px-container-padding flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-8 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${filter === f ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>{f}</button>
        ))}
      </div>

      <div className="px-container-padding py-2 space-y-3">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && items.length === 0 && (
          <EmptyState icon="science" title="Belum ada bahan baku" subtitle="Tambah bahan untuk mulai mengelola stok." />
        )}
        {items.map((it) => {
          const status = statusOf(it);
          const valueColor = status === "ok" ? "text-primary" : status === "low" ? "text-on-secondary-fixed-variant" : "text-error";
          const accent = status === "low" ? "bg-secondary-container" : status === "out" ? "bg-error" : "";
          return (
            <div key={it.id} role="button" onClick={() => setEditing(it)} className="bg-surface-container-lowest p-4 rounded-xl shadow-card relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform">
              {accent && <div className={`absolute top-0 left-0 w-1 h-full ${accent}`} />}
              <div className={`flex justify-between items-start mb-2 ${accent ? "pl-2" : ""}`}>
                <div>
                  <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{it.name}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Harga Terakhir: {formatRupiah(it.lastCost)} / {it.unit.code}</p>
                </div>
                <Icon name="chevron_right" className="text-on-surface-variant opacity-50" />
              </div>
              <div className={`flex justify-between items-end mt-4 ${accent ? "pl-2" : ""}`}>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Stok Saat Ini</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-h2 text-h2 ${valueColor}`}>{Number(it.currentStock).toLocaleString("id-ID")}</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{it.unit.code}</span>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setShowAdjust(true)} aria-label="Penyesuaian Stok"
        className="fixed bottom-28 right-4 z-40 bg-secondary-container text-on-secondary-container h-12 px-4 rounded-full flex items-center gap-2 shadow-card active:scale-95 transition-transform font-body-md text-body-md font-semibold" style={{ right: "calc(50% - 11rem)" }}>
        <Icon name="tune" filled />Penyesuaian
      </button>
      {showForm && <IngredientForm onClose={() => setShowForm(false)} />}
      {editing && <IngredientForm initial={editing} onClose={() => setEditing(null)} />}
      {showAdjust && <StockAdjustForm onClose={() => setShowAdjust(false)} />}
    </>
  );
}
