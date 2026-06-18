import { Navigate, Outlet } from "react-router-dom";
import { BottomNav, Icon } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout(): JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Icon name="progress_activity" className="animate-spin text-[32px]" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-md mx-auto relative">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
