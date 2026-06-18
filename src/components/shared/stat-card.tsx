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
      "rounded-xl p-4 shadow-card",
      primary ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest border border-outline-variant/40",
    )}>
      <div className={cn("flex items-center gap-1 mb-2", primary ? "text-primary-fixed" : "text-on-surface-variant")}>
        <Icon name={icon} className="text-[18px]" filled={primary} />
        <span className="font-label-caps text-label-caps">{label}</span>
      </div>
      <p className={cn(primary ? "font-display-price-mobile text-display-price-mobile" : "font-h1 text-h1", !primary && "text-on-surface")}>{value}</p>
      {sub && <p className={cn("font-label-caps text-label-caps mt-1", primary ? "text-primary-fixed-dim" : "text-on-surface-variant")}>{sub}</p>}
    </div>
  );
}
