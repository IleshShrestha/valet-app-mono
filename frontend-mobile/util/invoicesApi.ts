import type { ServiceDay } from "../types/serviceDay";
import type { Invoice, InvoiceLine, InvoiceSegmentLine } from "../types/billing";
import { apiClient } from "./apiClient";
import { apiRecordToServiceDay } from "./serviceDaysApi";

type ApiRecord = Record<string, unknown>;

function unwrapData<T>(res: unknown, fallback: T): T {
    if (res && typeof res === "object" && "data" in (res as ApiRecord)) {
        return (res as { data: T }).data;
    }
    if (res == null) return fallback;
    return res as T;
}

function num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function s(v: unknown): string {
    return typeof v === "string" ? v : "";
}

function mapSegmentLine(raw: unknown): InvoiceSegmentLine {
    const o = (raw ?? {}) as ApiRecord;
    return { workers: num(o.workers), hours: num(o.hours), subtotal: num(o.subtotal) };
}

function mapLine(raw: unknown): InvoiceLine {
    const o = (raw ?? {}) as ApiRecord;
    const warnings = Array.isArray(o.warnings) ? (o.warnings as unknown[]).map(s).filter(Boolean) : [];
    const segments = Array.isArray(o.segments) ? (o.segments as unknown[]).map(mapSegmentLine) : [];
    return {
        date: s(o.date),
        locationName: s(o.location_name),
        workers: num(o.workers),
        hours: num(o.hours),
        billingType: s(o.billing_type),
        rateLabel: s(o.rate_label),
        holidayApplied: Boolean(o.holiday_applied),
        holidayLabel: s(o.holiday_label),
        segments,
        subtotal: num(o.subtotal),
        subtotalLabel: s(o.subtotal_label),
        warnings,
    };
}

function mapInvoice(raw: ApiRecord): Invoice {
    const lines = Array.isArray(raw.lines) ? (raw.lines as unknown[]).map(mapLine) : [];
    return {
        lines,
        total: num(raw.total),
        totalLabel: s(raw.total_label),
        unpricedCount: num(raw.unpriced_count),
    };
}

/** GET /invoices/service-days — completed days from the last 2 weeks. */
export async function fetchInvoiceServiceDays(): Promise<ServiceDay[]> {
    const rows = unwrapData<unknown[]>(await apiClient.get<unknown>("/invoices/service-days"), []);
    return Array.isArray(rows) ? rows.map((r) => apiRecordToServiceDay(r as ApiRecord)) : [];
}

/** POST /invoices/preview */
export async function previewInvoice(serviceDayIds: Array<string | number>): Promise<Invoice> {
    const ids = serviceDayIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
    const res = await apiClient.post<unknown>("/invoices/preview", { service_day_ids: ids });
    return mapInvoice(unwrapData<ApiRecord>(res, {}));
}
