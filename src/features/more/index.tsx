import { Link } from "react-router-dom";
import { PageHeader, Icon } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
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
  const { role } = useAuth();
  const userLevel = ROLE_LEVEL[role ?? "cashier"];

  return (
    <>
      <PageHeader title="Lainnya" />
      <div className="px-container-padding space-y-6 pb-28">
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
      </div>
    </>
  );
}
