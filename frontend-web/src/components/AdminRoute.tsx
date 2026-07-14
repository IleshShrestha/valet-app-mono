import { Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { isAdmin } from "@/lib/permissions";

export default function AdminRoute() {
  const { user } = useAuth();

  if (!isAdmin(user)) {
    return (
      <div className="rounded-md border border-maroon-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-maroon-900">Admins only</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your account doesn't have access to this area. The desktop app is for administrators.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
