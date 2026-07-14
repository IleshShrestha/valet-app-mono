import { describe, expect, it } from "vitest";
import { getPermissions, hasAtLeastRole, isAdmin, normalizeRole } from "./permissions";
import type { User } from "@/types/auth";

const user = (role: string): User => ({ id: 1, email: "u@e.com", role });

describe("normalizeRole", () => {
  it("maps legacy employee to worker", () => {
    expect(normalizeRole("employee")).toBe("worker");
  });
  it("recognizes manager and admin (case-insensitive)", () => {
    expect(normalizeRole("Manager")).toBe("manager");
    expect(normalizeRole("ADMIN")).toBe("admin");
  });
  it("defaults unknown/empty to worker", () => {
    expect(normalizeRole("chef")).toBe("worker");
    expect(normalizeRole(undefined)).toBe("worker");
    expect(normalizeRole(null)).toBe("worker");
  });
});

describe("isAdmin / hasAtLeastRole", () => {
  it("isAdmin is true only for admin", () => {
    expect(isAdmin(user("admin"))).toBe(true);
    expect(isAdmin(user("manager"))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
  it("hasAtLeastRole respects the ladder", () => {
    expect(hasAtLeastRole(user("admin"), "manager")).toBe(true);
    expect(hasAtLeastRole(user("employee"), "manager")).toBe(false);
    expect(hasAtLeastRole(null, "worker")).toBe(false);
  });
});

describe("getPermissions", () => {
  it("grants admin capabilities to admins only", () => {
    expect(getPermissions(user("admin"))).toEqual({
      canCreateUser: true,
      canCreateLocation: true,
      canInvoice: true,
      canManageBilling: true,
    });
    expect(getPermissions(user("manager")).canInvoice).toBe(false);
    expect(getPermissions(null).canManageBilling).toBe(false);
  });
});
