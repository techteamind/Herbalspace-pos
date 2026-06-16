import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./app-layout";
import { DashboardPage } from "@/features/dashboard";
import { PosPage } from "@/features/pos";

/**
 * Router utama. Modul lain ditambahkan bertahap (Tahap D) mengikuti
 * struktur feature-based di src/features/*.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "kasir", element: <PosPage /> },
    ],
  },
]);
