import { Pressable, View, StyleSheet, Text, StyleProp, ViewStyle } from "react-native";
import { GlobalStyles } from "../../constants/style";

type ButtonProps = {
    /** Use for string labels so static checks see text only inside `<Text>` here, not as raw JSX children of `Button`. */
    title?: string;
    children?: React.ReactNode;
    onPress: () => void;
    mode: "flat" | "filled";
    style?: StyleProp<ViewStyle>;
};

export default function Button({ title, children, onPress, mode, style }: ButtonProps) {
    const label = title ?? children;
    return (
        <View style={style}>
            <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
                <View style={[styles.button, mode === "flat" && styles.flat]}>
                    <Text style={[styles.buttonText, mode === "flat" && styles.flatText]}>{label}</Text>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 4,
        padding: 8,
        backgroundColor: GlobalStyles.colors.maroon600,
    },
    flat: {
        backgroundColor: 'transparent',
    },
    buttonText: {
        color: GlobalStyles.colors.background,
        textAlign: 'center',
    },
    flatText: {
        color: GlobalStyles.colors.maroon600,
    },
    pressed: {
        opacity: 0.75,
        backgroundColor: GlobalStyles.colors.maroon200,
        borderRadius: 4,
    },
});