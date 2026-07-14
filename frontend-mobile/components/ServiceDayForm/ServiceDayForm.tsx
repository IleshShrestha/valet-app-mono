import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Input from "../ShiftForm/Input";
import { GlobalStyles } from "../../constants/style";
import DateTimePicker from "../UI/DateTimePicker";
import FormField from "../UI/FormField";
import ModalSelect from "../UI/ModalSelect";
import Button from "../UI/Button";
import type { PickerOption } from "../../types/picker";

export type SegmentFormValue = {
    key: string;
    name: string;
    startTime: Date;
    endTime: Date;
    assignedUserIds: string[];
};

type ServiceDayFormProps = {
    title: string;
    onChangeTitle: (value: string) => void;
    date: Date;
    onChangeDate: (value: Date) => void;
    locationId: string;
    onChangeLocation: (value: string) => void;
    locationOptions: PickerOption[];
    locationOptionsReady: boolean;
    isHoliday: boolean;
    onChangeIsHoliday: (value: boolean) => void;
    holidayName: string;
    onChangeHolidayName: (value: string) => void;
    segments: SegmentFormValue[];
    userOptions: PickerOption[];
    onAddSegment: () => void;
    onRemoveSegment: (index: number) => void;
    onChangeSegment: (index: number, patch: Partial<SegmentFormValue>) => void;
    onAddSegmentUser: (index: number, userId: string) => void;
    onRemoveSegmentUser: (index: number, userId: string) => void;
    editable?: boolean;
};

export default function ServiceDayForm({
    title,
    onChangeTitle,
    date,
    onChangeDate,
    locationId,
    onChangeLocation,
    locationOptions,
    locationOptionsReady,
    isHoliday,
    onChangeIsHoliday,
    holidayName,
    onChangeHolidayName,
    segments,
    userOptions,
    onAddSegment,
    onRemoveSegment,
    onChangeSegment,
    onAddSegmentUser,
    onRemoveSegmentUser,
    editable = true,
}: ServiceDayFormProps) {
    const labelByUserId = new Map(userOptions.map((option) => [option.value, option.label]));

    return (
        <View style={styles.container}>
            <FormField label="Title">
                <Input
                    textInputConfig={{
                        placeholder: "e.g. Hotel Gala",
                        value: title,
                        onChangeText: onChangeTitle,
                        editable,
                    }}
                />
            </FormField>

            <DateTimePicker
                label="Date"
                mode="date"
                display="spinner"
                value={date}
                onChange={onChangeDate}
                modalProps={modalProps}
                disabled={!editable}
            />

            <FormField label="Location">
                <ModalSelect
                    value={locationId}
                    onChange={onChangeLocation}
                    options={locationOptions}
                    disabled={!editable}
                    placeholder={
                        !locationOptionsReady
                            ? "Loading locations…"
                            : locationOptions.length > 0
                                ? "Select a location"
                                : "No locations available"
                    }
                />
            </FormField>

            <View style={styles.holidayRow}>
                <Text style={styles.holidayLabel}>Holiday</Text>
                <Switch
                    value={isHoliday}
                    onValueChange={onChangeIsHoliday}
                    disabled={!editable}
                    trackColor={{ true: GlobalStyles.colors.maroon600 }}
                />
            </View>
            {isHoliday ? (
                <FormField label="Holiday name (optional)">
                    <Input
                        textInputConfig={{
                            placeholder: "e.g. New Year's Eve",
                            value: holidayName,
                            onChangeText: onChangeHolidayName,
                            editable,
                        }}
                    />
                </FormField>
            ) : null}

            <View style={styles.segmentsHeader}>
                <Text style={styles.sectionTitle}>Segments</Text>
                <Text style={styles.sectionHint}>
                    {segments.length === 1 ? "Single shift" : `${segments.length} segments (double/multi)`}
                </Text>
            </View>

            {segments.map((segment, index) => {
                const addOptions = userOptions.filter((o) => !segment.assignedUserIds.includes(o.value));
                return (
                    <View key={segment.key} style={styles.segmentCard}>
                        <View style={styles.segmentTop}>
                            <Text style={styles.segmentIndex}>Segment {index + 1}</Text>
                            {editable && segments.length > 1 ? (
                                <Pressable onPress={() => onRemoveSegment(index)} hitSlop={8}>
                                    <Text style={styles.removeSegment}>Remove</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        <FormField label="Segment name (blank = auto morning/evening)">
                            <Input
                                textInputConfig={{
                                    placeholder: "morning / evening",
                                    value: segment.name,
                                    onChangeText: (v) => onChangeSegment(index, { name: v }),
                                    editable,
                                }}
                            />
                        </FormField>

                        <View style={styles.row}>
                            <DateTimePicker
                                label="Start"
                                mode="time"
                                display="spinner"
                                value={segment.startTime}
                                onChange={(v) => onChangeSegment(index, { startTime: v })}
                                modalProps={{ ...modalProps, is24Hour: false, locale: "en_US" }}
                                style={styles.rowItem}
                                disabled={!editable}
                            />
                            <DateTimePicker
                                label="End"
                                mode="time"
                                display="spinner"
                                value={segment.endTime}
                                onChange={(v) => onChangeSegment(index, { endTime: v })}
                                modalProps={{ ...modalProps, is24Hour: false, locale: "en_US" }}
                                style={styles.rowItem}
                                disabled={!editable}
                            />
                        </View>

                        <FormField label="Workers">
                            {segment.assignedUserIds.length > 0 ? (
                                <View style={styles.chipWrap}>
                                    {segment.assignedUserIds.map((userId) => (
                                        <Pressable
                                            key={userId}
                                            onPress={() => editable && onRemoveSegmentUser(index, userId)}
                                            style={styles.chip}
                                            disabled={!editable}
                                        >
                                            <Text style={styles.chipText} numberOfLines={1}>
                                                {labelByUserId.get(userId) ?? `User ${userId}`}
                                            </Text>
                                            {editable ? <Text style={styles.chipRemove}>×</Text> : null}
                                        </Pressable>
                                    ))}
                                </View>
                            ) : null}
                            {editable ? (
                                <ModalSelect
                                    key={segment.assignedUserIds.join("|")}
                                    value=""
                                    onChange={(next) => {
                                        if (next) onAddSegmentUser(index, next);
                                    }}
                                    options={addOptions}
                                    placeholder={addOptions.length ? "Add worker…" : "No more workers"}
                                />
                            ) : null}
                        </FormField>
                    </View>
                );
            })}

            {editable ? (
                <Button title="+ Add segment" onPress={onAddSegment} mode="flat" style={styles.addSegmentBtn} />
            ) : null}
        </View>
    );
}

const modalProps = {
    themeVariant: "light" as const,
    pickerComponentStyleIOS: {
        height: 250,
        backgroundColor: GlobalStyles.colors.background,
        borderRadius: 10,
        padding: 10,
        margin: 10,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        borderLeftWidth: 6,
        borderLeftColor: GlobalStyles.colors.maroon600,
    },
};

const styles = StyleSheet.create({
    container: { padding: 16, gap: 14 },
    row: { flexDirection: "row", gap: 12 },
    rowItem: { flex: 1 },
    holidayRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    holidayLabel: { fontSize: 16, color: GlobalStyles.colors.foreground, fontWeight: "600" },
    segmentsHeader: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginTop: 8,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: GlobalStyles.colors.foreground },
    sectionHint: { fontSize: 13, color: GlobalStyles.colors.maroon600 },
    segmentCard: {
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        borderLeftWidth: 5,
        borderLeftColor: GlobalStyles.colors.maroon600,
        borderRadius: 10,
        padding: 12,
        gap: 10,
        backgroundColor: GlobalStyles.colors.background,
    },
    segmentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    segmentIndex: { fontSize: 14, fontWeight: "700", color: GlobalStyles.colors.maroon600 },
    removeSegment: { fontSize: 14, color: GlobalStyles.colors.maroon600, fontWeight: "600" },
    addSegmentBtn: { alignSelf: "flex-start" },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: GlobalStyles.colors.maroon100,
        borderRadius: 20,
        paddingVertical: 6,
        paddingLeft: 12,
        paddingRight: 8,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        maxWidth: "100%",
    },
    chipText: { flexShrink: 1, fontSize: 14, color: GlobalStyles.colors.foreground },
    chipRemove: { fontSize: 18, color: GlobalStyles.colors.maroon600, fontWeight: "600" },
});
