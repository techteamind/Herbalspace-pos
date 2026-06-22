import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./app-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/auth/login";
import { DashboardPage } from "@/features/dashboard";
import { PosPage } from "@/features/pos";
import { ProductsPage } from "@/features/products";
import { RecipeEditorPage } from "@/features/recipes";
import { InventoryPage } from "@/features/inventory";
import { StockMovementsPage } from "@/features/stock-movements";
import { CustomersPage } from "@/features/customers";
import { CustomerDetailPage } from "@/features/customers/detail";
import { ExpensesPage } from "@/features/expenses";
import { ReportsPage } from "@/features/reports";
import { SettingsPage } from "@/features/settings";
import { MorePage } from "@/features/more";
import { TransactionsPage } from "@/features/transactions";
import { ShiftsPage } from "@/features/shifts";
import { PromosPage } from "@/features/promos";
import { OutletsPage } from "@/features/outlets";
import { SharedReceiptPage } from "@/features/receipt/shared-receipt";
import { AuditLogPage } from "@/features/audit-log";
import { EmployeesPage } from "@/features/employees";
import { ModifiersPage } from "@/features/modifiers";

export const router = createBrowserRouter([
  // Public routes
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/login", element: <Navigate to="/auth/login" replace /> },
  { path: "/receipt/:token", element: <SharedReceiptPage /> },

  // Protected routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "kasir", element: <PosPage /> },
      { path: "produk", element: <ProductsPage /> },
      { path: "produk/:id/resep", element: <RecipeEditorPage /> },
      { path: "inventori", element: <InventoryPage /> },
      { path: "stock-movement", element: <StockMovementsPage /> },
      { path: "pelanggan", element: <CustomersPage /> },
      { path: "pelanggan/:id", element: <CustomerDetailPage /> },
      { path: "riwayat-transaksi", element: <TransactionsPage /> },
      { path: "pengeluaran", element: <ExpensesPage /> },
      { path: "laporan", element: <ReportsPage /> },
      { path: "pengaturan", element: <SettingsPage /> },
      { path: "shift", element: <ShiftsPage /> },
      { path: "promo", element: <PromosPage /> },
      { path: "outlet", element: <OutletsPage /> },
      { path: "audit-log", element: <AuditLogPage /> },
      { path: "karyawan", element: <EmployeesPage /> },
      { path: "modifier", element: <ModifiersPage /> },
      { path: "lainnya", element: <MorePage /> },
    ],
  },
]);
