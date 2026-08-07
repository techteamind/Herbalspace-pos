import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthContextValue, AuthUser, UserRole, PinUser, ActiveMode } from "@/types/auth";
import { apiFetch, getActiveOutletId, setActiveOutletId, setPinToken } from "@/lib/api-client";
import { queryClient, clearPersistedCache } from "@/lib/query-client";
import { clearQueue, getQueueCount } from "@/lib/offline-db";
import { syncQueue } from "@/lib/offline-sync";

const AuthContextProvider = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

function toAuthUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? "" };
}

// Cache role terakhir agar nav/guard punya role langsung saat app dibuka (sebelum
// /me selesai) → tak ada kedip nav ter-restriksi utk manager/owner.
const ROLE_KEY = "cachedRole";
function getCachedRole(): UserRole | null {
  const r = localStorage.getItem(ROLE_KEY);
  return r === "owner" || r === "manager" || r === "cashier" ? r : null;
}
function setCachedRole(r: UserRole | null): void {
  if (r) localStorage.setItem(ROLE_KEY, r); else localStorage.removeItem(ROLE_KEY);
}

function getMode(): ActiveMode {
  const m = localStorage.getItem("activeMode");
  return m === "pin" || m === "base" ? m : null;
}
function setModeLS(m: ActiveMode): void {
  if (m) localStorage.setItem("activeMode", m); else localStorage.removeItem("activeMode");
}
function getPinUserLS(): PinUser | null {
  try { const v = JSON.parse(localStorage.getItem("pinUser") || "null"); return v && v.id ? v : null; } catch { return null; }
}
function setPinUserLS(u: PinUser | null): void {
  if (u) localStorage.setItem("pinUser", JSON.stringify(u)); else localStorage.removeItem("pinUser");
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [role, setRole] = useState<UserRole | null>(getCachedRole());
  const [profileName, setProfileName] = useState<string | null>(null);
  const [outletId, setOutletIdState] = useState<string | null>(getActiveOutletId());
  const [assignedOutletId, setAssignedOutletId] = useState<string | null>(null);
  const [mode, setModeState] = useState<ActiveMode>(getMode());
  const [pinUser, setPinUserState] = useState<PinUser | null>(getPinUserLS());
  const [locked, setLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  const setOutletId = useCallback((id: string | null) => {
    setActiveOutletId(id);
    setOutletIdState(id);
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err) =>
        setError(err instanceof Error ? err : new Error("Gagal memuat sesi")),
      )
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      // Cegah data tenant/owner sebelumnya bocor ke sesi berikutnya (cache localStorage
      // ter-persist). Sesi habis / sign-out → buang cache query.
      if (event === "SIGNED_OUT") { queryClient.clear(); clearPersistedCache(); }
      setSession(next);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setRole(null); setCachedRole(null); setProfileName(null); setHasPin(false); setAssignedOutletId(null); return; }
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;

    const load = (): void => {
      if (timer) { clearTimeout(timer); timer = undefined; }
      apiFetch("me").then((data: any) => {
        if (cancelled) return;
        attempt = 0;
        setRole(data.role);
        setCachedRole(data.role);
        setProfileName(data.profileName);
        setHasPin(!!data.hasPin);
        setAssignedOutletId(data.outletId ?? null);
        if (data.outletId && data.role !== "owner") setOutletId(data.outletId);
      }).catch(() => {
        // /me gagal (jaringan flaky/offline) → retry backoff, jangan biarkan role
        // null seluruh sesi. Reconnect ("online") memicu load segera.
        if (cancelled) return;
        attempt += 1;
        timer = window.setTimeout(load, Math.min(5000 * 2 ** (attempt - 1), 30000));
      });
    };
    load();

    const onOnline = (): void => { attempt = 0; load(); };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
    // `mode` ikut dep: saat ganti user via PIN, token efektif berubah → /me muat
    // ulang jadi identitas user aktif.
  }, [session, setOutletId, mode]);

  // Verifikasi PIN → dapatkan token user itu (dipanggil dari picker; masih di picker
  // sampai commitActive dipanggil setelah shift dibuka).
  const pinLogin = useCallback(async (userId: string, pin: string): Promise<PinUser> => {
    setPinToken(null); // verifikasi pakai token device
    const res = await apiFetch("pin-login", { method: "POST", body: JSON.stringify({ userId, pin }) }) as { token: string; user: PinUser };
    setPinToken(res.token);
    setPinUserLS(res.user);
    setPinUserState(res.user);
    setOutletId(res.user.outletId ?? null);
    return res.user;
  }, [setOutletId]);

  const commitActive = useCallback((): void => {
    setPinUserState((u) => {
      if (u) { setRole(u.role); setCachedRole(u.role); setProfileName(u.name); }
      return u;
    });
    setModeLS("pin");
    setModeState("pin");
  }, []);

  const enterAsBase = useCallback((): void => {
    setPinToken(null); setPinUserLS(null); setPinUserState(null);
    setModeLS("base"); setModeState("base");
  }, []);

  const exitToPicker = useCallback((): void => {
    setPinToken(null); setPinUserLS(null); setPinUserState(null);
    setModeLS(null); setModeState(null);
    setRole(null); setCachedRole(null); setProfileName(null);
    setOutletId(null);
    setLocked(false);
  }, [setOutletId]);

  // Kunci layar saat idle: sesi & shift TETAP, hanya UI diblok sampai user aktif
  // memasukkan PIN-nya lagi (verifikasi ke server; lockout server tetap berlaku).
  const lock = useCallback((): void => { setLocked(true); }, []);
  const unlockWithPin = useCallback(async (pin: string): Promise<void> => {
    const uid = pinUser?.id ?? session?.user?.id ?? null;
    if (!uid) throw new Error("Sesi tidak dikenal — silakan login ulang");
    const wasBase = mode === "base";
    await pinLogin(uid, pin); // verifikasi PIN (lempar kalau salah / terkunci)
    // Base (owner/manajer via email): jangan pindah ke token PIN 14 jam yang tak
    // auto-refresh — verifikasi saja, lalu balik ke sesi Supabase device.
    if (wasBase) { setPinToken(null); setPinUserLS(null); setPinUserState(null); }
    setLocked(false);
  }, [pinUser, session, mode, pinLogin]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    // Buang cache identitas sebelumnya sebelum login akun baru (bisa beda tenant).
    queryClient.clear(); clearPersistedCache();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      const err = new Error(signInError.message);
      setError(err);
      throw err;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    // Kirim antrean offline SELAGI token masih valid, sebelum signOut.
    await syncQueue().catch(() => {});
    const pending = await getQueueCount().catch(() => 0);

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const err = new Error(signOutError.message);
      setError(err);
      throw err;
    }
    // Bersihkan jejak user: cache query + outlet aktif. Antrean HANYA dihapus kalau
    // sudah kosong (semua tersinkron); kalau masih ada (mis. logout saat offline),
    // simpan agar transaksi tidak hilang — akan disinkron saat online berikutnya.
    // ponytail: antrean sisa akan tersinkron dengan atribusi kasir user berikutnya;
    // simpan cashier saat capture bila atribusi lintas-user jadi masalah.
    queryClient.clear();
    clearPersistedCache();
    if (pending === 0) await clearQueue().catch(() => {});
    setPinToken(null); setPinUserLS(null); setPinUserState(null); setModeLS(null); setModeState(null);
    setLocked(false);
    setSession(null);
    setOutletId(null);
  }, [setOutletId]);

  const needsOutletSelection = !!session && role === "owner" && !outletId && !assignedOutletId;
  const effectiveOutletId = outletId === "__all__" ? null : outletId;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: toAuthUser(session),
      loading,
      error,
      login,
      logout,
      isAuthenticated: !!session,
      role,
      profileName,
      outletId: effectiveOutletId,
      setOutletId,
      needsOutletSelection,
      mode,
      pinUser,
      pinLogin,
      commitActive,
      enterAsBase,
      exitToPicker,
      locked,
      lock,
      unlockWithPin,
      hasPin,
    }),
    [session, loading, error, login, logout, role, profileName, effectiveOutletId, setOutletId, needsOutletSelection, mode, pinUser, pinLogin, commitActive, enterAsBase, exitToPicker, locked, lock, unlockWithPin, hasPin],
  );

  return (
    <AuthContextProvider.Provider value={value}>
      {children}
    </AuthContextProvider.Provider>
  );
}

const defaultAuthValue: AuthContextValue = {
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  role: null,
  profileName: null,
  outletId: null,
  setOutletId: () => {},
  needsOutletSelection: false,
  mode: null,
  pinUser: null,
  pinLogin: async () => ({ id: "", name: "", role: "cashier", outletId: null }),
  commitActive: () => {},
  enterAsBase: () => {},
  exitToPicker: () => {},
  locked: false,
  lock: () => {},
  unlockWithPin: async () => {},
  hasPin: false,
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContextProvider);
  return context ?? defaultAuthValue;
}
