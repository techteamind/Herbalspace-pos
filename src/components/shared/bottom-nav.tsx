import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/kasir", label: "Kasir", icon: "point_of_sale" },
  { to: "/produk", label: "Produk", icon: "inventory_2" },
  { to: "/laporan", label: "Laporan", icon: "analytics" },
  { to: "/lainnya", label: "Lainnya", icon: "menu" },
];

export function BottomNav(): JSX.Element {
  const { pathname } = useLocation();
  const activeIdx = tabs.findIndex((t) => pathname.startsWith(t.to));

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl z-50">
      <div className="mx-3 mb-2 flex justify-around items-center backdrop-blur-xl bg-surface-container-lowest/80 rounded-2xl shadow-elevation-3 px-1 py-1 pb-safe border border-outline-variant/20">
        {tabs.map((t, i) => {
          const isActive = i === activeIdx;
          return (
            <NavLink key={t.to} to={t.to} onClick={() => !isActive && haptic(5)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl px-3 py-1.5 relative transition-all",
                isActive ? "text-primary" : "text-on-surface-variant active:scale-90",
              )}>
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary-container/60 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">
                <Icon name={t.icon} filled={isActive} className="text-[22px]" />
              </span>
              <span className={cn(
                "relative z-10 text-[10px] font-medium mt-0.5 tracking-wide",
                isActive && "font-semibold",
              )}>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
