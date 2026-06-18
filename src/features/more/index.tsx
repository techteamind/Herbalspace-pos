import { Link } from "react-router-dom";
import { PageHeader, Icon } from "@/components/shared";

const MENU = [
  { to: "/produk", icon: "inventory_2", label: "Produk & Kategori" },
  { to: "/inventori", icon: "science", label: "Inventori Bahan Baku" },
  { to: "/stock-movement", icon: "swap_vert", label: "Pergerakan Stok" },
  { to: "/pelanggan", icon: "group", label: "Pelanggan" },
  { to: "/pengeluaran", icon: "receipt_long", label: "Pengeluaran Operasional" },
  { to: "/laporan", icon: "analytics", label: "Laporan" },
  { to: "/pengaturan", icon: "settings", label: "Pengaturan" },
];

export function MorePage(): JSX.Element {
  return (
    <>
      <PageHeader title="Lainnya" />
      <div className="px-container-padding">
        <div className="bg-surface-container-lowest rounded-xl shadow-card divide-y divide-outline-variant/30">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to} className="flex items-center gap-3 px-4 h-14 active:bg-surface-container-low">
              <Icon name={m.icon} className="text-primary" />
              <span className="flex-1 font-body-md text-body-md text-on-surface">{m.label}</span>
              <Icon name="chevron_right" className="text-on-surface-variant opacity-50" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
