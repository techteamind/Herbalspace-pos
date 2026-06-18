import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthContextValue, AuthUser } from "@/types/auth";

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
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: toAuthUser(session),
      loading,
      error,
      login,
      logout,
      isAuthenticated: !!session,
    }),
    [session, loading, error],
  );

  return (
    <AuthContextProvider.Provider value={value}>
      {children}
    </AuthContextProvider.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContextProvider);
  if (context === undefined) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return context;
}
