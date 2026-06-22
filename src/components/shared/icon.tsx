import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Material Symbols Outlined icon. */
export function Icon({ name, filled, className, style }: IconProps): JSX.Element {
  return (
    <span className={cn("material-symbols-outlined", filled && "icon-filled", className)} style={style}>
      {name}
    </span>
  );
}
