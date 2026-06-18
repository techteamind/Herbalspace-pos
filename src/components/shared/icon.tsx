import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
}

/** Material Symbols Outlined icon. */
export function Icon({ name, filled, className }: IconProps): JSX.Element {
  return (
    <span className={cn("material-symbols-outlined", filled && "icon-filled", className)}>
      {name}
    </span>
  );
}
