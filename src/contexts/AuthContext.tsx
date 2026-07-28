import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthContextValue, AuthUser, UserRole } from "@/types/auth";
import { apiFetch, getActiveOutletId, setActiveOutletId } from "@/lib/api-client";
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

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [outletId, setOutletIdState] = useState<string | null>(getActiveOutletId());
  const [assignedOutletId, setAssignedOutletId] = useState<string | null>(null);

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
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setRole(null); setProfileName(null); setAssignedOutletId(null); return; }
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;

    const load = (): void => {
      if (timer) { clearTimeout(timer); timer = undefined; }
      apiFetch("me").then((data: any) => {
        if (cancelled) return;
        attempt = 0;
        setRole(data.role);
        setProfileName(data.profileName);
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
  }, [session, setOutletId]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
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
    }),
    [session, loading, error, login, logout, role, profileName, effectiveOutletId, setOutletId, needsOutletSelection],
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
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContextProvider);
  return context ?? defaultAuthValue;
}
