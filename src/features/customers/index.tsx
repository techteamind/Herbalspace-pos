import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Icon, ListSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { useCustomers } from "@/hooks/use-customers";
import { CustomerForm } from "./customer-form";

export function CustomersPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useCustomers(search || undefined);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Pelanggan" />
      <div className="px-container-padding py-2 flex gap-gutter">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-touch-target-min pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:border-primary font-body-md text-body-md" placeholder="Cari pelanggan..." />
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary text-on-primary h-touch-target-min px-4 rounded-xl flex items-center gap-1 font-body-md text-body-md font-semibold active:scale-95 transition-transform shadow-card shrink-0">
          <Icon name="add" filled className="text-[20px]" />Tambah
        </button>
      </div>
      <div className="px-container-padding space-y-2">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && (data ?? []).length === 0 && (
          <EmptyState icon="group" title="Belum ada pelanggan" subtitle="Tambah pelanggan untuk melacak riwayat transaksi." />
        )}
        {(data ?? []).map((c) => (
          <div key={c.id} role="button" onClick={() => navigate(`/pelanggan/${c.id}`)} className="bg-surface-container-lowest p-3 rounded-xl shadow-elevation-1 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform">
            <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-body-lg text-body-lg font-semibold shrink-0">{c.name.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-body-md text-body-md font-semibold text-on-surface truncate">{c.name}</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">{c.phone ?? "Tanpa nomor"}</p>
            </div>
            <Icon name="chevron_right" className="text-on-surface-variant opacity-50" />
          </div>
        ))}
      </div>
      {showForm && <CustomerForm onClose={() => setShowForm(false)} />}
    </>
  );
}
