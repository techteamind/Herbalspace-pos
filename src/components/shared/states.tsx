import { Icon } from "./icon";

export function ListSkeleton({ rows = 3, variant = "list" }: { rows?: number; variant?: "list" | "grid" }): JSX.Element {
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-surface-container-lowest" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="aspect-square shimmer" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-3/4 rounded shimmer" />
              <div className="h-4 w-1/2 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[68px] bg-surface-container-lowest rounded-xl flex items-center gap-3 px-3" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="w-10 h-10 rounded-lg shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded shimmer" />
            <div className="h-3 w-1/3 rounded shimmer" />
          </div>
          <div className="h-4 w-16 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <Icon name={icon} className="text-[40px] text-outline mb-2" />
      <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className="bg-error-container/40 border border-error/30 rounded-xl p-4 text-on-error-container font-body-md text-body-md flex items-center gap-2">
      <Icon name="error" />{message}
    </div>
  );
}
