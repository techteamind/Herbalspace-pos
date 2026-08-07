import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { OutletPicker } from "@/features/outlets/outlet-picker";
import { UserPickerGate } from "@/features/auth/user-picker";
import { LockScreen } from "@/features/auth/lock-screen";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Auto-kunci sesi yang ditinggal idle → balik ke layar PIN. Shift TIDAK ditutup
// (itu tugas tombol Keluar); re-PIN dgn shift terbuka langsung masuk (lihat picker).
// Owner/manajer (akses sensitif) dikunci lebih cepat dari kasir yang sedang melayani.
const IDLE_MS = { privileged: 180_000, cashier: 5 * 60_000 };

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, needsOutletSelection, mode, role, locked, lock, hasPin } = useAuth();

  useEffect(() => {
    // Jangan auto-kunci kalau identitas aktif tak punya PIN (mis. owner/manajer
    // base yang belum set PIN) — takkan bisa unlock. Kunci baru aktif setelah set PIN.
    if (mode === null || locked || !hasPin) return; // layar PIN / sudah terkunci / tak bisa unlock
    const ms = role === "cashier" ? IDLE_MS.cashier : IDLE_MS.privileged;
    let timer = window.setTimeout(lock, ms);
    const reset = (): void => { clearTimeout(timer); timer = window.setTimeout(lock, ms); };
    const events = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [mode, role, locked, lock, hasPin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Device sudah login tapi belum ada user aktif → gerbang pilih-user + PIN.
  if (mode === null) {
    return <UserPickerGate />;
  }

  // Idle → layar kunci (sesi & shift tetap; unlock pakai PIN user aktif).
  if (locked) {
    return <LockScreen />;
  }

  if (needsOutletSelection) {
    return <OutletPicker />;
  }

  return <>{children}</>;
}
