import { useState } from "react";
import { Icon } from "./icon";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Hapus", cancelLabel = "Batal", destructive = true, loading, onConfirm, onCancel }: ConfirmDialogProps): JSX.Element | null {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function handleConfirm(): Promise<void> {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  const isLoading = loading || busy;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-6" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl p-5 shadow-elevation-3 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${destructive ? "bg-error-container" : "bg-primary-container"}`}>
            <Icon name={destructive ? "delete" : "help"} className={destructive ? "text-on-error-container" : "text-on-primary-container"} />
          </div>
          <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{title}</h3>
        </div>
        {message && <p className="font-body-md text-body-md text-on-surface-variant">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={isLoading}
            className="h-10 px-5 rounded-xl border border-outline-variant font-body-md text-body-md font-semibold text-on-surface-variant active:scale-95 transition-transform disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} disabled={isLoading}
            className={`h-10 px-5 rounded-xl font-body-md text-body-md font-semibold active:scale-95 transition-transform disabled:opacity-50 ${destructive ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{ title: string; message?: string; resolve: (v: boolean) => void } | null>(null);

  function confirm(title: string, message?: string): Promise<boolean> {
    return new Promise((resolve) => setState({ title, message, resolve }));
  }

  function dialog(): JSX.Element | null {
    if (!state) return null;
    return (
      <ConfirmDialog
        open
        title={state.title}
        message={state.message}
        onConfirm={() => { state.resolve(true); setState(null); }}
        onCancel={() => { state.resolve(false); setState(null); }}
      />
    );
  }

  return { confirm, ConfirmDialog: dialog };
}
