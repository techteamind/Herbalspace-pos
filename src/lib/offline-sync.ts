import { getQueuedRequests, removeQueuedRequest, getQueueCount } from "./offline-db";
import { supabase } from "./supabase";
import { getActiveOutletId } from "./api-client";

let syncing = false;
const listeners = new Set<(count: number) => void>();

export function onQueueChange(fn: (count: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notifyListeners(): Promise<void> {
  const count = await getQueueCount();
  listeners.forEach((fn) => fn(count));
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getQueuedRequests();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
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
        } else {
          failed++;
        }
      } catch {
        failed++;
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
