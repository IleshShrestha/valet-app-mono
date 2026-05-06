import { Pressable, StyleSheet, Text, View } from "react-native";
import Input from "./Input";
import { GlobalStyles } from "../../constants/style";
import DateTimePicker from "../UI/DateTimePicker";
import FormField from "../UI/FormField";
import ModalSelect from "../UI/ModalSelect";
import type { LocationPickerOption, UserPickerOption } from "../../util/shiftsApi";

export type ShiftFormProps = {
    title: string;
    date: Date;
    timeStart: Date;
    timeEnd: Date;
    location: string;
    locationOptions: LocationPickerOption[];
    locationOptionsReady?: boolean;
    selectedUserNames: string[];
    userOptions: UserPickerOption[];
    onChangeTitle: (value: string) => void;
    onChangeDate: (value: Date) => void;
    onChangeTimeStart: (value: Date) => void;
    onChangeTimeEnd: (value: Date) => void;
    onChangeLocation: (value: string) => void;
    onAddUserName: (memberName: string) => void;
    onRemoveUserName: (memberName: string) => void;
};

export default function ShiftForm({
    title,
    date,
    timeStart,
    timeEnd,
    location,
    locationOptions,
    locationOptionsReady = true,
    selectedUserNames,
    userOptions,
    onChangeTitle,
    onChangeDate,
    onChangeTimeStart,
    onChangeTimeEnd,
    onChangeLocation,
    onAddUserName,
    onRemoveUserName,
}: ShiftFormProps) {
    const addOptions = userOptions.filter(
        (o) => !selectedUserNames.includes(o.value),
    );

    return (
        <View style={styles.container}>
            <FormField label="Shift Title">
                <Input
                    textInputConfig={{
                        keyboardType: "default",
                        placeholder: "Enter a title",
                        value: title,
                        onChangeText: onChangeTitle,
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
            />

            <View style={styles.row}>
                <DateTimePicker
                    label="Start Time"
                    mode="time"
                    display="spinner"
                    value={timeStart}
                    onChange={onChangeTimeStart}
                    modalProps={{ ...modalProps, is24Hour: false, locale: "en_US" }}
                    style={styles.rowItem}
                />
                <DateTimePicker
                    label="End Time"
                    mode="time"
                    display="spinner"
                    value={timeEnd}
                    onChange={onChangeTimeEnd}
                    modalProps={{ ...modalProps, is24Hour: false, locale: "en_US" }}
                    style={styles.rowItem}
                />
            </View>

            <FormField label="Location">
                <ModalSelect
                    value={location}
                    onChange={onChangeLocation}
                    options={locationOptions}
                    placeholder={
                        !locationOptionsReady
                            ? "Loading locations…"
                            : locationOptions.length > 0
                                ? "Select a location"
                                : "No locations available"
                    }
                />
            </FormField>

            <FormField label="Team members">
                {selectedUserNames.length > 0 ? (
                    <View style={styles.chipWrap}>
                        {selectedUserNames.map((memberName) => (
                            <Pressable
                                key={memberName}
                                onPress={() => onRemoveUserName(memberName)}
                                style={styles.chip}
                            >
                                <Text style={styles.chipText} numberOfLines={1}>
                                    {memberName}
                                </Text>
                                <Text style={styles.chipRemove}>×</Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}
                <View style={styles.addUserSelect}>
                    <ModalSelect
                        key={selectedUserNames.join("|")}
                        value=""
                        onChange={(next) => {
                            if (next) onAddUserName(next);
                        }}
                        options={addOptions}
                        placeholder={
                            addOptions.length
                                ? "Add team member…"
                                : "No more members to add"
                        }
                    />
                </View>
            </FormField>
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
    container: {
        padding: 16,
        gap: 14,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    rowItem: {
        flex: 1,
    },
    chipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
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
    chipText: {
        flexShrink: 1,
        fontSize: 14,
        color: GlobalStyles.colors.foreground,
    },
    chipRemove: {
        fontSize: 18,
        color: GlobalStyles.colors.maroon600,
        fontWeight: "600",
    },
    addUserSelect: {
        marginTop: 4,
    },
});
