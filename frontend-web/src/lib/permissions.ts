import type { User } from "@/types/auth";

export type AppRole = "worker" | "manager" | "admin";

const ROLE_RANK: Record<AppRole, number> = {
  worker: 1,
  manager: 2,
  admin: 3,
};

/** Map legacy `employee` and unknown roles to least-privileged `worker`. */
export function normalizeRole(role: string | undefined | null): AppRole {
  if (!role) return "worker";
  const r = role.toLowerCase().trim();
  if (r === "employee" || r === "worker") return "worker";
  if (r === "manager") return "manager";
  if (r === "admin") return "admin";
  return "worker";
}

export function hasAtLeastRole(user: User | null, min: AppRole): boolean {
  if (!user) return false;
  const current = normalizeRole(user.role);
  return ROLE_RANK[current] >= ROLE_RANK[min];
}

export type Permissions = {
  canCreateUser: boolean;
  canCreateLocation: boolean;
  canInvoice: boolean;
  canManageBilling: boolean;
};

export function getPermissions(user: User | null): Permissions {
  const admin = hasAtLeastRole(user, "admin");
  return {
    canCreateUser: admin,
    canCreateLocation: admin,
    canInvoice: admin,
    canManageBilling: admin,
  };
}

export function isAdmin(user: User | null): boolean {
  return normalizeRole(user?.role ?? "") === "admin";
}
