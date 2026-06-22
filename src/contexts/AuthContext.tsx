import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthContextValue, AuthUser, UserRole } from "@/types/auth";
import { apiFetch, getActiveOutletId, setActiveOutletId } from "@/lib/api-client";

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
    apiFetch("me").then((data: any) => {
      setRole(data.role);
      setProfileName(data.profileName);
      setAssignedOutletId(data.outletId ?? null);
      if (data.outletId && data.role !== "owner") {
        setOutletId(data.outletId);
      }
    }).catch(() => {});
  }, [session, setOutletId]);

  const login = async (email: string, password: string): Promise<void> => {
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
  };

  const logout = async (): Promise<void> => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const err = new Error(signOutError.message);
      setError(err);
      throw err;
    }
    setSession(null);
    setOutletId(null);
  };

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
    [session, loading, error, role, profileName, effectiveOutletId, setOutletId, needsOutletSelection],
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
