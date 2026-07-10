import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import ServiceDayCard from "../components/ServiceDayOutput/ServiceDayCard";
import { useServiceDays } from "../store/ServiceDayContext";
import { GlobalStyles } from "../constants/style";
import type { ServiceDay } from "../types/serviceDay";

export default function ServiceDayList() {
    const { serviceDays, isLoading, error, refresh } = useServiceDays();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }, [refresh]);

    if (isLoading && serviceDays.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={GlobalStyles.colors.maroon600} />
            </View>
        );
    }

    return (
        <View style={styles.flex}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <FlatList
                data={serviceDays}
                keyExtractor={(item: ServiceDay) => item.id}
                renderItem={({ item }) => <ServiceDayCard day={item} />}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlobalStyles.colors.maroon600} />
                }
                contentContainerStyle={serviceDays.length === 0 ? styles.emptyContainer : undefined}
                ListEmptyComponent={<Text style={styles.emptyText}>No service days yet.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { color: GlobalStyles.colors.maroon600, padding: 12, textAlign: "center" },
    emptyContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
    emptyText: { color: GlobalStyles.colors.foreground, opacity: 0.6 },
});
