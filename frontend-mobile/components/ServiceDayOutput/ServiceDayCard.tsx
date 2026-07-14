import { Text, View, StyleSheet, Pressable } from "react-native";
import { format } from "date-fns/format";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";
import type { ServiceDay, ServiceDayStatus } from "../../types/serviceDay";
import { GlobalStyles } from "../../constants/style";

const STATUS_LABEL: Record<ServiceDayStatus, string> = {
    scheduled: "Scheduled",
    in_review: "In review",
    completed: "Completed",
    cancelled: "Cancelled",
};

function to12HourTime(value: string) {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(value.trim());
    if (!match) return value;
    const hours24 = Number(match[1]);
    const minutes = match[2];
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${minutes} ${suffix}`;
}

export default function ServiceDayCard({ day }: { day: ServiceDay }) {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const formattedDate = format(day.date, "EEE, MMM d, yyyy");
    const shortDate = format(day.date, "MMM d");

    return (
        <Pressable
            onPress={() => navigation.navigate("ServiceDayDetails", { serviceDayId: day.id })}
            style={({ pressed }) => pressed && styles.pressed}
        >
            <View style={styles.card}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{day.title}</Text>
                    <Text style={styles.dateBadge}>{shortDate}</Text>
                </View>
                <Text>
                    <MaterialCommunityIcons name="calendar-month" size={16} color={GlobalStyles.colors.maroon600} /> {formattedDate}
                </Text>
                <Text>
                    <MaterialCommunityIcons name="map-marker" size={16} color={GlobalStyles.colors.maroon600} /> {day.locationName || "—"}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={styles.statusBadge}>{STATUS_LABEL[day.status]}</Text>
                    {day.isHoliday ? (
                        <Text style={styles.holidayBadge}>Holiday{day.holidayName ? `: ${day.holidayName}` : ""}</Text>
                    ) : null}
                </View>
                <View style={styles.segmentsBlock}>
                    {day.segments.length > 0 ? (
                        day.segments.map((seg) => (
                            <Text key={seg.id} style={styles.segmentLine}>
                                • {seg.name || "segment"} {to12HourTime(seg.startTime)}–{to12HourTime(seg.endTime)} · {seg.assignedUsers.length}{" "}
                                {seg.assignedUsers.length === 1 ? "worker" : "workers"}
                            </Text>
                        ))
                    ) : (
                        <Text style={styles.segmentLine}>No segments</Text>
                    )}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: GlobalStyles.colors.background,
        borderRadius: 10,
        padding: 16,
        margin: 16,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        borderLeftWidth: 6,
        borderLeftColor: GlobalStyles.colors.maroon600,
        gap: 8,
    },
    titleRow: { flexDirection: "row", justifyContent: "space-between" },
    title: { fontSize: 16, fontWeight: "bold", color: GlobalStyles.colors.foreground },
    dateBadge: {
        fontSize: 14,
        backgroundColor: GlobalStyles.colors.maroon100,
        color: GlobalStyles.colors.maroon900,
        borderRadius: 10,
        padding: 4,
    },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statusBadge: {
        fontSize: 12,
        fontWeight: "700",
        color: GlobalStyles.colors.background,
        backgroundColor: GlobalStyles.colors.maroon600,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        overflow: "hidden",
    },
    holidayBadge: {
        fontSize: 12,
        fontWeight: "700",
        color: GlobalStyles.colors.maroon900,
        backgroundColor: GlobalStyles.colors.maroon100,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        overflow: "hidden",
    },
    segmentsBlock: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: GlobalStyles.colors.border,
        gap: 4,
    },
    segmentLine: { fontSize: 14, color: GlobalStyles.colors.foreground },
    pressed: { opacity: 0.75 },
});
