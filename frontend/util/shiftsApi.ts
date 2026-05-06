import axios from "axios";
import type { Shift } from "../types";

/**
 * Base URL for shift CRUD (no trailing slash).
 * Set `EXPO_PUBLIC_API_URL` in `.env` (Expo inlines `EXPO_PUBLIC_*` at build time).
 */
export const SHIFTS_API_BASE = process.env.EXPO_PUBLIC_API_URL;

/** Raw shift JSON from the API (supports camelCase from Go json tags + legacy keys). */
type ShiftApiRecord = Record<string, unknown>;

export type UserPickerOption = {
  label: string;
  value: string;
};

/** Same shape as `UserPickerOption`, for location dropdowns. */
export type LocationPickerOption = UserPickerOption;

const FALLBACK_USER_OPTIONS: UserPickerOption[] = [
  { label: "Alex Rivera", value: "Alex Rivera" },
  { label: "Jordan Lee", value: "Jordan Lee" },
  { label: "Sam Patel", value: "Sam Patel" },
  { label: "Taylor Morgan", value: "Taylor Morgan" },
];

const client = axios.create({
  baseURL: SHIFTS_API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

function strFromRecord(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function idFromRecord(r: Record<string, unknown>): string {
  const v = r.id ?? r.ID;
  if (v == null) return "";
  return String(v);
}

/** Normalize "12:00:00" or "12:00" → "12:00" for UI + Shift type. */
function normalizeTimeToHHmm(t: string): string {
  const parts = t.trim().split(":");
  if (parts.length < 2) return t.trim();
  const h = parts[0].padStart(2, "0");
  const m = parts[1].padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToApiTime(s: string): string {
  const x = s.trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(x)) return x;
  if (/^\d{1,2}:\d{2}$/.test(x)) {
    const [h, m] = x.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
  }
  return x;
}

/** Prefer `f_name` + `l_name` (and common aliases). */
function displayNameFromUserObject(o: Record<string, unknown>): string {
  const fn =
    (typeof o.f_name === "string" && o.f_name.trim()) ||
    (typeof o.first_name === "string" && o.first_name.trim()) ||
    "";
  const ln =
    (typeof o.l_name === "string" && o.l_name.trim()) ||
    (typeof o.last_name === "string" && o.last_name.trim()) ||
    "";
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (typeof o.full_name === "string" && o.full_name.trim())
    return o.full_name.trim();
  if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
  return "";
}

function parseUsersFromApi(users: unknown): string[] {
  if (users == null) return [];
  if (!Array.isArray(users)) return [];
  return users
    .map((u) => {
      if (typeof u === "string") return u.trim();
      if (u && typeof u === "object") {
        const o = u as Record<string, unknown>;
        return displayNameFromUserObject(o);
      }
      return "";
    })
    .filter(Boolean);
}

function pickerLabelFromUser(u: unknown, index: number): string {
  if (typeof u === "string") return u.trim();
  if (u && typeof u === "object") {
    const o = u as Record<string, unknown>;
    const fromNames = displayNameFromUserObject(o);
    if (fromNames) return fromNames;
  }
  return `User ${index + 1}`;
}

export function apiRecordToShift(raw: ShiftApiRecord): Shift {
  const r = raw as Record<string, unknown>;
  const title = strFromRecord(r, "title", "Title");

  const startRaw = strFromRecord(r, "start_time", "startTime", "StartTime");
  const endRaw = strFromRecord(r, "end_time", "endTime", "EndTime");

  const dateStr = strFromRecord(r, "date", "Date");
  const location = strFromRecord(r, "location", "Location");

  const usersVal = r.users ?? r.Users;

  return {
    id: idFromRecord(r),
    title,
    date: dateStr ? new Date(dateStr) : new Date(),
    timeStart: normalizeTimeToHHmm(startRaw || "00:00:00"),
    timeEnd: normalizeTimeToHHmm(endRaw || "00:00:00"),
    location,
    userNames: parseUsersFromApi(usersVal),
  };
}

/** Sent as `location` on POST /shifts and PUT /shifts/:id (fixed site id). */
const SHIFT_CREATE_UPDATE_LOCATION_ID = 2;

/**
 * Request body JSON tags from Go:
 * title, date, start_time, end_time, location (all required).
 */
function shiftToApiBody(shift: Shift): Record<string, unknown> {
  const d = shift.date instanceof Date ? shift.date : new Date(shift.date);
  return {
    title: shift.title,
    date: d.toISOString(),
    start_time: hhmmToApiTime(shift.timeStart),
    end_time: hhmmToApiTime(shift.timeEnd),
    location_id: SHIFT_CREATE_UPDATE_LOCATION_ID,
  };
}

function unwrapShiftList(data: unknown): ShiftApiRecord[] {
  if (Array.isArray(data)) return data as ShiftApiRecord[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.shifts)) return o.shifts as ShiftApiRecord[];
    if (Array.isArray(o.data)) return o.data as ShiftApiRecord[];
    if (Array.isArray(o.results)) return o.results as ShiftApiRecord[];
  }
  return [];
}

function unwrapUserList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.users)) return o.users;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.results)) return o.results;
  }
  return [];
}

function locationStringsFromPayload(data: unknown): string[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          if (typeof o.title === "string") return o.title.trim();
          if (typeof o.name === "string") return o.name.trim();
          if (typeof o.location === "string") return o.location.trim();
          if (typeof o.value === "string") return o.value.trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.locations))
      return locationStringsFromPayload(o.locations);
    if (Array.isArray(o.data)) return locationStringsFromPayload(o.data);
    if (Array.isArray(o.results)) return locationStringsFromPayload(o.results);
  }
  return [];
}

/** GET /users/ — all users for the team member picker. */
export async function fetchUserPickerOptions(): Promise<UserPickerOption[]> {
  try {
    const { data } = await client.get<unknown>("/users/");
    const raw = unwrapUserList(data);
    if (raw.length === 0) return FALLBACK_USER_OPTIONS;

    return raw.map((u, i) => {
      const label = pickerLabelFromUser(u, i);
      return { label, value: label };
    });
  } catch {
    return FALLBACK_USER_OPTIONS;
  }
}

/** GET /shifts/locations — distinct locations for the location field. */
export async function fetchLocationPickerOptions(): Promise<
  LocationPickerOption[]
> {
  try {
    const { data } = await client.get<unknown>("/shifts/locations");
    const names = locationStringsFromPayload(data);
    return names.map((n) => ({ label: n, value: n }));
  } catch {
    return [];
  }
}

/** GET /shifts */
export async function fetchShifts(): Promise<Shift[]> {
  const { data } = await client.get<unknown>("/shifts");
  return unwrapShiftList(data).map((row) =>
    apiRecordToShift(row as Record<string, unknown>),
  );
}

/** POST /shifts */
export async function createShift(shift: Shift): Promise<Shift> {
  const body = shiftToApiBody(shift);
  const { data } = await client.post<ShiftApiRecord>("/shifts", body);
  return apiRecordToShift(data as Record<string, unknown>);
}

/** PUT /shifts/:id */
export async function updateShift(shift: Shift): Promise<Shift> {
  const body = shiftToApiBody(shift);
  const { data } = await client.put<ShiftApiRecord>(
    `/shifts/${shift.id}`,
    body,
  );
  return apiRecordToShift(data as Record<string, unknown>);
}

/** DELETE /shifts/:id */
export async function deleteShift(id: string): Promise<void> {
  await client.delete(`/shifts/${id}`);
}

export type ShiftLocationGateResponse = {
  allowed: boolean;
  distanceMeters?: number;
};

function parseLocationGateResponse(data: unknown): ShiftLocationGateResponse {
  const d = data as {
    inside_geofence: boolean;
    distance_meters: number;
  };

  const allowed = Boolean(d.inside_geofence);
  const distanceMeters = d.distance_meters;
  console.log("allowed", allowed);
  console.log("distanceMeters", distanceMeters);
  return { allowed, distanceMeters };
}

type ShiftLocationGateApi = {
  inside_geofence: boolean;
  distance_meters: number;
};

type ApiEnvelope<T> = { data: T };

export async function postShiftCheckLocation(
  latitude: number,
  longitude: number,
): Promise<ShiftLocationGateResponse> {
  const { data } = await client.post<ApiEnvelope<ShiftLocationGateApi>>(
    "/shifts/check-location",
    {
      user_latitude: latitude,
      user_longitude: longitude,
      location_id: SHIFT_CREATE_UPDATE_LOCATION_ID,
    },
  );

  return parseLocationGateResponse(data.data);
}

export function runSilentHealthCheck(): void {
  void client.get("/health", { timeout: 5000 }).catch(() => undefined);
}
