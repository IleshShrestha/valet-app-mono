import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { RootStackParamList } from "../types";
import { GlobalStyles } from "../constants/style";
import Button from "../components/UI/Button";
import IconButton from "../components/UI/IconButton";
import ServiceDayForm, { type SegmentFormValue } from "../components/ServiceDayForm/ServiceDayForm";
import { useServiceDays } from "../store/ServiceDayContext";
import type { ServiceDayDraft } from "../util/serviceDaysApi";
import { fetchUserPickerOptions } from "../util/usersApi";
import { fetchLocationPickerOptions } from "../util/locationsApi";
import type { PickerOption } from "../types/picker";
import type { ServiceDayStatus } from "../types/serviceDay";
import { parseTimeStringToDate } from "../util/Date";
import { useAuth } from "../store/Authcontext";
import { isAdmin } from "../auth/permissions";

let segmentCounter = 0;
function newSegment(): SegmentFormValue {
    const now = new Date();
    segmentCounter += 1;
    return { key: `seg-${segmentCounter}-${Date.now()}`, name: "", startTime: now, endTime: now, assignedUserIds: [] };
}

const STATUS_LABEL: Record<ServiceDayStatus, string> = {
    scheduled: "Scheduled",
    in_review: "In review",
    completed: "Completed",
    cancelled: "Cancelled",
};

export default function ServiceDayDetails({
    route,
    navigation,
}: {
    route: RouteProp<RootStackParamList, "ServiceDayDetails">;
    navigation: NativeStackNavigationProp<RootStackParamList>;
}) {
    const serviceDayId = route.params?.serviceDayId;
    const isEditing = !!serviceDayId;
    const { user } = useAuth();
    const editable = isAdmin(user);
    const { serviceDays, addServiceDay, updateServiceDay, removeServiceDay, setStatus } = useServiceDays();

    const [title, setTitle] = useState("");
    const [date, setDate] = useState(new Date());
    const [locationId, setLocationId] = useState("");
    const [isHoliday, setIsHoliday] = useState(false);
    const [holidayName, setHolidayName] = useState("");
    const [status, setStatusState] = useState<ServiceDayStatus>("scheduled");
    const [segments, setSegments] = useState<SegmentFormValue[]>([newSegment()]);

    const [userOptions, setUserOptions] = useState<PickerOption[]>([]);
    const [locationOptions, setLocationOptions] = useState<PickerOption[]>([]);
    const [locationOptionsReady, setLocationOptionsReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const hydratedFor = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([fetchUserPickerOptions(), fetchLocationPickerOptions()]).then(([users, locations]) => {
            if (cancelled) return;
            setUserOptions(users);
            setLocationOptions(locations);
            setLocationOptionsReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!serviceDayId) return;
        if (hydratedFor.current === serviceDayId) return;
        const day = serviceDays.find((d) => d.id === serviceDayId);
        if (!day) return;

        setTitle(day.title);
        setDate(day.date);
        setLocationId(day.locationId);
        setIsHoliday(day.isHoliday);
        setHolidayName(day.holidayName);
        setStatusState(day.status);
        setSegments(
            day.segments.length > 0
                ? day.segments.map((seg) => ({
                      key: `existing-${seg.id}`,
                      name: seg.name,
                      startTime: parseTimeStringToDate(seg.startTime),
                      endTime: parseTimeStringToDate(seg.endTime),
                      assignedUserIds: seg.assignedUsers.map((u) => String(u.id)),
                  }))
                : [newSegment()],
        );
        hydratedFor.current = serviceDayId;
    }, [serviceDayId, serviceDays]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: !editable ? "Service Day" : isEditing ? "Edit Service Day" : "Add Service Day",
        });
    }, [navigation, isEditing, editable]);

    function changeSegment(index: number, patch: Partial<SegmentFormValue>) {
        setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    }
    function addSegment() {
        setSegments((prev) => [...prev, newSegment()]);
    }
    function removeSegment(index: number) {
        setSegments((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    }
    function addSegmentUser(index: number, userId: string) {
        setSegments((prev) =>
            prev.map((s, i) =>
                i === index && !s.assignedUserIds.includes(userId)
                    ? { ...s, assignedUserIds: [...s.assignedUserIds, userId] }
                    : s,
            ),
        );
    }
    function removeSegmentUser(index: number, userId: string) {
        setSegments((prev) =>
            prev.map((s, i) => (i === index ? { ...s, assignedUserIds: s.assignedUserIds.filter((id) => id !== userId) } : s)),
        );
    }

    function buildDraft(): ServiceDayDraft {
        return {
            title: title.trim(),
            date,
            locationId: Number(locationId),
            isHoliday,
            holidayName: isHoliday ? holidayName.trim() : "",
            segments: segments.map((s) => ({
                name: s.name.trim(),
                startTime: format(s.startTime, "HH:mm"),
                endTime: format(s.endTime, "HH:mm"),
                assignedUserIds: s.assignedUserIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
            })),
        };
    }

    async function save() {
        if (!editable) return;
        if (!title.trim()) {
            Alert.alert("Missing title", "Enter a title for the service day.");
            return;
        }
        const parsedLocation = Number(locationId);
        if (!Number.isFinite(parsedLocation) || parsedLocation <= 0) {
            Alert.alert("Missing location", "Select a location.");
            return;
        }
        if (segments.length === 0) {
            Alert.alert("Missing segments", "Add at least one segment.");
            return;
        }
        try {
            setSaving(true);
            const draft = buildDraft();
            if (isEditing) {
                await updateServiceDay(serviceDayId!, draft);
            } else {
                await addServiceDay(draft);
            }
            navigation.goBack();
        } catch (e) {
            Alert.alert("Could not save", e instanceof Error ? e.message : "Unknown error");
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!editable || !isEditing) return;
        try {
            await removeServiceDay(serviceDayId!);
            navigation.goBack();
        } catch (e) {
            Alert.alert("Could not delete", e instanceof Error ? e.message : "Unknown error");
        }
    }

    async function markCompleted() {
        try {
            await setStatus(serviceDayId!, "completed");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Could not update status", e instanceof Error ? e.message : "Unknown error");
        }
    }

    const canMarkCompleted = editable && isEditing && (status === "in_review" || status === "scheduled");

    return (
        <View style={styles.container}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
                {isEditing ? (
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Status</Text>
                        <Text style={styles.statusValue}>{STATUS_LABEL[status]}</Text>
                    </View>
                ) : null}
                <ServiceDayForm
                    title={title}
                    onChangeTitle={setTitle}
                    date={date}
                    onChangeDate={setDate}
                    locationId={locationId}
                    onChangeLocation={setLocationId}
                    locationOptions={locationOptions}
                    locationOptionsReady={locationOptionsReady}
                    isHoliday={isHoliday}
                    onChangeIsHoliday={setIsHoliday}
                    holidayName={holidayName}
                    onChangeHolidayName={setHolidayName}
                    segments={segments}
                    userOptions={userOptions}
                    onAddSegment={addSegment}
                    onRemoveSegment={removeSegment}
                    onChangeSegment={changeSegment}
                    onAddSegmentUser={addSegmentUser}
                    onRemoveSegmentUser={removeSegmentUser}
                    editable={editable}
                />
            </ScrollView>

            <View style={styles.actions}>
                <Button title={editable ? "Cancel" : "Close"} onPress={() => navigation.goBack()} mode="flat" style={styles.actionBtn} />
                {editable ? (
                    <Button
                        title={saving ? "Saving…" : isEditing ? "Update" : "Add"}
                        onPress={save}
                        mode="filled"
                        style={styles.actionBtn}
                    />
                ) : null}
            </View>

            {canMarkCompleted ? (
                <View style={styles.completeRow}>
                    <Button title="Mark completed" onPress={markCompleted} mode="filled" style={styles.completeBtn} />
                </View>
            ) : null}

            {isEditing && editable ? (
                <View style={styles.deleteRow}>
                    <IconButton icon="trash" size={24} color={GlobalStyles.colors.maroon600} onPress={remove} />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GlobalStyles.colors.background },
    scroll: { paddingBottom: 24 },
    statusRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    statusLabel: { fontSize: 13, color: GlobalStyles.colors.maroon600, fontWeight: "700" },
    statusValue: { fontSize: 14, color: GlobalStyles.colors.foreground },
    actions: { flexDirection: "row", justifyContent: "center", gap: 16, paddingTop: 8 },
    actionBtn: { minWidth: 120 },
    completeRow: { alignItems: "center", marginTop: 12 },
    completeBtn: { minWidth: 180 },
    deleteRow: {
        marginTop: 12,
        paddingTop: 8,
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: GlobalStyles.colors.border,
    },
});
