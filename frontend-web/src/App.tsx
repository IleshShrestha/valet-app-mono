import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Placeholder from "@/pages/Placeholder";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/invoicing" replace />} />
                {/* The desktop app is admin-facing; every feature area is admin-gated. */}
                <Route element={<AdminRoute />}>
                  <Route path="/invoicing" element={<Placeholder title="Invoicing" />} />
                  <Route path="/locations" element={<Placeholder title="Locations" />} />
                  <Route path="/service-days" element={<Placeholder title="Service Days" />} />
                  <Route path="/users" element={<Placeholder title="Users" />} />
                </Route>
                <Route path="*" element={<Placeholder title="Not found" />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
