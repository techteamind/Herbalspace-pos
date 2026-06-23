import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, StatCard, Icon, PullRefreshIndicator } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useDashboardStats, useTopProducts, useLowStock, useWeeklyRevenue } from "@/hooks/use-dashboard";
import { useOutlets } from "@/hooks/use-outlets";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { apiFetch } from "@/lib/api-client";
import type { LowStockItem } from "@/types";

function pctChange(today: number, yesterday: number): string {
  if (!yesterday) return today > 0 ? "+100%" : "—";
  const d = Math.round(((today - yesterday) / yesterday) * 100);
  return `${d >= 0 ? "+" : ""}${d}% dari kemarin`;
}

export function DashboardPage(): JSX.Element {
  const { profileName: authName, role, outletId, setOutletId } = useAuth();
  const { data: outlets } = useOutlets();
  const activeOutlet = (outlets ?? []).find((o) => o.id === outletId);
  const canSwitch = role === "owner";
  const qc = useQueryClient();

  useEffect(() => {
    qc.prefetchQuery({ queryKey: ["products"], queryFn: () => apiFetch("products"), staleTime: 60_000 });
    qc.prefetchQuery({ queryKey: ["categories"], queryFn: () => apiFetch("categories"), staleTime: 60_000 });
  }, [qc]);
  const [showOutletSwitch, setShowOutletSwitch] = useState(false);
  const { data: stats, isLoading, refetch: refetchStats } = useDashboardStats();
  const { data: top, refetch: refetchTop } = useTopProducts();
  const { data: low, refetch: refetchLow } = useLowStock();
  const { data: weekly, refetch: refetchWeekly } = useWeeklyRevenue();
  const [showNotif, setShowNotif] = useState(false);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStats(), refetchTop(), refetchLow(), refetchWeekly()]);
  }, [refetchStats, refetchTop, refetchLow, refetchWeekly]);
  const { pullDistance, refreshing, handlers } = usePullRefresh(handleRefresh);

  const lowCount = (low ?? []).length;

  const lastNotifiedCount = useRef(-1);
  useEffect(() => {
    if (lowCount === lastNotifiedCount.current) return;
    lastNotifiedCount.current = lowCount;
    if (lowCount > 0 && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (lowCount > 0 && "Notification" in window && Notification.permission === "granted") {
      const outOfStock = (low ?? []).filter((i) => Number(i.currentStock) <= 0);
      const lowItems = (low ?? []).filter((i) => Number(i.currentStock) > 0);
      if (outOfStock.length > 0) {
        new Notification("⚠️ Stok Habis!", {
          body: `${outOfStock.map((i) => i.name).join(", ")} sudah habis.`,
          icon: "/leaf.svg",
          tag: "out-of-stock",
        });
      }
      if (lowItems.length > 0) {
        new Notification("Stok Menipis", {
          body: `${lowItems.length} bahan baku di bawah minimum: ${lowItems.slice(0, 3).map((i) => i.name).join(", ")}${lowItems.length > 3 ? ` +${lowItems.length - 3} lainnya` : ""}`,
          icon: "/leaf.svg",
          tag: "low-stock",
        });
      }
    }
  }, [lowCount, low]);
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div {...handlers}>
      <PageHeader title={activeOutlet?.name ?? "Herbaspace"} rightIcon={lowCount > 0 ? "notifications_active" : "notifications"} onRight={() => setShowNotif(true)} rightBadge={lowCount > 0 ? lowCount : undefined} />
      <PullRefreshIndicator distance={pullDistance} refreshing={refreshing} />
      <div className="px-container-padding space-y-5 pb-28">
        <div className="pt-1">
          {canSwitch && (
            <button onClick={() => setShowOutletSwitch(true)}
              className="flex items-center gap-1.5 mb-1.5 text-primary font-medium text-[13px] active:scale-95 transition-transform">
              <Icon name="store" className="text-[16px]" />
              <span>{activeOutlet?.name ?? "Semua Outlet"}</span>
              <Icon name="swap_horiz" className="text-[14px] text-on-surface-variant" />
            </button>
          )}
          <p className="text-[13px] text-on-surface-variant">{today}</p>
          <h2 className="text-[24px] font-bold text-on-surface tracking-tight leading-tight mt-0.5">Halo, {authName ?? stats?.profileName ?? "Kasir"} 👋</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-28 bg-surface-container-low rounded-2xl animate-pulse shimmer" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-surface-container-low rounded-2xl animate-pulse shimmer" style={{ animationDelay: `${i * 100}ms` }} />)}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <StatCard variant="primary" label="OMZET HARI INI" icon="payments"
              value={formatRupiah(stats?.todayRevenue ?? 0)}
              sub={pctChange(stats?.todayRevenue ?? 0, stats?.yesterdayRevenue ?? 0)} />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="TRANSAKSI" icon="receipt_long" value={String(stats?.todayTransactions ?? 0)} sub="struk hari ini" />
              <StatCard label="RATA2" icon="trending_up" value={`Rp ${formatCompact(stats?.avgPerTransaction ?? 0)}`} sub="/transaksi" />
              <StatCard label="TERJUAL" icon="local_cafe" value={String(stats?.todayProductsSold ?? 0)} sub="item" />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
        {weekly && weekly.length > 0 && <WeeklyChart data={weekly} />}

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card">
          <h3 className="text-[15px] font-semibold text-on-surface mb-3">Produk Terlaris Hari Ini</h3>
          {(top ?? []).length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">Belum ada penjualan hari ini.</p>
          ) : (
            <div className="space-y-3">
              {(top ?? []).slice(0, 5).map((b, i) => (
                <div key={b.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${i === 0 ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>{i + 1}</span>
                    <span className="text-[13px] text-on-surface">{b.productName}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-on-surface-variant">{b.totalSold}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {(low ?? []).length > 0 && (
          <div className="bg-error-container/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3 text-on-error-container">
              <Icon name="warning" className="text-[20px]" />
              <h3 className="text-[15px] font-semibold">Stok Menipis</h3>
            </div>
            <div className="space-y-2">
              {(low ?? []).map((s) => {
                const out = Number(s.currentStock) <= 0;
                return (
                  <div key={s.id} className="flex justify-between items-center">
                    <span className="text-[13px] text-on-surface">{s.name}</span>
                    <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg ${out ? "bg-error text-on-error" : "bg-secondary-container text-on-secondary-container"}`}>
                      {out ? "Habis" : `${Number(s.currentStock).toLocaleString("id-ID")} ${s.unitCode}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showNotif && <NotificationPanel items={low ?? []} onClose={() => setShowNotif(false)} />}
      {showOutletSwitch && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={() => setShowOutletSwitch(false)}>
          <div className="w-full max-w-3xl bg-surface-container-lowest rounded-t-3xl p-5 pb-safe space-y-3 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-1 rounded-full bg-outline-variant/50" />
              <div className="flex justify-between items-center w-full">
                <h2 className="text-[17px] font-semibold text-on-surface">Ganti Outlet</h2>
                <button onClick={() => setShowOutletSwitch(false)} className="text-on-surface-variant p-1"><Icon name="close" /></button>
              </div>
            </div>
            <button onClick={() => { setOutletId("__all__"); setShowOutletSwitch(false); qc.invalidateQueries(); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform ${!outletId ? "bg-primary-container" : "bg-surface-container-low"}`}>
              <Icon name="store" className={!outletId ? "text-on-primary-container" : "text-on-surface-variant"} />
              <div className="flex-1">
                <h3 className={`text-[14px] font-semibold ${!outletId ? "text-on-primary-container" : "text-on-surface"}`}>Semua Outlet</h3>
              </div>
              {!outletId && <Icon name="check_circle" filled className="text-primary" />}
            </button>
            {(outlets ?? []).filter((o) => o.isActive).map((o) => (
              <button key={o.id} onClick={() => { setOutletId(o.id); setShowOutletSwitch(false); qc.invalidateQueries(); }}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform ${o.id === outletId ? "bg-primary-container" : "bg-surface-container-low"}`}>
                <Icon name="store" className={o.id === outletId ? "text-on-primary-container" : "text-on-surface-variant"} />
                <div className="flex-1">
                  <h3 className={`text-[14px] font-semibold ${o.id === outletId ? "text-on-primary-container" : "text-on-surface"}`}>{o.name}</h3>
                  {o.address && <p className="text-[11px] text-on-surface-variant mt-0.5">{o.address}</p>}
                </div>
                {o.id === outletId && <Icon name="check_circle" filled className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyChart({ data }: { data: { date: string; revenue: number; trxCount: number }[] }): JSX.Element {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const totalWeek = data.reduce((s, d) => s + d.revenue, 0);
  const avgWeek = data.length > 0 ? Math.round(totalWeek / data.length) : 0;
  const avgPct = max > 0 ? (avgWeek / max) * 100 : 0;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-[15px] font-semibold text-on-surface">Omzet 7 Hari</h3>
        <span className="text-[13px] font-bold text-primary">{formatRupiah(totalWeek)}</span>
      </div>
      <p className="text-[11px] font-medium text-on-surface-variant mb-3">Rata-rata {formatRupiah(avgWeek)}/hari</p>
      <div className="relative flex items-end gap-2 h-32">
        <div className="absolute left-0 right-0 border-t border-dashed border-outline-variant/40" style={{ bottom: `${avgPct}%` }} />
        {data.map((d, i) => {
          const pct = max > 0 ? (d.revenue / max) * 100 : 0;
          const isToday = i === data.length - 1;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 relative">
              <span className="text-[9px] font-medium text-on-surface-variant leading-none h-3">
                {d.revenue > 0 ? formatCompact(d.revenue) : ""}
              </span>
              <div className="w-full flex-1 flex items-end px-0.5">
                <div
                  className={`w-full transition-all ${isToday ? "bg-primary rounded-lg shadow-elevation-1" : "bg-primary/15 rounded-md"}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span className={`text-[9px] font-medium leading-none ${isToday ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                {d.date.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

function NotificationPanel({ items, onClose }: { items: LowStockItem[]; onClose: () => void }): JSX.Element {
  const outOfStock = items.filter((i) => Number(i.currentStock) <= 0);
  const lowStock = items.filter((i) => Number(i.currentStock) > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-t-3xl p-5 pb-safe space-y-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-1 rounded-full bg-outline-variant/50" />
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Icon name="notifications" className="text-primary" />
              <h2 className="text-[17px] font-semibold text-on-surface">Notifikasi</h2>
            </div>
            <button onClick={onClose} className="text-on-surface-variant p-1"><Icon name="close" /></button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="check_circle" className="text-[48px] text-primary mb-2" />
            <p className="text-[13px] text-on-surface-variant">Semua stok aman!</p>
          </div>
        ) : (
          <>
            {outOfStock.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-error uppercase tracking-wider flex items-center gap-1">
                  <Icon name="error" className="text-[16px]" /> Stok Habis ({outOfStock.length})
                </p>
                {outOfStock.map((s) => (
                  <div key={s.id} className="flex justify-between items-center bg-error-container/20 rounded-xl px-3 py-2.5">
                    <span className="text-[13px] text-on-surface font-semibold">{s.name}</span>
                    <span className="text-[10px] font-bold bg-error text-on-error px-2 py-0.5 rounded-full">HABIS</span>
                  </div>
                ))}
              </div>
            )}
            {lowStock.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <Icon name="warning" className="text-[16px] text-warning" /> Stok Menipis ({lowStock.length})
                </p>
                {lowStock.map((s) => (
                  <div key={s.id} className="flex justify-between items-center bg-surface-container-low rounded-xl px-3 py-2.5">
                    <div>
                      <span className="text-[13px] text-on-surface">{s.name}</span>
                      <p className="text-[10.5px] font-medium text-on-surface-variant">Min: {Number(s.minStock).toLocaleString("id-ID")} {s.unitCode}</p>
                    </div>
                    <span className="text-[13px] font-bold text-warning">{Number(s.currentStock).toLocaleString("id-ID")} {s.unitCode}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
