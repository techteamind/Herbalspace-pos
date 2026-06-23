import { supabase } from "./supabase";
import { enqueueRequest } from "./offline-db";

export function getActiveOutletId(): string | null {
  return localStorage.getItem("activeOutletId");
}

export function setActiveOutletId(id: string | null): void {
  if (id) localStorage.setItem("activeOutletId", id);
  else localStorage.removeItem("activeOutletId");
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const OFFLINE_QUEUABLE = ["POST", "PUT", "DELETE"];

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const outletId = getActiveOutletId();
  const method = (init.method ?? "GET").toUpperCase();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(outletId && outletId !== "__all__" ? { "X-Outlet-Id": outletId } : {}),
  };

  if (!navigator.onLine && OFFLINE_QUEUABLE.includes(method)) {
    await enqueueRequest({
      path,
      method,
      body: typeof init.body === "string" ? init.body : null,
      headers: {},
    });
    return { _queued: true } as T;
  }

  const res = await fetch(`${API_BASE}/api/${path.replace(/^\//, "")}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request gagal (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
