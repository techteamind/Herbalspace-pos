import { Icon } from "./icon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  sub?: string;
  variant?: "default" | "primary";
}

export function StatCard({ label, value, icon, sub, variant = "default" }: StatCardProps): JSX.Element {
  const primary = variant === "primary";
  return (
    <div className={cn(
      "rounded-2xl transition-shadow",
      primary
        ? "bg-gradient-to-br from-primary to-primary-container p-4 shadow-elevation-2"
        : "bg-surface-container-lowest p-3 shadow-card",
    )}>
      <div className={cn("flex items-center gap-1.5 mb-1", primary ? "text-on-primary/70" : "text-on-surface-variant")}>
        <Icon name={icon} className={primary ? "text-[18px]" : "text-[16px]"} filled={primary} />
        <span className="font-label-caps text-label-caps">{label}</span>
      </div>
      <p className={cn(
        "truncate",
        primary ? "font-display-price-mobile text-display-price-mobile text-on-primary" : "text-[16px] leading-5 font-bold text-on-surface",
      )}>{value}</p>
      {sub && <p className={cn("font-label-caps text-label-caps mt-1 truncate", primary ? "text-on-primary/60" : "text-on-surface-variant")}>{sub}</p>}
    </div>
  );
}
