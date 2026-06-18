import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Money({ value, className }: { value: number | string; className?: string }): JSX.Element {
  return <span className={cn(className)}>{formatRupiah(value)}</span>;
}
