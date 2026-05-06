import { View, FlatList, RefreshControl } from "react-native";
import type { ComponentProps, ReactElement } from "react";
import ShiftCard from "./ShiftCard";
import type { Shift } from "../../types";

type RefreshControlEl = ReactElement<ComponentProps<typeof RefreshControl>>;

export default function ShiftListScreen({
    shifts,
    refreshControl,
}: {
    shifts: Shift[];
    refreshControl?: RefreshControlEl;
}) {
    function renderShiftCard({ item }: { item: Shift }) {
        return <ShiftCard shift={item} />;
    }

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={shifts}
                renderItem={renderShiftCard}
                keyExtractor={(item) => item.id}
                refreshControl={refreshControl}
                contentContainerStyle={shifts.length === 0 ? { flexGrow: 1 } : undefined}
            />
        </View>
    );
}