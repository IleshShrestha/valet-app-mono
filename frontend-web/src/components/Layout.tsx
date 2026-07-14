import { NavLink, Outlet } from "react-router-dom";
import HealthBadge from "./HealthBadge";

const NAV_ITEMS = [
  { to: "/invoicing", label: "Invoicing" },
  { to: "/locations", label: "Locations" },
  { to: "/service-days", label: "Service Days" },
  { to: "/users", label: "Users" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-maroon-50 text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-maroon-200 bg-white">
        <div className="border-b border-maroon-200 px-4 py-4">
          <h1 className="text-lg font-bold text-maroon-600">Valet Admin</h1>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-maroon-600 text-white" : "text-foreground hover:bg-maroon-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-maroon-200 bg-white px-6 py-3">
          <HealthBadge />
          {/* User menu lands here in the auth step. */}
          <span className="text-sm text-gray-500">not signed in</span>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
