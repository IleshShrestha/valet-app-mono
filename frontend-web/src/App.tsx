import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Placeholder from "@/pages/Placeholder";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/invoicing" replace />} />
            <Route path="/invoicing" element={<Placeholder title="Invoicing" />} />
            <Route path="/locations" element={<Placeholder title="Locations" />} />
            <Route path="/service-days" element={<Placeholder title="Service Days" />} />
            <Route path="/users" element={<Placeholder title="Users" />} />
            <Route path="*" element={<Placeholder title="Not found" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
