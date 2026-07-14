import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, StyleSheet } from "react-native";
import type { IconButtonProps } from "../../types";
import { GlobalStyles } from "../../constants/style";




export default function IconButton({ icon, size, color, onPress }: IconButtonProps) {

    return (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
            <View style={styles.buttonContainer}>
                <Ionicons name={icon} size={size} color={color} />
            </View>

        </Pressable>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        padding: 6,
        borderRadius: 24,
        marginHorizontal: 8,
        marginVertical: 2,
        backgroundColor: GlobalStyles.colors.background,
    },
    pressed: {
        opacity: 0.75,
    },
});