import { supabase } from "./supabase";

/**
 * Wrapper fetch untuk memanggil serverless API (/api/*).
 * Otomatis melampirkan Supabase access token sebagai Bearer.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`/api/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request gagal (${res.status})`);
  }
  return res.json() as Promise<T>;
}
