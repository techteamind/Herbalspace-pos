import { PageHeader, StatCard, Icon } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useDashboardStats, useTopProducts, useLowStock } from "@/hooks/use-dashboard";

function pctChange(today: number, yesterday: number): string {
  if (!yesterday) return today > 0 ? "+100%" : "—";
  const d = Math.round(((today - yesterday) / yesterday) * 100);
  return `${d >= 0 ? "+" : ""}${d}% dari kemarin`;
}

export function DashboardPage(): JSX.Element {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: top } = useTopProducts();
  const { data: low } = useLowStock();

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Herbaspace" rightIcon="notifications" />
      <div className="px-container-padding space-y-4">
        <div className="pt-1">
          <p className="font-body-md text-body-md text-on-surface-variant">{today}</p>
          <h2 className="font-h1 text-h1 text-on-surface">Halo, Kasir 👋</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-container-low rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard variant="primary" label="OMZET HARI INI" icon="payments"
              value={formatRupiah(stats?.todayRevenue ?? 0)}
              sub={pctChange(stats?.todayRevenue ?? 0, stats?.yesterdayRevenue ?? 0)} />
            <StatCard label="TRANSAKSI" icon="receipt_long" value={String(stats?.todayTransactions ?? 0)} sub="struk hari ini" />
            <StatCard label="RATA2 / TRX" icon="trending_up" value={formatRupiah(stats?.avgPerTransaction ?? 0)} sub="per transaksi" />
            <StatCard label="PRODUK TERJUAL" icon="local_cafe" value={String(stats?.todayProductsSold ?? 0)} sub="item" />
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40">
          <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-3">Produk Terlaris Hari Ini</h3>
          {(top ?? []).length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Belum ada penjualan hari ini.</p>
          ) : (
            <div className="space-y-3">
              {(top ?? []).slice(0, 5).map((b, i) => (
                <div key={b.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-label-caps text-label-caps ${i === 0 ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>{i + 1}</span>
                    <span className="font-body-md text-body-md text-on-surface">{b.productName}</span>
                  </div>
                  <span className="font-body-md text-body-md font-semibold text-on-surface-variant">{b.totalSold}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(low ?? []).length > 0 && (
          <div className="bg-error-container/40 border border-error/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-on-error-container">
              <Icon name="warning" className="text-[20px]" />
              <h3 className="font-body-lg text-body-lg font-semibold">Stok Menipis</h3>
            </div>
            <div className="space-y-2">
              {(low ?? []).map((s) => {
                const out = Number(s.currentStock) <= 0;
                return (
                  <div key={s.id} className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface">{s.name}</span>
                    <span className={`font-label-caps text-label-caps px-2 py-1 rounded ${out ? "bg-error-container text-on-error-container" : "bg-secondary-fixed text-on-secondary-fixed-variant"}`}>
                      {out ? "Habis" : `${Number(s.currentStock).toLocaleString("id-ID")} ${s.unitCode}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
