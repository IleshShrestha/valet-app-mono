import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { GlobalStyles } from "../../constants/style";

type FormFieldProps = PropsWithChildren<{
    label: string;
    style?: StyleProp<ViewStyle>;
    labelStyle?: StyleProp<TextStyle>;
}>;

export default function FormField({ label, children, style, labelStyle }: FormFieldProps) {
    return (
        <View style={[styles.field, style]}>
            <Text style={[styles.label, labelStyle]}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: GlobalStyles.colors.foreground,
    },
});
