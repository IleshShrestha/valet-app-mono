import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { GlobalStyles } from "../../constants/style";
import FieldBox from "../UI/FieldBox";

export type InputProps = {
    textInputConfig: TextInputProps;
};

export default function Input({ textInputConfig }: InputProps) {
    return (
        <FieldBox>
            <TextInput
                placeholderTextColor={GlobalStyles.colors.foreground + "80"}
                {...textInputConfig}
                style={[styles.input, textInputConfig.style]}
            />
        </FieldBox>
    );
}

const styles = StyleSheet.create({
    input: {
        padding: 0,
        color: GlobalStyles.colors.foreground,
    },
});