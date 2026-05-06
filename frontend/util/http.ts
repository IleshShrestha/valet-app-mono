/**
 * Legacy HTTP helpers — prefer `util/shiftsApi.ts` for shift CRUD.
 */
import type { Shift } from "../types";
import { createShift } from "./shiftsApi";

export function storeShift(shift: Shift, locationId: number) {
  return createShift({ shift, locationId });
}

export {
  SHIFTS_API_BASE,
  fetchShifts,
  fetchUserPickerOptions,
  fetchLocationPickerOptions,
  createShift,
  updateShift,
  deleteShift,
  postShiftCheckLocation,
  runSilentHealthCheck,
} from "./shiftsApi";
