import { QueryClient, onlineManager } from "@tanstack/react-query";

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
