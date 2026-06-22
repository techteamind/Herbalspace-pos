import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, Icon } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useOutlets } from "@/hooks/use-outlets";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/auth";

interface MenuItem { to: string; icon: string; label: string; minRole?: UserRole }
interface MenuSection { title: string; icon: string; items: MenuItem[] }

const SECTIONS: MenuSection[] = [
  {
    title: "Penjualan", icon: "point_of_sale",
    items: [
      { to: "/shift", icon: "schedule", label: "Shift Kasir" },
      { to: "/riwayat-transaksi", icon: "history", label: "Riwayat Transaksi" },
      { to: "/pelanggan", icon: "group", label: "Pelanggan" },
      { to: "/promo", icon: "local_offer", label: "Promo & Diskon", minRole: "manager" },
    ],
  },
  {
    title: "Inventori", icon: "inventory_2",
    items: [
      { to: "/produk", icon: "inventory_2", label: "Produk & Kategori" },
      { to: "/modifier", icon: "add_circle", label: "Add-ons / Modifier", minRole: "manager" },
      { to: "/inventori", icon: "science", label: "Bahan Baku" },
      { to: "/stock-movement", icon: "swap_vert", label: "Pergerakan Stok" },
    ],
  },
  {
    title: "Keuangan", icon: "account_balance",
    items: [
      { to: "/pengeluaran", icon: "receipt_long", label: "Pengeluaran", minRole: "manager" },
      { to: "/laporan", icon: "analytics", label: "Laporan" },
    ],
  },
  {
    title: "Manajemen", icon: "admin_panel_settings",
    items: [
      { to: "/karyawan", icon: "badge", label: "Karyawan", minRole: "owner" },
      { to: "/outlet", icon: "store", label: "Multi-Outlet", minRole: "owner" },
      { to: "/audit-log", icon: "history_edu", label: "Audit Log", minRole: "owner" },
      { to: "/pengaturan", icon: "settings", label: "Pengaturan", minRole: "manager" },
    ],
  },
];

const ROLE_LEVEL: Record<UserRole, number> = { cashier: 0, manager: 1, owner: 2 };

export function MorePage(): JSX.Element {
  const { role, outletId, setOutletId, profileName, user } = useAuth();
  const { data: outlets } = useOutlets();
  const activeOutlet = (outlets ?? []).find((o) => o.id === outletId);
  const userLevel = ROLE_LEVEL[role ?? "cashier"];
  const canSwitch = role === "owner";
  const qc = useQueryClient();
  const [showOutletSwitch, setShowOutletSwitch] = useState(false);

  return (
    <>
      <PageHeader title="Lainnya" />
      <div className="px-container-padding space-y-6 pb-28">
        {/* User info card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center shrink-0">
            <Icon name="person" className="text-on-primary-container text-[22px]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-on-surface truncate">{profileName ?? "User"}</p>
            <p className="text-[12px] text-on-surface-variant truncate">{user?.email ?? ""}</p>
          </div>
          {canSwitch && (
            <button onClick={() => setShowOutletSwitch(true)}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-primary-container text-primary text-[12px] font-semibold active:scale-95 transition-transform shrink-0">
              <Icon name="store" className="text-[14px]" />
              <span className="max-w-[80px] truncate">{activeOutlet?.name ?? "Semua"}</span>
              <Icon name="swap_horiz" className="text-[14px]" />
            </button>
          )}
        </div>

        {SECTIONS.map((section) => {
          const items = section.items.filter((m) => !m.minRole || userLevel >= ROLE_LEVEL[m.minRole]);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name={section.icon} className="text-[16px] text-on-surface-variant" />
                <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{section.title}</h3>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden divide-y divide-outline-variant/20">
                {items.map((m) => (
                  <Link key={m.to} to={m.to} className="flex items-center gap-3 px-4 h-13 active:bg-surface-container-low transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-primary-container/50 flex items-center justify-center shrink-0">
                      <Icon name={m.icon} className="text-[18px] text-primary" />
                    </div>
                    <span className="flex-1 text-[13px] text-on-surface">{m.label}</span>
                    <Icon name="chevron_right" className="text-on-surface-variant/30 text-[20px]" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* Logout button */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Icon name="logout" />Keluar
        </button>
      </div>

      {/* Outlet switcher bottom sheet */}
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
    </>
  );
}
