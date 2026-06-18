import { useState } from "react";
import { PageHeader, Icon, ListSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useExpenses } from "@/hooks/use-expenses";
import { ExpenseForm } from "./expense-form";

const ICON_BY_CAT: Record<string, string> = {
  Sewa: "store", Gaji: "groups", Listrik: "bolt", Bahan: "inventory_2", Lainnya: "more_horiz",
};

export function ExpensesPage(): JSX.Element {
  const { data, isLoading, isError, error } = useExpenses();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<typeof list[number] | null>(null);
  const list = data ?? [];
  const total = list.reduce((s, e) => s + Number(e.amount), 0);
  const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Pengeluaran" rightIcon="calendar_today" />
      <div className="px-container-padding space-y-3">
        <div className="bg-primary-container text-on-primary rounded-xl p-4 shadow-card">
          <p className="font-label-caps text-label-caps text-primary-fixed uppercase">Total Pengeluaran — {month}</p>
          <p className="font-display-price-mobile text-display-price-mobile mt-1">{formatRupiah(total)}</p>
        </div>

        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && list.length === 0 && (
          <EmptyState icon="receipt_long" title="Belum ada pengeluaran" subtitle="Catat biaya operasional untuk hitung laba bersih." />
        )}
        <div className="space-y-2">
          {list.map((e) => {
            const catName = e.category?.name ?? "Lainnya";
            return (
              <div key={e.id} role="button" onClick={() => setEditing(e)} className="bg-surface-container-lowest p-3 rounded-xl shadow-card flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform">
                <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <Icon name={ICON_BY_CAT[catName] ?? "more_horiz"} className="text-on-surface-variant" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-body-md text-body-md font-semibold text-on-surface">{catName}</h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5 truncate">
                    {e.description} • {new Date(e.spentAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <span className="font-body-md text-body-md font-semibold text-error">-{formatRupiah(e.amount)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={() => setShowForm(true)} aria-label="Tambah pengeluaran"
        className="fixed bottom-28 right-4 z-40 bg-primary text-on-primary h-14 px-5 rounded-full flex items-center gap-2 shadow-card active:scale-95 transition-transform font-body-md text-body-md font-semibold" style={{ right: "calc(50% - 11rem)" }}>
        <Icon name="add" filled />Tambah
      </button>
      {showForm && <ExpenseForm onClose={() => setShowForm(false)} />}
      {editing && <ExpenseForm initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
