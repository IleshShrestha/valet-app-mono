import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { MultiSelect } from "react-native-element-dropdown";
import { format } from "date-fns";
import { fetchInvoiceServiceDays, previewInvoice } from "../util/invoicesApi";
import type { ServiceDay } from "../types/serviceDay";
import type { Invoice } from "../types/billing";
import InvoiceTable from "../components/Invoice/InvoiceTable";
import { GlobalStyles } from "../constants/style";

function workerCount(day: ServiceDay): number {
    return day.segments.reduce((sum, seg) => sum + seg.assignedUsers.length, 0);
}

export default function Invoicing() {
    const [days, setDays] = useState<ServiceDay[]>([]);
    const [loadingDays, setLoadingDays] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchInvoiceServiceDays()
            .then((d) => {
                if (!cancelled) setDays(d);
            })
            .catch(() => {
                if (!cancelled) setError("Could not load completed service days.");
            })
            .finally(() => {
                if (!cancelled) setLoadingDays(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const options = useMemo(
        () =>
            days.map((d) => ({
                label: `${d.locationName || "—"} · ${format(d.date, "MMM d")} · ${workerCount(d)} ppl${
                    d.segments.length > 1 ? ` · ${d.segments.length} seg` : ""
                }`,
                value: d.id,
            })),
        [days],
    );

    useEffect(() => {
        if (selectedIds.length === 0) {
            setInvoice(null);
            return;
        }
        let cancelled = false;
        setCalculating(true);
        setError(null);
        previewInvoice(selectedIds)
            .then((inv) => {
                if (!cancelled) setInvoice(inv);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Could not calculate invoice.");
            })
            .finally(() => {
                if (!cancelled) setCalculating(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedIds]);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Invoicing</Text>
            <Text style={styles.subheading}>Select completed service days from the last 2 weeks to build an invoice.</Text>

            {loadingDays ? (
                <ActivityIndicator color={GlobalStyles.colors.maroon600} style={styles.loader} />
            ) : days.length === 0 ? (
                <Text style={styles.empty}>No completed service days in the last 2 weeks.</Text>
            ) : (
                <MultiSelect
                    style={styles.dropdown}
                    containerStyle={styles.menu}
                    placeholderStyle={styles.placeholder}
                    selectedTextStyle={styles.selectedText}
                    itemTextStyle={styles.itemText}
                    inputSearchStyle={styles.searchInput}
                    activeColor={GlobalStyles.colors.maroon50}
                    data={options}
                    labelField="label"
                    valueField="value"
                    value={selectedIds}
                    onChange={setSelectedIds}
                    placeholder="Select service days"
                    search
                    searchPlaceholder="Filter…"
                    selectedStyle={styles.chip}
                />
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {calculating ? (
                <ActivityIndicator color={GlobalStyles.colors.maroon600} style={styles.loader} />
            ) : invoice && invoice.lines.length > 0 ? (
                <InvoiceTable invoice={invoice} />
            ) : selectedIds.length > 0 && !error ? (
                <Text style={styles.empty}>No priced lines.</Text>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: GlobalStyles.colors.background },
    content: { padding: 16, paddingBottom: 40 },
    heading: { fontSize: 20, fontWeight: "700", color: GlobalStyles.colors.foreground },
    subheading: { fontSize: 14, color: GlobalStyles.colors.foreground, opacity: 0.7, marginTop: 4, marginBottom: 16 },
    loader: { marginVertical: 20 },
    empty: { marginTop: 16, color: GlobalStyles.colors.foreground, opacity: 0.6 },
    error: { marginTop: 12, color: GlobalStyles.colors.maroon600 },
    dropdown: {
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.inputBackground,
    },
    menu: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.background,
        marginTop: 6,
    },
    placeholder: { fontSize: 16, color: GlobalStyles.colors.foreground + "80" },
    selectedText: { fontSize: 14, color: GlobalStyles.colors.foreground },
    itemText: { fontSize: 15, color: GlobalStyles.colors.foreground },
    searchInput: {
        fontSize: 15,
        color: GlobalStyles.colors.foreground,
        borderRadius: 8,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.inputBackground,
    },
    chip: {
        borderRadius: 16,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.maroon100,
    },
});
