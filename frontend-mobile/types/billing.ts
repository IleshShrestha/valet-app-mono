export type BillingType = "hourly_per_person" | "flat_per_shift";

export interface LocationBilling {
    billingType: BillingType;
    hourlyRate: number | null;
    singleShiftRate: number | null;
    doubleShiftRate: number | null;
    holidayMultiplier: number | null;
    holidayFlatBonus: number | null;
    usesHolidayPay: boolean;
}

export interface Location extends LocationBilling {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

/** One computed row of an invoice (matches the backend billing package). */
export interface InvoiceSegmentLine {
    workers: number;
    hours: number;
    subtotal: number;
}

export interface InvoiceLine {
    date: string;
    locationName: string;
    workers: number;
    hours: number;
    billingType: string;
    rateLabel: string;
    holidayApplied: boolean;
    holidayLabel: string;
    segments: InvoiceSegmentLine[];
    subtotal: number;
    subtotalLabel: string;
    warnings: string[];
}

export interface Invoice {
    lines: InvoiceLine[];
    total: number;
    totalLabel: string;
    unpricedCount: number;
}
