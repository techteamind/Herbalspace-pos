import { getQueuedRequests, removeQueuedRequest, getQueueCount, moveToFailed, getFailedCount } from "./offline-db";
import { supabase } from "./supabase";
import { getActiveOutletId, getPinToken } from "./api-client";

let syncing = false;
const listeners = new Set<(count: number) => void>();
const failedListeners = new Set<(count: number) => void>();

// Status yang TIDAK akan pernah berhasil kalau diulang (request/data cacat) —
// pindahkan ke daftar gagal, bukan diulang selamanya. 401/403/5xx dianggap
// transient (token bisa refresh, server bisa pulih) dan tetap diantre.
const PERMANENT_FAIL = new Set([400, 404, 422]);

export function onQueueChange(fn: (count: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onFailedChange(fn: (count: number) => void): () => void {
  failedListeners.add(fn);
  return () => failedListeners.delete(fn);
}

async function notifyListeners(): Promise<void> {
  const count = await getQueueCount();
  listeners.forEach((fn) => fn(count));
  const failed = await getFailedCount();
  failedListeners.forEach((fn) => fn(failed));
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getQueuedRequests();
    // Atribusi: pakai token PIN kasir aktif kalau ada (biar sale offline tercatat
    // atas nama kasir, bukan akun device/owner); fallback ke sesi Supabase device.
    const { data } = await supabase.auth.getSession();
    const token = getPinToken() ?? data.session?.access_token;
    const outletId = getActiveOutletId();
    const apiBase = import.meta.env.VITE_API_BASE ?? "";

    for (const item of queue) {
      try {
        const res = await fetch(`${apiBase}/api/${item.path.replace(/^\//, "")}`, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(outletId && outletId !== "__all__" ? { "X-Outlet-Id": outletId } : {}),
            ...item.headers,
          },
          body: item.body,
        });

        if (res.ok || res.status === 409) {
          await removeQueuedRequest(item.id!);
          synced++;
        } else if (PERMANENT_FAIL.has(res.status)) {
          // ditolak permanen — pindahkan ke daftar gagal, hentikan pengulangan
          await moveToFailed(item);
          failed++;
        } else {
          // transient (401/403/5xx) — biarkan, coba lagi di siklus berikutnya
        }
      } catch {
        // kegagalan jaringan — biarkan diantre, coba lagi nanti
      }
    }
  } finally {
    syncing = false;
    await notifyListeners();
  }

  return { synced, failed };
}

export function startAutoSync(): () => void {
  const handleOnline = () => { syncQueue(); };
  window.addEventListener("online", handleOnline);

  const interval = setInterval(() => {
    if (navigator.onLine) syncQueue();
  }, 30_000);

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}
