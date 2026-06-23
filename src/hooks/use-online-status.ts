import { useSyncExternalStore, useEffect, useState } from "react";
import { onQueueChange, startAutoSync } from "@/lib/offline-sync";
import { getQueueCount } from "@/lib/offline-db";

function subscribe(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

export function useQueueCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getQueueCount().then(setCount);
    const unsub = onQueueChange(setCount);
    return unsub;
  }, []);

  return count;
}

export function useAutoSync(): void {
  useEffect(() => startAutoSync(), []);
}
