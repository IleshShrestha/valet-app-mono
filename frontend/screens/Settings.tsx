import { Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { GlobalStyles } from "../constants/style";
import Button from "../components/UI/Button";

export default function Settings() {
    const navigation = useNavigation();

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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.buttonWrap}>
                <Button
                    title="Add location"
                    onPress={openAddLocation}
                    mode="filled"
                    style={styles.button}
                />
                <Button
                    title="Add user"
                    onPress={openAddUser}
                    mode="filled"
                    style={styles.button}
                />
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
});
