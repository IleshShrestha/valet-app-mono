import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Invoice } from "../../types/billing";
import { GlobalStyles } from "../../constants/style";

/** "2025-06-17" -> "6/17/2025" (avoids timezone shifts). */
function formatDate(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
    if (!m) return iso;
    return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
}

const COLS = {
    workers: 70,
    date: 92,
    location: 130,
    rate: 150,
    hours: 60,
    holiday: 120,
    total: 96,
} as const;

const LABEL_WIDTH = COLS.workers + COLS.date + COLS.location + COLS.rate + COLS.hours + COLS.holiday;

export default function InvoiceTable({ invoice }: { invoice: Invoice }) {
    return (
        <View style={styles.wrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                    <View style={[styles.row, styles.headerRow]}>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.workers, textAlign: "center" }]}># People</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.date }]}>Date</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.location }]}>Location</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.rate }]}>Rate</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.hours, textAlign: "center" }]}>Hours</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.holiday }]}>Holiday</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: COLS.total, textAlign: "right" }]}>Total</Text>
                    </View>

                    {invoice.lines.map((line, i) => {
                        const unpriced = line.warnings.length > 0 && line.subtotal === 0;
                        return (
                            <View key={i}>
                                <View style={[styles.row, unpriced && styles.unpricedRow]}>
                                    <Text style={[styles.cell, { width: COLS.workers, textAlign: "center" }]}>{line.workers}</Text>
                                    <Text style={[styles.cell, { width: COLS.date }]}>{formatDate(line.date)}</Text>
                                    <Text style={[styles.cell, { width: COLS.location }]} numberOfLines={1}>{line.locationName || "—"}</Text>
                                    <Text style={[styles.cell, { width: COLS.rate }]} numberOfLines={1}>{line.rateLabel || "—"}</Text>
                                    <Text style={[styles.cell, { width: COLS.hours, textAlign: "center" }]}>{line.hours}</Text>
                                    <Text style={[styles.cell, { width: COLS.holiday }]} numberOfLines={1}>{line.holidayLabel || "No"}</Text>
                                    <Text style={[styles.cell, styles.totalCell, { width: COLS.total, textAlign: "right" }]}>
                                        {line.subtotalLabel || "$0.00"}
                                    </Text>
                                </View>
                                {line.warnings.map((w, wi) => (
                                    <Text key={wi} style={styles.warning}>⚠ {w}</Text>
                                ))}
                            </View>
                        );
                    })}

                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={[styles.cell, styles.finalLabel, { width: LABEL_WIDTH }]}>Final Total</Text>
                        <Text style={[styles.cell, styles.finalValue, { width: COLS.total, textAlign: "right" }]}>{invoice.totalLabel}</Text>
                    </View>
                </View>
            </ScrollView>

            {invoice.unpricedCount > 0 ? (
                <Text style={styles.unpricedNote}>
                    {invoice.unpricedCount} line{invoice.unpricedCount === 1 ? "" : "s"} couldn't be priced — configure the
                    location's billing rates.
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { marginTop: 8 },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: GlobalStyles.colors.border,
    },
    headerRow: {
        backgroundColor: GlobalStyles.colors.maroon600,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    cell: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 13,
        color: GlobalStyles.colors.foreground,
    },
    headerCell: {
        color: GlobalStyles.colors.background,
        fontWeight: "700",
    },
    totalCell: { fontWeight: "600" },
    unpricedRow: { backgroundColor: GlobalStyles.colors.maroon50 },
    warning: {
        fontSize: 12,
        color: GlobalStyles.colors.maroon600,
        paddingHorizontal: 8,
        paddingBottom: 6,
    },
    totalRow: {
        backgroundColor: GlobalStyles.colors.maroon100,
        borderBottomWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    finalLabel: { fontWeight: "700", color: GlobalStyles.colors.maroon900, textAlign: "right" },
    finalValue: { fontWeight: "800", color: GlobalStyles.colors.maroon900 },
    unpricedNote: {
        marginTop: 8,
        fontSize: 13,
        color: GlobalStyles.colors.maroon600,
    },
});
