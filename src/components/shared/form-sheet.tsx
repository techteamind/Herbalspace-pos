import type { ReactNode } from "react";
import { Icon } from "./icon";

export function FormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): JSX.Element {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-on-surface-variant"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="block space-y-1">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full h-touch-target-min px-4 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-body-md";
