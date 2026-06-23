import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav, Icon, ToastProvider } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus, useQueueCount, useAutoSync } from "@/hooks/use-online-status";
import { syncQueue } from "@/lib/offline-sync";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AppLayout(): JSX.Element {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const online = useOnlineStatus();
  const queueCount = useQueueCount();
  useAutoSync();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Icon name="progress_activity" className="animate-spin text-[32px]" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-background max-w-3xl mx-auto relative">
        <main className="flex-1 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        {(!online || queueCount > 0) && (
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl z-[70]">
            <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-[12px] font-semibold ${online ? "bg-primary-container text-on-primary-container" : "bg-error-container text-on-error-container"}`}>
              <Icon name={online ? "sync" : "cloud_off"} className="text-[14px]" />
              {!online && "Offline — data tersimpan lokal"}
              {online && queueCount > 0 && (
                <button onClick={() => syncQueue()} className="underline">
                  {queueCount} antrian menunggu sinkronisasi
                </button>
              )}
            </div>
          </div>
        )}
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
