import { getPermissions, hasAtLeastRole, isAdmin, normalizeRole } from "../auth/permissions";
import type { User } from "../types/auth";

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

describe("isAdmin", () => {
  it("is true only for admin", () => {
    expect(isAdmin(user("admin"))).toBe(true);
    expect(isAdmin(user("manager"))).toBe(false);
    expect(isAdmin(user("employee"))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("hasAtLeastRole", () => {
  it("respects the role ladder", () => {
    expect(hasAtLeastRole(user("admin"), "manager")).toBe(true);
    expect(hasAtLeastRole(user("manager"), "manager")).toBe(true);
    expect(hasAtLeastRole(user("employee"), "manager")).toBe(false);
    expect(hasAtLeastRole(null, "worker")).toBe(false);
  });
});

describe("getPermissions", () => {
  it("grants all admin capabilities to admins", () => {
    expect(getPermissions(user("admin"))).toEqual({
      canCreateUser: true,
      canCreateLocation: true,
      canInvoice: true,
      canManageBilling: true,
    });
  });
  it("denies non-admins", () => {
    for (const role of ["manager", "employee"]) {
      const p = getPermissions(user(role));
      expect(p.canInvoice).toBe(false);
      expect(p.canManageBilling).toBe(false);
      expect(p.canCreateUser).toBe(false);
      expect(p.canCreateLocation).toBe(false);
    }
    expect(getPermissions(null).canInvoice).toBe(false);
  });
});
