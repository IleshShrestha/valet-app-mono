import { Alert, ScrollView, View } from "react-native";
import type { RootStackParamList } from "../types";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import IconButton from "../components/UI/IconButton";
import { GlobalStyles } from "../constants/style";
import { StyleSheet } from "react-native";
import Button from "../components/UI/Button";
import { ShiftContext } from "../store/ShiftContext";
import ShiftForm from "../components/ShiftForm/ShiftForm";
import { Shift } from "../types";
import { format } from "date-fns";
import { parseTimeStringToDate } from "../util/Date";
import {
    fetchLocationPickerOptions,
    fetchUserPickerOptions,
    postShiftCheckLocation,
    type LocationPickerOption,
    type UserPickerOption,
} from "../util/shiftsApi";
import { getCurrentLocation } from "../util/location";
import axios from "axios";



export default function ShiftDetails({ route, navigation }: { route: RouteProp<RootStackParamList, 'ShiftDetails'>, navigation: NativeStackNavigationProp<RootStackParamList> }) {

    const shiftId = route.params?.shiftId;
    const isEditing = !!shiftId;
    const shiftsContext = useContext(ShiftContext);
    const selectedShiftId = isEditing ? shiftId! : "";


    const now = new Date();
    const [title, setTitle] = useState("");
    const [date, setDate] = useState(now);
    const [timeStart, setTimeStart] = useState(now);
    const [timeEnd, setTimeEnd] = useState(now);
    const [locationId, setLocationId] = useState("");
    const [selectedUserNames, setSelectedUserNames] = useState<string[]>([]);
    const [userOptions, setUserOptions] = useState<UserPickerOption[]>([]);
    const [locationOptions, setLocationOptions] = useState<LocationPickerOption[]>([]);
    const [locationOptionsReady, setLocationOptionsReady] = useState(false);
    const [clockInLoading, setClockInLoading] = useState(false);
    const clockInInFlight = useRef(false);

    const hydratedForShiftId = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetchUserPickerOptions(),
            fetchLocationPickerOptions(),
        ]).then(([users, locations]) => {
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
        if (!shiftId) {
            hydratedForShiftId.current = null;
            return;
        }

        const shift = shiftsContext.shifts.find((s) => s.id === shiftId);
        if (!shift) return;
        if (hydratedForShiftId.current === shiftId) return;

        hydratedForShiftId.current = shiftId;
        setTitle(shift.title);
        setDate(new Date(shift.date));
        setTimeStart(parseTimeStringToDate(shift.timeStart));
        setTimeEnd(parseTimeStringToDate(shift.timeEnd));
        const matchedLocation =
            locationOptions.find((option) => option.value === shift.locationId) ??
            locationOptions.find((option) => option.label === shift.location);
        setLocationId(matchedLocation ? matchedLocation.value : "");
        setSelectedUserNames([...shift.userNames]);
    }, [shiftId, shiftsContext.shifts, locationOptions]);



    function buildShiftForSave(): Shift {

        return {
            id: selectedShiftId,
            title,
            date,
            timeStart: format(timeStart, "HH:mm"),
            timeEnd: format(timeEnd, "HH:mm"),
            locationId,
            location: locationOptions.find((option) => option.value === locationId)?.label ?? "",
            userNames: selectedUserNames,
        };
    }

    function addUserName(memberName: string) {
        const trimmed = memberName.trim();
        if (!trimmed || selectedUserNames.includes(trimmed)) return;
        setSelectedUserNames((prev) => [...prev, trimmed]);
    }

    function removeUserName(memberName: string) {
        setSelectedUserNames((prev) => prev.filter((n) => n !== memberName));
    }

    function handleLocationChange(next: string) {
        setLocationId(next);
    }

    async function deleteShiftHandler() {
        try {
            await shiftsContext.deleteShift(selectedShiftId);
            navigation.goBack();
        } catch (e) {
            Alert.alert(
                "Could not delete shift",
                e instanceof Error ? e.message : "Unknown error",
            );
        }
    }

    async function handleClockIn() {
        if (clockInInFlight.current) return;
        const parsedLocationId = Number(locationId);
        if (!Number.isFinite(parsedLocationId) || parsedLocationId <= 0) {
            Alert.alert("Missing location", "Please select a valid location first.");
            return;
        }
        clockInInFlight.current = true;
        try {
            setClockInLoading(true);
            const coords = await getCurrentLocation();
            const data = await postShiftCheckLocation(
                coords.latitude,
                coords.longitude,
                parsedLocationId,
            );
            const distancePhrase =
                data.distanceMeters !== undefined
                    ? `About ${Math.round(data.distanceMeters)} m from the job site.`
                    : null;
            if (data.allowed) {
                Alert.alert(
                    "Location check",
                    distancePhrase
                        ? `Close enough.\n${distancePhrase}`
                        : "Close enough to the job site.",
                );
            } else {
                Alert.alert(
                    "Location check",
                    distancePhrase
                        ? `Not close enough.\n${distancePhrase}`
                        : "Not close enough to the job site.",
                );
            }
        } catch (e) {
            let message = "Unknown error";
            if (axios.isAxiosError(e)) {
                const d = e.response?.data as { message?: string } | undefined;
                message =
                    (typeof d?.message === "string" && d.message) ||
                    e.message ||
                    message;
            } else if (e instanceof Error) {
                message = e.message;
            }
            Alert.alert("Location check failed", message);
        } finally {
            clockInInFlight.current = false;
            setClockInLoading(false);
        }
    }

    function cancelHandler() {
        navigation.goBack();
    }

    async function saveHandler() {
        const shift = buildShiftForSave();
        const parsedLocationId = Number(locationId);
        if (!Number.isFinite(parsedLocationId) || parsedLocationId <= 0) {
            Alert.alert("Missing location", "Please select a valid location.");
            return;
        }
        try {
            if (isEditing) {
                await shiftsContext.updateShift(shift, parsedLocationId);
            } else {
                await shiftsContext.addShift(shift, parsedLocationId);
            }
            navigation.goBack();
        } catch (e) {
            Alert.alert(
                "Could not save shift",
                e instanceof Error ? e.message : "Unknown error",
            );
        }
    }

    useLayoutEffect(() => {
        navigation.setOptions({
            title: isEditing ? 'Edit Shift' : 'Add Shift',
        });
    }, [navigation, isEditing]);


    return (
        <View style={styles.container}>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
            >
                <ShiftForm
                    title={title}
                    date={date}
                    timeStart={timeStart}
                    timeEnd={timeEnd}
                    location={locationId}
                    locationOptions={locationOptions}
                    locationOptionsReady={locationOptionsReady}
                    selectedUserNames={selectedUserNames}
                    userOptions={userOptions}
                    onChangeTitle={setTitle}
                    onChangeDate={setDate}
                    onChangeTimeStart={setTimeStart}
                    onChangeTimeEnd={setTimeEnd}
                    onChangeLocation={handleLocationChange}
                    onAddUserName={addUserName}
                    onRemoveUserName={removeUserName}
                />
            </ScrollView>
            <View style={styles.buttonsContainer}>
                <Button title="Cancel" onPress={cancelHandler} mode="flat" style={styles.button} />
                <Button
                    title={isEditing ? "Update" : "Add"}
                    onPress={saveHandler}
                    mode="filled"
                    style={styles.button}
                />
            </View>
            <View style={styles.deleteContainer}>
                {isEditing && <IconButton icon="trash" size={24} color={GlobalStyles.colors.maroon600} onPress={deleteShiftHandler} />}
            </View>
            {isEditing ? (
                <View style={styles.clockInContainer}>
                    <Button
                        title={clockInLoading ? "Clocking in…" : "Clock In"}
                        onPress={handleClockIn}
                        mode="filled"
                        style={styles.clockInButton}
                    />
                </View>
            ) : null}
        </View>
    );

}
const styles = StyleSheet.create({
    deleteContainer: {
        marginTop: 16,
        paddingTop: 8,
        borderTopWidth: 2,
        borderTopColor: GlobalStyles.colors.border,
        alignItems: 'center',
    },
    clockInContainer: {
        marginTop: 12,
        alignItems: 'center',
    },
    clockInButton: {
        minWidth: 160,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: GlobalStyles.colors.background,
    },
    scrollContent: {
        paddingBottom: 24,
        flexGrow: 1,
    },
    button: {
        minWidth: 120,
        marginHorizontal: 8,
    },
});
