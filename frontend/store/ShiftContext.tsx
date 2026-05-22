import { createContext, type ReactNode } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Shift } from "../types";
import {
  createShift as createShiftApi,
  deleteShift as deleteShiftApi,
  fetchShifts,
  updateShift as updateShiftApi,
} from "../util/shiftsApi";
import { useAuth } from "./Authcontext";

export type ShiftContextValue = {
  shifts: Shift[];
  isLoading: boolean;
  error: string | null;
  refreshShifts: () => Promise<void>;
  addShift: (shift: Shift, locationId: number) => Promise<void>;
  updateShift: (shift: Shift, locationId: number) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
};

export const ShiftContext = createContext<ShiftContextValue>({
  shifts: [],
  isLoading: false,
  error: null,
  refreshShifts: async () => {},
  addShift: async (_shift: Shift, _locationId: number) => {},
  updateShift: async (_shift: Shift, _locationId: number) => {},
  deleteShift: async () => {},
});

const SHIFT_QUERY_KEY = ["shifts"] as const;

export function ShiftContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const shiftsQuery = useQuery({
    queryKey: [...SHIFT_QUERY_KEY, user?.id ?? "anonymous"],
    queryFn: fetchShifts,
    enabled: !!user && !authLoading,
  });

  const addShiftMutation = useMutation({
    mutationFn: createShiftApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: updateShiftApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShiftApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
  });

  async function refreshShifts() {
    await shiftsQuery.refetch();
  }

  async function addShift(shift: Shift, locationId: number) {
    await addShiftMutation.mutateAsync({ shift, locationId });
  }

  async function updateShift(shift: Shift, locationId: number) {
    await updateShiftMutation.mutateAsync({ shift, locationId });
  }

  async function deleteShift(id: string) {
    await deleteShiftMutation.mutateAsync(id);
  }

  const value: ShiftContextValue = {
    shifts: shiftsQuery.data ?? [],
    isLoading: shiftsQuery.isLoading,
    error: shiftsQuery.error instanceof Error ? shiftsQuery.error.message : null,
    refreshShifts,
    addShift,
    updateShift,
    deleteShift,
  };

  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
}
