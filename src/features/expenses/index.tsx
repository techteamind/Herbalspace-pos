import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PageHeader, Icon, ListSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useExpenses } from "@/hooks/use-expenses";
import { ExpenseForm } from "./expense-form";

const ICON_BY_CAT: Record<string, string> = {
  Sewa: "home_work", Gaji: "payments", Listrik: "bolt", Bahan: "inventory_2",
  Air: "water_drop", Internet: "wifi", Transportasi: "local_shipping",
  Perlengkapan: "handyman", Marketing: "campaign", Pajak: "account_balance",
  Kebersihan: "cleaning_services", Lainnya: "more_horiz",
};
const COLOR_BY_CAT: Record<string, string> = {
  Sewa: "bg-primary-container/60", Gaji: "bg-secondary-container/60", Listrik: "bg-secondary-fixed/40",
  Bahan: "bg-primary-container/40", Air: "bg-primary-fixed/30", Internet: "bg-tertiary-container/40",
  Transportasi: "bg-secondary-fixed/30", Perlengkapan: "bg-surface-container",
  Marketing: "bg-tertiary-container/30", Pajak: "bg-error-container/40",
  Kebersihan: "bg-primary-fixed/20", Lainnya: "bg-surface-container",
};

export function ExpensesPage(): JSX.Element {
  const { data, isLoading, isError, error } = useExpenses();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<typeof list[number] | null>(null);
  const now = new Date();
  const list = (data ?? []).filter((e) => {
    const d = new Date(e.spentAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const total = list.reduce((s, e) => s + Number(e.amount), 0);
  const month = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Pengeluaran" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {list.map((e) => {
            const catName = e.category?.name ?? "Lainnya";
            return (
              <div key={e.id} role="button" onClick={() => setEditing(e)} className="bg-surface-container-lowest p-3 rounded-xl shadow-elevation-1 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${COLOR_BY_CAT[catName] ?? "bg-surface-container"}`}>
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
        className="fixed bottom-20 right-4 z-40 bg-primary text-on-primary h-12 px-4 rounded-full flex items-center gap-1.5 shadow-elevation-2 active:scale-95 transition-transform font-body-md text-body-md font-semibold" style={{ right: "calc(50% - 10rem)" }}>
        <Icon name="add" filled />Tambah
      </button>
      <AnimatePresence>
        {showForm && <ExpenseForm onClose={() => setShowForm(false)} />}
        {editing && <ExpenseForm initial={editing} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </>
  );
}
