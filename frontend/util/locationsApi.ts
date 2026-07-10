import type { BillingType, Location, LocationBilling } from "../types/billing";
import { apiClient } from "./apiClient";

type ApiRecord = Record<string, unknown>;

function unwrapData<T>(res: unknown, fallback: T): T {
  if (res && typeof res === "object" && "data" in (res as ApiRecord)) {
    return (res as { data: T }).data;
  }
  if (res == null) return fallback;
  return res as T;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function apiRecordToLocation(raw: ApiRecord): Location {
  const billingType = (typeof raw.billing_type === "string" ? raw.billing_type : "hourly_per_person") as BillingType;
  return {
    id: String(raw.id ?? ""),
    name: typeof raw.name === "string" ? raw.name : "",
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    radius: Number(raw.radius ?? 0),
    billingType,
    hourlyRate: numOrNull(raw.hourly_rate),
    singleShiftRate: numOrNull(raw.single_shift_rate),
    doubleShiftRate: numOrNull(raw.double_shift_rate),
    holidayMultiplier: numOrNull(raw.holiday_multiplier),
    holidayFlatBonus: numOrNull(raw.holiday_flat_bonus),
    usesHolidayPay: Boolean(raw.uses_holiday_pay),
  };
}

/** Serialize billing config to the snake_case body the API expects. */
export function billingToApiBody(billing: LocationBilling): Record<string, unknown> {
  return {
    billing_type: billing.billingType,
    hourly_rate: billing.hourlyRate,
    single_shift_rate: billing.singleShiftRate,
    double_shift_rate: billing.doubleShiftRate,
    holiday_multiplier: billing.holidayMultiplier,
    holiday_flat_bonus: billing.holidayFlatBonus,
    uses_holiday_pay: billing.usesHolidayPay,
  };
}

export type CreateLocationPayload = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  billing?: LocationBilling;
};

/** POST /locations/ */
export async function createLocation(payload: CreateLocationPayload): Promise<Location> {
  const body: Record<string, unknown> = {
    name: payload.name,
    latitude: payload.latitude,
    longitude: payload.longitude,
    radius: payload.radius,
    ...(payload.billing ? billingToApiBody(payload.billing) : {}),
  };
  const res = await apiClient.post<unknown>("/locations/", body);
  return apiRecordToLocation(unwrapData<ApiRecord>(res, {}));
}

/** GET /locations — full locations incl. billing (admin only). */
export async function fetchLocations(): Promise<Location[]> {
  const rows = unwrapData<unknown[]>(await apiClient.get<unknown>("/locations"), []);
  return Array.isArray(rows) ? rows.map((r) => apiRecordToLocation(r as ApiRecord)) : [];
}

/** PUT /locations/:id — update billing config (admin only). */
export async function updateLocationBilling(id: string, billing: LocationBilling): Promise<Location> {
  const res = await apiClient.put<unknown>(`/locations/${id}`, billingToApiBody(billing));
  return apiRecordToLocation(unwrapData<ApiRecord>(res, {}));
}
