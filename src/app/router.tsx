import { lazy, Suspense } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { AppLayout } from "./app-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/auth";
import LoginPage from "@/pages/auth/login";

const ROLE_LEVEL: Record<UserRole, number> = { cashier: 0, manager: 1, owner: 2 };

const DashboardPage = lazy(() => import("@/features/dashboard").then(m => ({ default: m.DashboardPage })));
const PosPage = lazy(() => import("@/features/pos").then(m => ({ default: m.PosPage })));
const ProductsPage = lazy(() => import("@/features/products").then(m => ({ default: m.ProductsPage })));
const RecipeEditorPage = lazy(() => import("@/features/recipes").then(m => ({ default: m.RecipeEditorPage })));
const InventoryPage = lazy(() => import("@/features/inventory").then(m => ({ default: m.InventoryPage })));
const StockMovementsPage = lazy(() => import("@/features/stock-movements").then(m => ({ default: m.StockMovementsPage })));
const CustomersPage = lazy(() => import("@/features/customers").then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import("@/features/customers/detail").then(m => ({ default: m.CustomerDetailPage })));
const ExpensesPage = lazy(() => import("@/features/expenses").then(m => ({ default: m.ExpensesPage })));
const ReportsPage = lazy(() => import("@/features/reports").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("@/features/settings").then(m => ({ default: m.SettingsPage })));
const MorePage = lazy(() => import("@/features/more").then(m => ({ default: m.MorePage })));
const TransactionsPage = lazy(() => import("@/features/transactions").then(m => ({ default: m.TransactionsPage })));
const ShiftsPage = lazy(() => import("@/features/shifts").then(m => ({ default: m.ShiftsPage })));
const PromosPage = lazy(() => import("@/features/promos").then(m => ({ default: m.PromosPage })));
const OutletsPage = lazy(() => import("@/features/outlets").then(m => ({ default: m.OutletsPage })));
const SharedReceiptPage = lazy(() => import("@/features/receipt/shared-receipt").then(m => ({ default: m.SharedReceiptPage })));
const AuditLogPage = lazy(() => import("@/features/audit-log").then(m => ({ default: m.AuditLogPage })));
const EmployeesPage = lazy(() => import("@/features/employees").then(m => ({ default: m.EmployeesPage })));
const ModifiersPage = lazy(() => import("@/features/modifiers").then(m => ({ default: m.ModifiersPage })));

function PageLoader() {
  return (
    <div className="px-4 pt-16 space-y-4 animate-pulse">
      <div className="h-7 w-32 bg-surface-container-low rounded-lg" />
      <div className="h-28 bg-surface-container-low rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 bg-surface-container-low rounded-2xl" />
        <div className="h-20 bg-surface-container-low rounded-2xl" />
        <div className="h-20 bg-surface-container-low rounded-2xl" />
      </div>
      <div className="h-48 bg-surface-container-low rounded-2xl" />
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Guard rute per-role. Kasir tak boleh modul inventori/keuangan/manajemen —
// diarahkan ke /kasir. Saat role masih dimuat, tampilkan loader (jangan salah redirect).
function R({ min, children }: { min: UserRole; children: React.ReactNode }) {
  const { role } = useAuth();
  if (role == null) return <PageLoader />;
  if (ROLE_LEVEL[role] < ROLE_LEVEL[min]) return <Navigate to="/kasir" replace />;
  return <L>{children}</L>;
}

export function AppRoutes() {
  return useRoutes([
    { path: "/auth/login", element: <LoginPage /> },
    { path: "/login", element: <Navigate to="/auth/login" replace /> },
    { path: "/receipt/:token", element: <L><SharedReceiptPage /></L> },
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", element: <L><DashboardPage /></L> },
        { path: "kasir", element: <L><PosPage /></L> },
        { path: "produk", element: <R min="manager"><ProductsPage /></R> },
        { path: "produk/:id/resep", element: <R min="manager"><RecipeEditorPage /></R> },
        { path: "inventori", element: <R min="manager"><InventoryPage /></R> },
        { path: "stock-movement", element: <R min="manager"><StockMovementsPage /></R> },
        { path: "pelanggan", element: <L><CustomersPage /></L> },
        { path: "pelanggan/:id", element: <L><CustomerDetailPage /></L> },
        { path: "riwayat-transaksi", element: <L><TransactionsPage /></L> },
        { path: "pengeluaran", element: <R min="manager"><ExpensesPage /></R> },
        { path: "laporan", element: <R min="manager"><ReportsPage /></R> },
        { path: "pengaturan", element: <R min="manager"><SettingsPage /></R> },
        { path: "shift", element: <L><ShiftsPage /></L> },
        { path: "promo", element: <R min="manager"><PromosPage /></R> },
        { path: "outlet", element: <R min="owner"><OutletsPage /></R> },
        { path: "audit-log", element: <R min="owner"><AuditLogPage /></R> },
        { path: "karyawan", element: <R min="owner"><EmployeesPage /></R> },
        { path: "modifier", element: <R min="manager"><ModifiersPage /></R> },
        { path: "lainnya", element: <L><MorePage /></L> },
      ],
    },
  ]);
}
