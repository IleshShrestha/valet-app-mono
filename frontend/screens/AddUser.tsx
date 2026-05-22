import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLayoutEffect, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { GlobalStyles } from "../constants/style";
import FormField from "../components/UI/FormField";
import Input from "../components/ShiftForm/Input";
import Button from "../components/UI/Button";
import axios from "axios";
import ModalSelect, { type ModalSelectOption } from "../components/UI/ModalSelect";
import { createUser } from "../util/usersApi";

const roleOptions: ModalSelectOption[] = [
  { label: "Employee", value: "employee" },
  { label: "Manager", value: "manager" },
];

export default function AddUser() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Add user" });
  }, [navigation]);

  async function handleSave() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      Alert.alert("Validation", "Enter first name and last name.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      Alert.alert("Validation", "Enter a valid email address.");
      return;
    }
    const normalizedPassword = password.trim();

    if (normalizedPassword.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters.");
      return;
    }

    try {
      setSaveLoading(true);
      await createUser({
        role,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        password: normalizedPassword,
      });
      Alert.alert("Saved", "User created successfully.", [
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
        <FormField label="Role">
          <ModalSelect
            value={role}
            onChange={(next) => setRole(next as "employee" | "manager")}
            options={roleOptions}
            placeholder="Select a role"
            searchPlaceholder="Type to filter roles..."
          />
        </FormField>

        <FormField label="First name">
          <Input
            textInputConfig={{
              placeholder: "e.g. Jane",
              value: firstName,
              onChangeText: setFirstName,
            }}
          />
        </FormField>

        <FormField label="Last name">
          <Input
            textInputConfig={{
              placeholder: "e.g. Doe",
              value: lastName,
              onChangeText: setLastName,
            }}
          />
        </FormField>

        <FormField label="Email">
          <Input
            textInputConfig={{
              placeholder: "e.g. jane@example.com",
              value: email,
              onChangeText: setEmail,
              autoCapitalize: "none",
              keyboardType: "email-address",
            }}
          />
        </FormField>

        <FormField label="Password">
          <Input
            textInputConfig={{
              placeholder: "Minimum 8 characters",
              value: password,
              onChangeText: setPassword,
              secureTextEntry: true,
              autoCapitalize: "none",
            }}
          />
        </FormField>

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
