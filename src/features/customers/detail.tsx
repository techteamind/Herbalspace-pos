import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, ListSkeleton, EmptyState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useCustomer } from "@/hooks/use-customers";
import { CustomerForm } from "./customer-form";

export function CustomerDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { data, isLoading } = useCustomer(id);
  const [editing, setEditing] = useState(false);

  const paid = (data?.transactions ?? []).filter((t) => t.status === "paid");

  return (
    <>
      <PageHeader title="Detail Pelanggan" leftIcon="arrow_back" onLeft={() => navigate(-1)}
        rightIcon="edit" onRight={() => data && setEditing(true)} />

      {isLoading && <div className="px-container-padding"><ListSkeleton rows={3} /></div>}

      {data && (
        <div className="px-container-padding space-y-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-h2 text-h2 font-semibold shrink-0">{data.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0">
              <h2 className="font-h2 text-h2 text-on-surface truncate">{data.name}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">{data.phone ?? "Tanpa nomor"}</p>
              {data.email && <p className="font-label-caps text-label-caps text-on-surface-variant">{data.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary-container text-on-primary rounded-xl p-3 shadow-card">
              <p className="font-label-caps text-label-caps text-primary-fixed uppercase">Belanja</p>
              <p className="font-body-md text-body-md font-bold mt-1">{formatRupiah(data.totalSpend)}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-3 shadow-card border border-outline-variant/40">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Transaksi</p>
              <p className="font-body-md text-body-md font-bold text-on-surface mt-1">{paid.length}</p>
            </div>
            <div className="bg-secondary-container rounded-xl p-3 shadow-card">
              <p className="font-label-caps text-label-caps text-on-secondary-container uppercase">Poin</p>
              <p className="font-body-md text-body-md font-bold text-on-secondary-container mt-1">{data.points ?? 0}</p>
            </div>
          </div>

          {data.note && (
            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Catatan</p>
              <p className="font-body-md text-body-md text-on-surface">{data.note}</p>
            </div>
          )}

          <div>
            <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-2">Riwayat Transaksi</h3>
            {paid.length === 0 ? (
              <EmptyState icon="receipt_long" title="Belum ada transaksi" subtitle="Transaksi pelanggan ini akan muncul di sini." />
            ) : (
              <div className="space-y-2">
                {paid.map((t) => (
                  <div key={t.id} className="bg-surface-container-lowest rounded-xl shadow-card p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-body-md text-body-md font-semibold text-on-surface">{t.number}</p>
                      <p className="font-label-caps text-label-caps text-on-surface-variant">
                        {new Date(t.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} • {t.items.length} item
                      </p>
                    </div>
                    <span className="font-body-md text-body-md font-semibold text-primary">{formatRupiah(t.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editing && data && (
        <CustomerForm initial={data} onClose={() => setEditing(false)} onDeleted={() => navigate("/pelanggan", { replace: true })} />
      )}
    </>
  );
}
