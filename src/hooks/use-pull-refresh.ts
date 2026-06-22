import { useCallback, useRef, useState, type TouchEvent } from "react";

interface PullRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullRefresh(onRefresh: () => Promise<void>, threshold = 80): PullRefreshState {
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 5 || refreshing) return;
    startY.current = e.touches[0]!.clientY;
    setPulling(true);
  }, [refreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling || refreshing) return;
    const diff = e.touches[0]!.clientY - startY.current;
    if (diff < 0) { setPullDistance(0); return; }
    setPullDistance(Math.min(diff * 0.4, 120));
  }, [pulling, refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= threshold) {
      setRefreshing(true);
      try { await onRefresh(); } catch { /* ignore */ }
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, onRefresh]);

  return { pulling, pullDistance, refreshing, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
