import { useMemo } from "react";
import { useAuth } from "../store/Authcontext";
import { getPermissions } from "../auth/permissions";
import type { Permissions } from "../auth/permissions";

export function usePermissions(): Permissions {
    const { user } = useAuth();
    return useMemo(() => getPermissions(user), [user]);
}
