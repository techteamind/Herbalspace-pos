import { QueryClient, onlineManager, dehydrate, hydrate } from "@tanstack/react-query";

onlineManager.setOnline(navigator.onLine);
window.addEventListener("online", () => onlineManager.setOnline(true));
window.addEventListener("offline", () => onlineManager.setOnline(false));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
      gcTime: 1000 * 60 * 60 * 24,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

// Persist cache ke localStorage supaya data (produk, dll.) tetap ada saat app
// dibuka ulang offline — kalau cuma di memori, restart = grid kosong, tak bisa jual.
// ponytail: localStorage cukup untuk katalog toko kecil; pindah ke IndexedDB kalau
// datanya membesar sampai menembus ~5MB.
const CACHE_KEY = "herbaspace-rq-cache";

export function clearPersistedCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* abaikan */ }
}

try {
  const saved = localStorage.getItem(CACHE_KEY);
  if (saved) hydrate(queryClient, JSON.parse(saved));
} catch { clearPersistedCache(); }

let persistTimer: number | undefined;
queryClient.getQueryCache().subscribe(() => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      const state = dehydrate(queryClient, { shouldDehydrateQuery: (q) => q.state.status === "success" });
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch { /* quota/serialisasi gagal — lewati, cache tetap di memori */ }
  }, 1000);
});
