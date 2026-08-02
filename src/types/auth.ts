/**
 * Authentication Types
 *
 * Supabase dipakai HANYA untuk autentikasi. Identitas user yang dibutuhkan
 * frontend cukup id + email dari sesi Supabase. Data tenant/role di-resolve
 * di sisi server (API) dari JWT, jadi tidak perlu disimpan di context.
 */

export type UserRole = "owner" | "manager" | "cashier";

export interface AuthUser {
  id: string;
  email: string;
}

export interface PinUser {
  id: string;
  name: string;
  role: UserRole;
  outletId: string | null;
}

// mode: null = di layar pilih-user (picker); "pin" = kasir aktif via PIN;
// "base" = user device (owner) masuk langsung tanpa PIN.
export type ActiveMode = "pin" | "base" | null;

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  role: UserRole | null;
  profileName: string | null;
  outletId: string | null;
  setOutletId: (id: string | null) => void;
  needsOutletSelection: boolean;
  // Sesi PIN (device bersama)
  mode: ActiveMode;
  pinUser: PinUser | null;
  pinLogin: (userId: string, pin: string) => Promise<PinUser>;
  commitActive: () => void;
  enterAsBase: () => void;
  exitToPicker: () => void;
}

export interface LoginRequest {
  email: string;
  password: string;
}
