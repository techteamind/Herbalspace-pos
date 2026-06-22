import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PageHeader, Icon, ListSkeleton, EmptyState, ErrorState, SwipeableRow } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useTransactions } from "@/hooks/use-transactions";
import { useOutlets } from "@/hooks/use-outlets";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionDetail } from "./detail";
import type { TransactionWithItems } from "@/types";

const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" };
const STATUS_LABEL: Record<string, string> = { paid: "Lunas", pending: "Pending", void: "Void" };

export function TransactionsPage(): JSX.Element {
  const { outletId } = useAuth();
  const { data: outlets } = useOutlets();
  const [filterOutletId, setFilterOutletId] = useState<string | undefined>(undefined);
  const effectiveOutletId = filterOutletId ?? outletId ?? undefined;
  const { data, isLoading, isError, error } = useTransactions({ limit: 100, outletId: effectiveOutletId });
  const [selected, setSelected] = useState<TransactionWithItems | null>(null);
  const list = data ?? [];
  const hasMultipleOutlets = (outlets ?? []).length > 1;

  const grouped = groupByDate(list);

  return (
    <>
      <PageHeader title="Riwayat Transaksi" leftIcon="arrow_back" onLeft={() => history.back()} />
      {hasMultipleOutlets && (
        <div className="px-container-padding pt-2 pb-1 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {(outlets ?? []).map((o) => (
            <button key={o.id} onClick={() => setFilterOutletId(o.id)}
              className={`h-8 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${effectiveOutletId === o.id ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
              {o.name}
            </button>
          ))}
        </div>
      )}
      <div className="px-container-padding space-y-4 pb-24">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && list.length === 0 && (
          <EmptyState icon="receipt_long" title="Belum ada transaksi" subtitle="Transaksi yang sudah diproses akan muncul di sini." />
        )}
        {grouped.map(([date, txns]) => (
          <div key={date}>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2">{date}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {txns.map((t) => {
                const method = t.payments[0]?.method ?? "cash";
                return (
                  <SwipeableRow key={t.id} onEdit={() => setSelected(t)}>
                  <button onClick={() => setSelected(t)}
                    className="w-full bg-surface-container-lowest p-3 rounded-xl shadow-elevation-1 flex items-center gap-3 text-left active:scale-[0.99] transition-transform">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.status === "void" ? "bg-error-container" : "bg-primary-container"}`}>
                      <Icon name={t.status === "void" ? "block" : "receipt_long"} className={t.status === "void" ? "text-on-error-container" : "text-on-primary"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface">{t.number}</h3>
                        <span className={`font-body-md text-body-md font-bold ${t.status === "void" ? "text-error line-through" : "text-primary"}`}>
                          {formatRupiah(t.total)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="font-label-caps text-label-caps text-on-surface-variant">
                          {new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {METHOD_LABEL[method] ?? method} · {t.items.length} item
                        </span>
                        <span className={`font-label-caps text-label-caps px-1.5 py-0.5 rounded ${t.status === "paid" ? "bg-primary-container/50 text-primary" : t.status === "void" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}`}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </div>
                    </div>
                  </button>
                  </SwipeableRow>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {selected && <TransactionDetail txn={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}

function groupByDate(list: TransactionWithItems[]): [string, TransactionWithItems[]][] {
  const map = new Map<string, TransactionWithItems[]>();
  for (const t of list) {
    const key = new Date(t.createdAt).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()];
}
