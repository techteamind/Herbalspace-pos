import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/kasir", label: "Kasir", icon: "point_of_sale" },
  { to: "/produk", label: "Produk", icon: "inventory_2" },
  { to: "/laporan", label: "Laporan", icon: "analytics" },
  { to: "/lainnya", label: "Lainnya", icon: "menu" },
];

export function AppLayout(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface-container rounded-t-lg shadow-card px-gutter py-2 pb-safe md:hidden">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center rounded-lg px-3 py-1 transition-transform active:scale-95",
                isActive
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant",
              )
            }
          >
            <span className="material-symbols-outlined">{t.icon}</span>
            <span className="text-[12px] font-semibold mt-1">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
