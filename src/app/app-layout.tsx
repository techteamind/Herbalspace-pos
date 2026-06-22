import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav, Icon, ToastProvider } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AppLayout(): JSX.Element {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

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
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
