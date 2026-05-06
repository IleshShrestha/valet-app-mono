import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";
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

type ShiftAction =
  | { type: "SET_SHIFTS"; payload: Shift[] }
  | { type: "ADD"; payload: Shift }
  | { type: "UPDATE"; payload: Shift }
  | { type: "DELETE"; payload: string };

function shiftReducer(state: Shift[], action: ShiftAction): Shift[] {
  switch (action.type) {
    case "SET_SHIFTS":
      return action.payload;
    case "ADD":
      return [action.payload, ...state];
    case "UPDATE":
      return state.map((shift) =>
        shift.id === action.payload.id ? action.payload : shift,
      );
    case "DELETE":
      return state.filter((shift) => shift.id !== action.payload);
    default:
      return state;
  }
}

export function ShiftContextProvider({ children }: { children: ReactNode }) {
  const [shiftsState, dispatch] = useReducer(shiftReducer, []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshShifts = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const shifts = await fetchShifts();
      dispatch({ type: "SET_SHIFTS", payload: shifts });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load shifts";
      setError(message);
      dispatch({ type: "SET_SHIFTS", payload: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshShifts();
  }, [refreshShifts]);

  async function addShift(shift: Shift) {
    const created = await createShiftApi(shift);
    dispatch({ type: "ADD", payload: created });
  }

  async function updateShift(shift: Shift) {
    const updated = await updateShiftApi(shift);
    dispatch({ type: "UPDATE", payload: updated });
  }

  async function deleteShift(id: string) {
    await deleteShiftApi(id);
    dispatch({ type: "DELETE", payload: id });
  }

  const value: ShiftContextValue = {
    shifts: shiftsState,
    isLoading,
    error,
    refreshShifts,
    addShift,
    updateShift,
    deleteShift,
  };

  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
}
