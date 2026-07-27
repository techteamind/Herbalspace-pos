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

  const queueable = OFFLINE_QUEUABLE.includes(method);
  // Simpan outlet SAAT capture (bukan saat sync): kalau kasir/owner pindah outlet
  // sebelum antrean tersinkron, transaksi tetap tercatat di outlet yang benar.
  // Token sengaja TIDAK disimpan — sync memakai token terbaru (yang lama bisa kedaluwarsa).
  const capturedHeaders: Record<string, string> = outletId && outletId !== "__all__" ? { "X-Outlet-Id": outletId } : {};

  async function queue(): Promise<T> {
    await enqueueRequest({
      path,
      method,
      body: typeof init.body === "string" ? init.body : null,
      headers: capturedHeaders,
    });
    return { _queued: true } as T;
  }

  if (!navigator.onLine && queueable) return queue();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/${path.replace(/^\//, "")}`, {
      ...init,
      headers: { ...headers, ...init.headers },
    });
  } catch (err) {
    // Kegagalan level jaringan (sinyal lemah, timeout) — navigator.onLine bisa tetap
    // true. Antre daripada kehilangan transaksi. Error HTTP (4xx/5xx) di bawah TIDAK
    // diantre karena itu penolakan sah dari server.
    if (queueable) return queue();
    throw err;
  }

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request gagal (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
