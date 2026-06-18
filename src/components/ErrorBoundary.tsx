import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Menangkap error render agar tidak terjadi layar putih (blank screen).
 * Pesan & stack ditampilkan langsung di halaman supaya mudah didiagnosis.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[Herbaspace] Render error:", error, info.componentStack);
  }

  override render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-card p-6 space-y-3">
          <h1 className="font-h2 text-h2 text-error">Terjadi kesalahan</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Aplikasi gagal dimuat. Detail teknis di bawah ini.
          </p>
          <pre className="text-[12px] leading-5 bg-surface-container-low rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap text-on-surface">
            {error.message}
            {error.stack ? "\n\n" + error.stack : ""}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-on-primary rounded-lg h-touch-target-min font-body-lg text-body-lg font-semibold"
          >
            Muat ulang
          </button>
        </div>
      </div>
    );
  }
}
