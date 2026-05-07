import { Text, View, StyleSheet, Pressable } from "react-native";
import { format } from "date-fns/format";
import type { Shift } from "../../types";
import { GlobalStyles } from "../../constants/style";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";

function to12HourTime(value: string) {
    // Expects "HH:mm" (24h). If not parseable, return original.
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!match) return value;
    const hours24 = Number(match[1]);
    const minutes = match[2];
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${minutes} ${suffix}`;
}

export default function ShiftCard({ shift }: { shift: Shift }) {
    const shiftDate = new Date(shift.date);
    const formattedDate = format(shiftDate, 'EEE, MMM d, yyyy');
    const formattedDateShort = format(shiftDate, 'MMM d');
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    function shiftPressHandler() {
        navigation.navigate("ShiftDetails", { shiftId: shift.id });
    }
    function getAssignmentStatus(user: Shift["assignedUsers"][number]): string {
        if (user.checkOutTime) return "Completed";
        if (user.checkInTime) return "Checked in";
        return "Assigned";
    }

    return (
        <Pressable onPress={shiftPressHandler} style={({ pressed }) => pressed && styles.pressed}>
            <View style={styles.shiftCard}>


                <View style={styles.shiftTitleContainer}>
                    <Text style={styles.shiftTitle}>{shift.title}</Text>
                    <Text style={styles.shiftDate}>{formattedDateShort}</Text>
                </View>
                <Text><MaterialCommunityIcons name="calendar-month" size={16} color={GlobalStyles.colors.maroon600} /> {formattedDate}</Text>
                <Text><MaterialCommunityIcons name="clock-outline" size={16} color={GlobalStyles.colors.maroon600} /> {to12HourTime(shift.timeStart)} - {to12HourTime(shift.timeEnd)}</Text>
                <Text><MaterialCommunityIcons name="map-marker" size={16} color={GlobalStyles.colors.maroon600} /> {shift.location}</Text>
                <View style={styles.teamBlock}>
                    <Text style={styles.teamLabel}>Assigned</Text>
                    {shift.assignedUsers.length > 0 ? shift.assignedUsers.map((member) => {
                        const fullName = `${member.firstName} ${member.lastName}`.trim() || member.email;
                        return (
                            <Text key={member.id} style={styles.teamName}>• {fullName} — {getAssignmentStatus(member)}</Text>
                        );
                    }) : <Text style={styles.teamName}>No users assigned</Text>}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    shiftCard: {
        backgroundColor: GlobalStyles.colors.background,
        borderRadius: 10,
        padding: 16,
        margin: 16,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        borderLeftWidth: 6,
        borderLeftColor: GlobalStyles.colors.maroon600,
        display: 'flex',
        gap: 8,


    },
    shiftTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: GlobalStyles.colors.foreground,
    },
    shiftTitleContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    shiftDate: {
        fontSize: 14,
        backgroundColor: GlobalStyles.colors.maroon100,
        color: GlobalStyles.colors.maroon900,
        fontWeight: 'semibold',
        borderRadius: 10,
        padding: 4,

    },
    pressed: {
        opacity: 0.75,
    },
    teamBlock: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: GlobalStyles.colors.border,
        gap: 4,
    },
    teamLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: GlobalStyles.colors.maroon600,
        marginBottom: 2,
    },
    teamName: {
        fontSize: 14,
        color: GlobalStyles.colors.foreground,
    },
});
