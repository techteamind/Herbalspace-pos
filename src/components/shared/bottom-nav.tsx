import { NavLink } from "react-router-dom";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/kasir", label: "Kasir", icon: "point_of_sale" },
  { to: "/produk", label: "Produk", icon: "inventory_2" },
  { to: "/laporan", label: "Laporan", icon: "analytics" },
  { to: "/lainnya", label: "Lainnya", icon: "menu" },
];

export function BottomNav(): JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface-container rounded-t-xl shadow-card px-gutter py-2 pb-safe">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-transform active:scale-95",
            isActive ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant",
          )}>
          {({ isActive }) => (
            <>
              <Icon name={t.icon} filled={isActive} />
              <span className="font-label-caps text-label-caps mt-1">{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
