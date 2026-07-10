import { useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { GlobalStyles } from "../constants/style";
import Button from "../components/UI/Button";
import { useAuth } from "../store/Authcontext";
import { usePermissions } from "../hooks/usePermissions";

export default function Settings() {
    const navigation = useNavigation();
    const { logout } = useAuth();
    const { canCreateLocation, canCreateUser, canInvoice } = usePermissions();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function handleLogout() {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await logout();
        } catch {
            // Tokens are cleared in authService; still reset UI if navigation did not occur.
        } finally {
            setIsLoggingOut(false);
        }
    }

    function openAddLocation() {
        navigation
            .getParent<NativeStackNavigationProp<RootStackParamList>>()
            ?.navigate("AddLocation");
    }

    function openAddUser() {
        navigation
            .getParent<NativeStackNavigationProp<RootStackParamList>>()
            ?.navigate("AddUser");
    }

    function openInvoicing() {
        navigation
            .getParent<NativeStackNavigationProp<RootStackParamList>>()
            ?.navigate("Invoicing");
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.buttonWrap}>
                {canInvoice ? (
                    <Button
                        title="Invoicing"
                        onPress={openInvoicing}
                        mode="filled"
                        style={styles.button}
                    />
                ) : null}
                {canCreateLocation ? (
                    <Button
                        title="Add location"
                        onPress={openAddLocation}
                        mode="filled"
                        style={styles.button}
                    />
                ) : null}
                {canCreateUser ? (
                    <Button
                        title="Add user"
                        onPress={openAddUser}
                        mode="filled"
                        style={styles.button}
                    />
                ) : null}

                {isLoggingOut ? (
                    <View style={styles.logoutLoading}>
                        <ActivityIndicator
                            color={GlobalStyles.colors.maroon600}
                        />
                    </View>
                ) : (
                    <Button
                        title="Log out"
                        onPress={handleLogout}
                        mode="flat"
                        style={styles.button}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: GlobalStyles.colors.background,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: GlobalStyles.colors.foreground,
        marginBottom: 16,
    },
    buttonWrap: {
        alignItems: "stretch",
        gap: 10,
    },
    button: {
        alignSelf: "stretch",
    },
    logoutLoading: {
        paddingVertical: 12,
        alignItems: "center",
    },
});
