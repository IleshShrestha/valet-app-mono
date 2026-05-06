import type { User } from "../types/auth";

export function hasRole(user: User | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export const isEmployee = (user: User | null): boolean => hasRole(user, "employee");
export const isManager = (user: User | null): boolean => hasRole(user, "manager");
export const isAdmin = (user: User | null): boolean => hasRole(user, "admin");
