import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { GlobalStyles } from "../../constants/style";

type FieldBoxProps = PropsWithChildren<{
    style?: StyleProp<ViewStyle>;
}>;

export default function FieldBox({ children, style }: FieldBoxProps) {
    return <View style={[styles.box, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    box: {
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.inputBackground,
    },
});
