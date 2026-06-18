import { useState } from "react";
import { PageHeader, ListSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { useStockMovements, type StockMovementRow } from "@/hooks/use-stock-movements";

const FILTERS: { label: string; type?: string }[] = [
  { label: "Semua" }, { label: "Penjualan", type: "sale" },
  { label: "Penerimaan", type: "purchase" }, { label: "Penyesuaian", type: "adjustment" },
];
const TYPE_LABEL: Record<string, string> = { sale: "PENJUALAN", purchase: "PENERIMAAN", adjustment: "PENYESUAIAN", waste: "KERUSAKAN", return: "RETUR" };

function kind(t: string): "in" | "out" | "adj" {
  if (t === "purchase" || t === "return") return "in";
  if (t === "sale" || t === "waste") return "out";
  return "adj";
}

export function StockMovementsPage(): JSX.Element {
  const [active, setActive] = useState("Semua");
  const type = FILTERS.find((f) => f.label === active)?.type;
  const { data, isLoading, isError, error } = useStockMovements(type);

  const dot = (k: string) => k === "out" ? "bg-error" : k === "in" ? "bg-primary-container" : "bg-secondary-container";
  const badge = (k: string) => k === "out" ? "bg-error-container text-on-error-container" : k === "in" ? "bg-primary-fixed text-primary" : "bg-secondary-fixed text-on-secondary-fixed-variant";
  const qtyColor = (k: string) => k === "out" ? "text-error" : k === "in" ? "text-primary" : "text-on-secondary-fixed-variant";
  const fmt = (m: StockMovementRow) => {
    const n = Number(m.qtyChange);
    return `${n > 0 ? "+" : ""}${n.toLocaleString("id-ID")} ${m.unitCode}`;
  };

  return (
    <>
      <PageHeader title="Pergerakan Stok" rightIcon="search" />
      <div className="px-container-padding py-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button key={f.label} onClick={() => setActive(f.label)}
              className={`h-8 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${active === f.label ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="px-container-padding space-y-2">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && (data ?? []).length === 0 && (
          <EmptyState icon="swap_vert" title="Belum ada pergerakan" subtitle="Pergerakan stok akan muncul setelah ada transaksi atau penerimaan." />
        )}
        {(data ?? []).map((m) => {
          const k = kind(m.type);
          return (
            <div key={m.id} className="bg-surface-container-lowest rounded-xl shadow-card p-4 flex gap-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dot(k)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate">{m.ingredientName}</h4>
                  <span className={`font-body-md text-body-md font-bold whitespace-nowrap ${qtyColor(k)}`}>{fmt(m)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`font-label-caps text-label-caps px-2 py-0.5 rounded ${badge(k)}`}>{TYPE_LABEL[m.type]}</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    {new Date(m.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant ml-auto">Sisa: {Number(m.balanceAfter).toLocaleString("id-ID")}</span>
                </div>
                {m.note && <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">{m.note}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
