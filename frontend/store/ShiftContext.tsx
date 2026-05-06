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

export type ShiftContextValue = {
  shifts: Shift[];
  isLoading: boolean;
  error: string | null;
  refreshShifts: () => Promise<void>;
  addShift: (shift: Shift) => Promise<void>;
  updateShift: (shift: Shift) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
};

export const ShiftContext = createContext<ShiftContextValue>({
  shifts: [],
  isLoading: false,
  error: null,
  refreshShifts: async () => {},
  addShift: async () => {},
  updateShift: async () => {},
  deleteShift: async () => {},
});

const SHIFT_QUERY_KEY = ["shifts"] as const;

export function ShiftContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const shiftsQuery = useQuery({
    queryKey: SHIFT_QUERY_KEY,
    queryFn: fetchShifts,
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

  async function addShift(shift: Shift) {
    await addShiftMutation.mutateAsync(shift);
  }

  async function updateShift(shift: Shift) {
    await updateShiftMutation.mutateAsync(shift);
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
