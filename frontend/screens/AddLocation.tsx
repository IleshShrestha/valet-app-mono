import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLayoutEffect, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { GlobalStyles } from "../constants/style";
import FormField from "../components/UI/FormField";
import Input from "../components/ShiftForm/Input";
import Button from "../components/UI/Button";
import { geocodeAddress } from "../util/geocoding";
import { createLocation } from "../util/locationsApi";
import axios from "axios";
import LocationPlacesInput from "../components/ShiftForm/LocationPlacesInput";
import type { PlacePrediction } from "../util/placesAutocomplete";

export default function AddLocation() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [addressQuery, setAddressQuery] = useState("");
  const [name, setName] = useState("");
  const [radiusText, setRadiusText] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Add location" });
  }, [navigation]);

  function handleAddressQueryChange(next: string) {
    setAddressQuery(next);
    setLatitude(null);
    setLongitude(null);
  }

  async function handleAddressSuggestionSelect(prediction: PlacePrediction) {
    try {
      setLookupLoading(true);
      const result = await geocodeAddress(prediction.description);
      setAddressQuery(result.formattedAddress);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
    } catch (e) {
      Alert.alert(
        "Lookup failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSave() {
    if (latitude == null || longitude == null) {
      Alert.alert(
        "Missing coordinates",
        "Select an address suggestion first to set latitude and longitude.",
      );
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Validation", "Enter a location name.");
      return;
    }
    const radius = Number(radiusText.trim());
    if (!Number.isFinite(radius) || radius <= 0) {
      Alert.alert(
        "Validation",
        "Enter a valid radius in meters (greater than 0).",
      );
      return;
    }

    try {
      setSaveLoading(true);
      await createLocation({
        name: trimmedName,
        latitude,
        longitude,
        radius,
      });
      Alert.alert("Saved", "Location created successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
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
      Alert.alert("Could not save", message);
    } finally {
      setSaveLoading(false);
    }
  }

  function handleCancel() {
    navigation.goBack();
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <FormField label="Address or place">
          <LocationPlacesInput
            value={addressQuery}
            onChangeValue={handleAddressQueryChange}
            onSelectSuggestion={handleAddressSuggestionSelect}
            placeholder="e.g. 123 Main St, Philadelphia PA"
          />
        </FormField>
        {lookupLoading ? (
          <Text style={styles.hint}>Resolving selected address…</Text>
        ) : null}

        <FormField label="Location name">
          <Input
            textInputConfig={{
              placeholder: "Name stored for this site",
              value: name,
              onChangeText: setName,
            }}
          />
        </FormField>

        <FormField label="Radius (meters)">
          <Input
            textInputConfig={{
              placeholder: "e.g. 100",
              value: radiusText,
              onChangeText: setRadiusText,
              keyboardType: "decimal-pad",
            }}
          />
        </FormField>

        <Text style={styles.hint}>
          Select an address suggestion to set the location.
        </Text>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            mode="flat"
            style={styles.actionBtn}
          />
          <Button
            title={saveLoading ? "Saving…" : "Save"}
            onPress={handleSave}
            mode="filled"
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GlobalStyles.colors.background,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  hint: {
    fontSize: 14,
    color: GlobalStyles.colors.foreground + "99",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  actionBtn: {
    minWidth: 120,
  },
});
