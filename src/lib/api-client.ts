import { supabase } from "./supabase";

/**
 * Wrapper fetch untuk memanggil serverless API (/api/*).
 * Otomatis melampirkan Supabase access token sebagai Bearer.
 */
export function getActiveOutletId(): string | null {
  return localStorage.getItem("activeOutletId");
}

export function setActiveOutletId(id: string | null): void {
  if (id) localStorage.setItem("activeOutletId", id);
  else localStorage.removeItem("activeOutletId");
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const outletId = getActiveOutletId();

  const res = await fetch(`${API_BASE}/api/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(outletId && outletId !== "__all__" ? { "X-Outlet-Id": outletId } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request gagal (${res.status})`);
  }
  return res.json() as Promise<T>;
}
