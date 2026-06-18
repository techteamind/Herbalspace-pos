import { Icon } from "./icon";

export function ListSkeleton({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[68px] bg-surface-container-low rounded-xl animate-pulse" />
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
