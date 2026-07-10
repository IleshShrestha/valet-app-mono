import type { AssignedUser } from "../types";

export type ServiceDayStatus = "scheduled" | "in_review" | "completed" | "cancelled";

/** One worked block within a service day (e.g. morning or evening). */
export interface ShiftSegment {
    id: number;
    name: string;
    /** HH:mm */
    startTime: string;
    /** HH:mm */
    endTime: string;
    hours: number;
    assignedUsers: AssignedUser[];
}

/** One billable engagement at one location on one date. */
export interface ServiceDay {
    id: string;
    title: string;
    locationId: string;
    locationName: string;
    date: Date;
    isHoliday: boolean;
    holidayName: string;
    status: ServiceDayStatus;
    segments: ShiftSegment[];
}

/** UI draft for a segment before it is sent to the API. */
export interface SegmentDraft {
    name: string;
    startTime: string;
    endTime: string;
    assignedUserIds: number[];
}
