import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { GlobalStyles } from "../constants/style";
import FormField from "../components/UI/FormField";
import Input from "../components/ShiftForm/Input";
import ModalSelect from "../components/UI/ModalSelect";
import Button from "../components/UI/Button";
import type { BillingType, Location, LocationBilling as LocationBillingConfig } from "../types/billing";
import { fetchLocations, updateLocationBilling } from "../util/locationsApi";

function numToStr(n: number | null): string {
    return n == null ? "" : String(n);
}

function strToNum(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

export default function LocationBilling() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState("");
    const [saving, setSaving] = useState(false);

    const [billingType, setBillingType] = useState<BillingType>("hourly_per_person");
    const [hourlyRate, setHourlyRate] = useState("");
    const [singleRate, setSingleRate] = useState("");
    const [doubleRate, setDoubleRate] = useState("");
    const [usesHolidayPay, setUsesHolidayPay] = useState(false);
    const [holidayMultiplier, setHolidayMultiplier] = useState("");
    const [holidayFlatBonus, setHolidayFlatBonus] = useState("");

    useEffect(() => {
        let cancelled = false;
        fetchLocations()
            .then((locs) => {
                if (!cancelled) setLocations(locs);
            })
            .catch(() => {
                if (!cancelled) Alert.alert("Could not load", "Failed to load locations.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const options = useMemo(() => locations.map((l) => ({ label: l.name, value: l.id })), [locations]);

    function selectLocation(id: string) {
        setSelectedId(id);
        const loc = locations.find((l) => l.id === id);
        if (!loc) return;
        setBillingType(loc.billingType);
        setHourlyRate(numToStr(loc.hourlyRate));
        setSingleRate(numToStr(loc.singleShiftRate));
        setDoubleRate(numToStr(loc.doubleShiftRate));
        setUsesHolidayPay(loc.usesHolidayPay);
        setHolidayMultiplier(numToStr(loc.holidayMultiplier));
        setHolidayFlatBonus(numToStr(loc.holidayFlatBonus));
    }

    async function save() {
        if (!selectedId) {
            Alert.alert("Select a location", "Pick a location to configure.");
            return;
        }
        const hourly = strToNum(hourlyRate);
        const single = strToNum(singleRate);
        const dbl = strToNum(doubleRate);
        const mult = strToNum(holidayMultiplier);
        const bonus = strToNum(holidayFlatBonus);

        if (billingType === "hourly_per_person" && !(hourly && hourly > 0)) {
            Alert.alert("Missing rate", "Enter an hourly rate greater than 0.");
            return;
        }
        if (billingType === "flat_per_shift" && !(single && single > 0)) {
            Alert.alert("Missing rate", "Enter a single-shift rate greater than 0.");
            return;
        }
        if (usesHolidayPay && !((mult && mult > 0) || (bonus && bonus > 0))) {
            Alert.alert("Missing holiday pay", "Enter a holiday multiplier or a flat bonus.");
            return;
        }
        for (const [label, v] of [
            ["Hourly rate", hourly],
            ["Single-shift rate", single],
            ["Double-shift rate", dbl],
            ["Holiday multiplier", mult],
            ["Holiday flat bonus", bonus],
        ] as const) {
            if (v != null && v < 0) {
                Alert.alert("Invalid value", `${label} cannot be negative.`);
                return;
            }
        }

        const config: LocationBillingConfig = {
            billingType,
            hourlyRate: billingType === "hourly_per_person" ? hourly : null,
            singleShiftRate: billingType === "flat_per_shift" ? single : null,
            doubleShiftRate: billingType === "flat_per_shift" ? dbl : null,
            usesHolidayPay,
            holidayMultiplier: usesHolidayPay ? mult : null,
            holidayFlatBonus: usesHolidayPay ? bonus : null,
        };

        try {
            setSaving(true);
            const updated = await updateLocationBilling(selectedId, config);
            setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            Alert.alert("Saved", "Billing settings updated.");
        } catch (e) {
            Alert.alert("Could not save", e instanceof Error ? e.message : "Unknown error");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={GlobalStyles.colors.maroon600} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <FormField label="Location">
                <ModalSelect
                    value={selectedId}
                    onChange={selectLocation}
                    options={options}
                    placeholder={options.length ? "Select a location" : "No locations yet"}
                />
            </FormField>

            {selectedId ? (
                <>
                    <Text style={styles.sectionTitle}>Billing type</Text>
                    <View style={styles.segment}>
                        <Button
                            title="Hourly / person"
                            onPress={() => setBillingType("hourly_per_person")}
                            mode={billingType === "hourly_per_person" ? "filled" : "flat"}
                            style={styles.segmentBtn}
                        />
                        <Button
                            title="Flat / shift"
                            onPress={() => setBillingType("flat_per_shift")}
                            mode={billingType === "flat_per_shift" ? "filled" : "flat"}
                            style={styles.segmentBtn}
                        />
                    </View>

                    {billingType === "hourly_per_person" ? (
                        <FormField label="Hourly rate ($/hr/person)">
                            <Input
                                textInputConfig={{
                                    placeholder: "e.g. 35",
                                    value: hourlyRate,
                                    onChangeText: setHourlyRate,
                                    keyboardType: "decimal-pad",
                                }}
                            />
                        </FormField>
                    ) : (
                        <>
                            <FormField label="Single-shift rate ($)">
                                <Input
                                    textInputConfig={{
                                        placeholder: "e.g. 60",
                                        value: singleRate,
                                        onChangeText: setSingleRate,
                                        keyboardType: "decimal-pad",
                                    }}
                                />
                            </FormField>
                            <FormField label="Double-shift rate ($, optional)">
                                <Input
                                    textInputConfig={{
                                        placeholder: "e.g. 120",
                                        value: doubleRate,
                                        onChangeText: setDoubleRate,
                                        keyboardType: "decimal-pad",
                                    }}
                                />
                            </FormField>
                        </>
                    )}

                    <View style={styles.holidayRow}>
                        <Text style={styles.holidayLabel}>Holiday pay</Text>
                        <Switch
                            value={usesHolidayPay}
                            onValueChange={setUsesHolidayPay}
                            trackColor={{ true: GlobalStyles.colors.maroon600 }}
                        />
                    </View>
                    {usesHolidayPay ? (
                        <>
                            <Text style={styles.hint}>Multiplier is used if set; otherwise the flat bonus is added.</Text>
                            <FormField label="Holiday multiplier (e.g. 1.5)">
                                <Input
                                    textInputConfig={{
                                        placeholder: "e.g. 1.5",
                                        value: holidayMultiplier,
                                        onChangeText: setHolidayMultiplier,
                                        keyboardType: "decimal-pad",
                                    }}
                                />
                            </FormField>
                            <FormField label="Holiday flat bonus ($)">
                                <Input
                                    textInputConfig={{
                                        placeholder: "e.g. 25",
                                        value: holidayFlatBonus,
                                        onChangeText: setHolidayFlatBonus,
                                        keyboardType: "decimal-pad",
                                    }}
                                />
                            </FormField>
                        </>
                    ) : null}

                    <Button
                        title={saving ? "Saving…" : "Save billing"}
                        onPress={save}
                        mode="filled"
                        style={styles.saveBtn}
                    />
                </>
            ) : (
                <Text style={styles.hint}>Select a location to configure its billing.</Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: GlobalStyles.colors.background },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: GlobalStyles.colors.foreground },
    segment: { flexDirection: "row", gap: 10 },
    segmentBtn: { flex: 1 },
    holidayRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    holidayLabel: { fontSize: 16, fontWeight: "600", color: GlobalStyles.colors.foreground },
    hint: { fontSize: 13, color: GlobalStyles.colors.foreground, opacity: 0.7 },
    saveBtn: { marginTop: 8 },
});
