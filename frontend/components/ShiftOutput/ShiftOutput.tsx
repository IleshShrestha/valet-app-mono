import { Shift } from "../../types";
import ShiftListScreen from "./ShiftList";
import type { ComponentProps, ReactElement } from "react";
import { RefreshControl, View, StyleSheet } from "react-native";
import Button from "../UI/Button";
import { GlobalStyles } from "../../constants/style";

export default function ShiftOutput({
    shifts,
    periodChangeHandler,
    period,
    refreshControl,
}: {
    shifts: Shift[];
    periodChangeHandler: (period: number) => void;
    period: number;
    refreshControl?: ReactElement<ComponentProps<typeof RefreshControl>>;
}) {
    return (
        <View style={styles.flex}>
            <View style={styles.buttonsContainer}>
                <Button title="Today" onPress={() => periodChangeHandler(1)} mode={period === 1 ? "filled" : "flat"} />
                <Button title="7 Days" onPress={() => periodChangeHandler(7)} mode={period === 7 ? "filled" : "flat"} />
                <Button title="30 Days" onPress={() => periodChangeHandler(30)} mode={period === 30 ? "filled" : "flat"} />
            </View>
            <ShiftListScreen shifts={shifts} refreshControl={refreshControl} />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: 16,
        backgroundColor: GlobalStyles.colors.maroon50,
        padding: 16,
        borderRadius: 10,
        marginVertical: 8,

    },
    selectedButton: {
        backgroundColor: GlobalStyles.colors.maroon600,
        color: GlobalStyles.colors.foreground,
    },
});