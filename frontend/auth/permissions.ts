import type { Shift } from "../types";
import type { User } from "../types/auth";

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
    canCreateShift: boolean;
    canCreateUser: boolean;
    canCreateLocation: boolean;
    seesAllShifts: boolean;
    canMutateShifts: boolean;
};

export function getPermissions(user: User | null): Permissions {
    const mgrPlus = hasAtLeastRole(user, "manager");
    const admin = hasAtLeastRole(user, "admin");
    return {
        canCreateShift: mgrPlus,
        canCreateUser: admin,
        canCreateLocation: admin,
        seesAllShifts: mgrPlus,
        canMutateShifts: mgrPlus,
    };
}

export function fullNameFromUser(user: User | null): string | null {
    if (!user) return null;
    const u = user as User & { firstName?: string; lastName?: string };
    const fn = u.firstName?.trim() ?? "";
    const ln = u.lastName?.trim() ?? "";
    const combined = [fn, ln].filter(Boolean).join(" ");
    return combined || null;
}

function normalizeForMatch(s: string): string {
    return s.trim().toLowerCase();
}

/** True if shift assignees include this user. Prefer stable ids; names are only a legacy fallback. */
export function shiftAssignedToUser(shift: Shift, user: User | null): boolean {
    if (!user) return false;

    const userId = Number(user.id);
    if (Number.isFinite(userId)) {
        return shift.assignedUsers.some((assignedUser) => Number(assignedUser.id) === userId);
    }

    const name = fullNameFromUser(user);
    if (!name) return false;

    const target = normalizeForMatch(name);
    return shift.assignedUsers.some((assignedUser) => {
        const fullName = [assignedUser.firstName, assignedUser.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
        return normalizeForMatch(fullName || assignedUser.email) === target;
    });
}

export function filterShiftsForViewer(user: User | null, shifts: Shift[]): Shift[] {
    if (!user) return [];
    if (hasAtLeastRole(user, "manager")) return shifts;
    return shifts.filter((s) => shiftAssignedToUser(s, user));
}

export function hasRole(user: User | null, ...roles: string[]): boolean {
    if (!user) return false;
    const n = normalizeRole(user.role);
    return roles.some((r) => normalizeRole(r) === n);
}

export function isWorker(user: User | null): boolean {
    if (!user) return false;
    return normalizeRole(user.role) === "worker";
}

export function isManager(user: User | null): boolean {
    return normalizeRole(user?.role ?? "") === "manager";
}

export function isAdmin(user: User | null): boolean {
    return normalizeRole(user?.role ?? "") === "admin";
}
