import type { AssignedUser } from "../types";
import type { ServiceDay, ServiceDayStatus, ShiftSegment, SegmentDraft } from "../types/serviceDay";
import { apiClient } from "./apiClient";

/** Draft sent to the API when creating/updating a service day. */
export interface ServiceDayDraft {
    title: string;
    date: Date;
    locationId: number;
    isHoliday: boolean;
    holidayName: string;
    segments: SegmentDraft[];
}

type ApiRecord = Record<string, unknown>;

function unwrapData<T>(res: unknown, fallback: T): T {
    if (res && typeof res === "object" && "data" in (res as ApiRecord)) {
        return (res as { data: T }).data;
    }
    if (res == null) return fallback;
    return res as T;
}

function str(r: ApiRecord, ...keys: string[]): string {
    for (const k of keys) {
        const v = r[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/** "12:00:00" or "12:00" -> "12:00" */
function normalizeTimeToHHmm(t: string): string {
    const parts = t.trim().split(":");
    if (parts.length < 2) return t.trim();
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

/** "12:00" -> "12:00:00" (leave HH:MM:SS untouched) */
function hhmmToApiTime(s: string): string {
    const x = s.trim();
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(x)) return x;
    if (/^\d{1,2}:\d{2}$/.test(x)) {
        const [h, m] = x.split(":");
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
    }
    return x;
}

/** Parse "YYYY-MM-DD" as a local date (avoids the UTC-midnight off-by-one). */
function parseLocalDate(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
    if (!m) return new Date();
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseAssignedUsers(value: unknown): AssignedUser[] {
    if (!Array.isArray(value)) return [];
    const out: AssignedUser[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const o = raw as ApiRecord;
        const id = Number(o.id);
        if (!Number.isFinite(id)) continue;
        out.push({
            id,
            firstName: str(o, "first_name", "firstName"),
            lastName: str(o, "last_name", "lastName"),
            email: str(o, "email"),
            role: str(o, "role"),
            checkInTime: (o.check_in_time ?? o.checkInTime ?? null) as string | null,
            checkOutTime: (o.check_out_time ?? o.checkOutTime ?? null) as string | null,
        });
    }
    return out;
}

function apiRecordToSegment(raw: unknown): ShiftSegment {
    const o = (raw ?? {}) as ApiRecord;
    return {
        id: num(o.id),
        name: str(o, "name"),
        startTime: normalizeTimeToHHmm(str(o, "start_time", "startTime") || "00:00:00"),
        endTime: normalizeTimeToHHmm(str(o, "end_time", "endTime") || "00:00:00"),
        hours: num(o.hours),
        assignedUsers: parseAssignedUsers(o.assigned_users ?? o.assignedUsers),
    };
}

export function apiRecordToServiceDay(raw: ApiRecord): ServiceDay {
    const segmentsVal = raw.segments ?? raw.Segments;
    const segments = Array.isArray(segmentsVal) ? segmentsVal.map(apiRecordToSegment) : [];
    const dateStr = str(raw, "date", "service_date");
    return {
        id: String(raw.id ?? ""),
        title: str(raw, "title"),
        locationId: String(raw.location_id ?? raw.locationId ?? ""),
        locationName: str(raw, "location_name", "locationName"),
        date: dateStr ? parseLocalDate(dateStr) : new Date(),
        isHoliday: Boolean(raw.is_holiday ?? raw.isHoliday ?? false),
        holidayName: str(raw, "holiday_name", "holidayName"),
        status: (str(raw, "status") || "scheduled") as ServiceDayStatus,
        segments,
    };
}

function draftToBody(draft: ServiceDayDraft): Record<string, unknown> {
    return {
        title: draft.title,
        date: toDateString(draft.date),
        location_id: draft.locationId,
        is_holiday: draft.isHoliday,
        holiday_name: draft.holidayName,
        segments: draft.segments.map((s) => ({
            name: s.name,
            start_time: hhmmToApiTime(s.startTime),
            end_time: hhmmToApiTime(s.endTime),
            assigned_user_ids: s.assignedUserIds.filter((id) => Number.isFinite(id) && id > 0),
        })),
    };
}

function unwrapList(res: unknown): ServiceDay[] {
    const rows = unwrapData<unknown[]>(res, []);
    return Array.isArray(rows) ? rows.map((r) => apiRecordToServiceDay(r as ApiRecord)) : [];
}

/** GET /service-days */
export async function fetchServiceDays(): Promise<ServiceDay[]> {
    return unwrapList(await apiClient.get<unknown>("/service-days"));
}

/** GET /service-days/:id */
export async function fetchServiceDay(id: string): Promise<ServiceDay> {
    const res = await apiClient.get<unknown>(`/service-days/${id}`);
    return apiRecordToServiceDay(unwrapData<ApiRecord>(res, {}));
}

/** POST /service-days */
export async function createServiceDay(draft: ServiceDayDraft): Promise<ServiceDay> {
    const res = await apiClient.post<unknown>("/service-days", draftToBody(draft));
    return apiRecordToServiceDay(unwrapData<ApiRecord>(res, {}));
}

/** PUT /service-days/:id */
export async function updateServiceDay(id: string, draft: ServiceDayDraft): Promise<ServiceDay> {
    const res = await apiClient.put<unknown>(`/service-days/${id}`, draftToBody(draft));
    return apiRecordToServiceDay(unwrapData<ApiRecord>(res, {}));
}

/** DELETE /service-days/:id */
export async function deleteServiceDay(id: string): Promise<void> {
    await apiClient.delete(`/service-days/${id}`);
}

/** PUT /service-days/:id/status */
export async function updateServiceDayStatus(id: string, status: ServiceDayStatus): Promise<ServiceDay> {
    const res = await apiClient.put<unknown>(`/service-days/${id}/status`, { status });
    return apiRecordToServiceDay(unwrapData<ApiRecord>(res, {}));
}

/** GET /service-days/review — promotes ended days then returns those in review. */
export async function fetchReviewServiceDays(): Promise<ServiceDay[]> {
    return unwrapList(await apiClient.get<unknown>("/service-days/review"));
}

export type LocationGateResponse = { allowed: boolean; distanceMeters?: number };

/** POST /service-days/check-location */
export async function postCheckLocation(
    latitude: number,
    longitude: number,
    locationId: number,
): Promise<LocationGateResponse> {
    const res = await apiClient.post<unknown>("/service-days/check-location", {
        user_latitude: latitude,
        user_longitude: longitude,
        location_id: locationId,
    });
    const d = unwrapData<{ inside_geofence?: boolean; distance_meters?: number }>(res, {});
    return { allowed: Boolean(d.inside_geofence), distanceMeters: d.distance_meters };
}
