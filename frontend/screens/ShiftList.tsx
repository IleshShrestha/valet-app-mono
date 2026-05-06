import ShiftOutput from "../components/ShiftOutput/ShiftOutput";
import { useCallback, useContext, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ShiftContext } from "../store/ShiftContext";
import { getDateMinusDays } from "../util/Date";
import { GlobalStyles } from "../constants/style";

export default function ShiftList() {
    const [period, setPeriod] = useState(7);
    const [refreshing, setRefreshing] = useState(false);

    function periodChangeHandler(period: number) {
        setPeriod(period);
    }

    const shiftsContext = useContext(ShiftContext);
    const shifts = shiftsContext.shifts;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await shiftsContext.refreshShifts();
        setRefreshing(false);
    }, [shiftsContext]);

    const recentShifts = shifts.filter((shift) => {
        const today = new Date();
        const daysAgo = getDateMinusDays(today, period);
        return shift.date >= daysAgo;
    });

    if (shiftsContext.isLoading && shifts.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={GlobalStyles.colors.maroon600} />
            </View>
        );
    }

    return (
        <View style={styles.flex}>
            {shiftsContext.error ? (
                <Text style={styles.errorText}>{shiftsContext.error}</Text>
            ) : null}
            <ShiftOutput
                shifts={recentShifts}
                periodChangeHandler={periodChangeHandler}
                period={period}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={GlobalStyles.colors.maroon600}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: GlobalStyles.colors.maroon600,
        padding: 12,
        textAlign: "center",
    },
});
