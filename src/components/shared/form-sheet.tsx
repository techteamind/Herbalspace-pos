import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Icon } from "./icon";

export function FormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): JSX.Element {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.2 }}
      onClick={onClose}>
      <motion.div
        className="w-full max-w-3xl bg-surface-container-lowest rounded-t-3xl p-5 pb-safe space-y-4 max-h-[92vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-1 rounded-full bg-outline-variant/50" />
          <div className="flex justify-between items-center w-full">
            <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
            <button onClick={onClose} aria-label="Tutup" className="text-on-surface-variant p-1 active:scale-90 transition-transform">
              <Icon name="close" />
            </button>
          </div>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }): JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-on-surface-variant tracking-wide">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] font-medium text-error">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-all";
