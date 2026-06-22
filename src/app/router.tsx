import { lazy, Suspense } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { AppLayout } from "./app-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/auth/login";

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
        { path: "produk", element: <L><ProductsPage /></L> },
        { path: "produk/:id/resep", element: <L><RecipeEditorPage /></L> },
        { path: "inventori", element: <L><InventoryPage /></L> },
        { path: "stock-movement", element: <L><StockMovementsPage /></L> },
        { path: "pelanggan", element: <L><CustomersPage /></L> },
        { path: "pelanggan/:id", element: <L><CustomerDetailPage /></L> },
        { path: "riwayat-transaksi", element: <L><TransactionsPage /></L> },
        { path: "pengeluaran", element: <L><ExpensesPage /></L> },
        { path: "laporan", element: <L><ReportsPage /></L> },
        { path: "pengaturan", element: <L><SettingsPage /></L> },
        { path: "shift", element: <L><ShiftsPage /></L> },
        { path: "promo", element: <L><PromosPage /></L> },
        { path: "outlet", element: <L><OutletsPage /></L> },
        { path: "audit-log", element: <L><AuditLogPage /></L> },
        { path: "karyawan", element: <L><EmployeesPage /></L> },
        { path: "modifier", element: <L><ModifiersPage /></L> },
        { path: "lainnya", element: <L><MorePage /></L> },
      ],
    },
  ]);
}
