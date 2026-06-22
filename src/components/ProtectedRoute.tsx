import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { OutletPicker } from "@/features/outlets/outlet-picker";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, needsOutletSelection } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (needsOutletSelection) {
    return <OutletPicker />;
  }

  return <>{children}</>;
}
