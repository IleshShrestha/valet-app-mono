import { ComponentProps, ReactNode, useMemo, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { GlobalStyles } from "../../constants/style";
import FieldBox from "./FieldBox";
import FormField from "./FormField";

export type DateTimePickerMode = "date" | "time" | "datetime";
type ModalProps = ComponentProps<typeof DateTimePickerModal>;

type RenderTriggerArgs = {
    open: () => void;
    label?: string;
    formattedValue: string;
    value: Date;
};

export type DateTimePickerProps = {
    mode: DateTimePickerMode;
    value: Date;
    onChange: (next: Date) => void;
    label?: string;
    placeholder?: string;
    valueTextStyle?: StyleProp<TextStyle>;

    /**
     * Full control over the "input" UI that opens the modal.
     * If omitted, a simple Pressable + Text trigger is rendered.
     */
    renderTrigger?: (args: RenderTriggerArgs) => ReactNode;

    display?: ModalProps["display"];
    minimumDate?: ModalProps["minimumDate"];
    maximumDate?: ModalProps["maximumDate"];

    /** Forward any other modal props (styles, locale, etc.) */
    modalProps?: Omit<
        Partial<ModalProps> & {

            themeVariant?: "light" | "dark";
            isDarkModeEnabled?: boolean;
        },
        "isVisible" | "mode" | "date" | "onConfirm" | "onCancel" | "display" | "minimumDate" | "maximumDate"
    >;
    style?: StyleProp<ViewStyle>;
};

function formatValue(mode: DateTimePickerMode, value: Date) {
    if (mode === "date") return value.toLocaleDateString();
    if (mode === "time") {
        return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    return value.toLocaleString();
}

export default function DateTimePicker({
    mode,
    value,
    onChange,
    label,
    placeholder,
    valueTextStyle,
    renderTrigger,
    display = "default",
    minimumDate,
    maximumDate,
    modalProps,
    style,
}: DateTimePickerProps) {
    const [isVisible, setIsVisible] = useState(false);

    const formattedValue = useMemo(() => formatValue(mode, value), [mode, value]);

    function open() {
        setIsVisible(true);
    }

    function close() {
        setIsVisible(false);
    }

    return (
        <View style={style}>
            {renderTrigger ? (
                renderTrigger({ open, label, formattedValue, value })
            ) : (
                <FormField label={label ?? ""}>
                    <Pressable onPress={open}>
                        <FieldBox>
                            <Text
                                style={[
                                    styles.valueText,
                                    !formattedValue && placeholder ? styles.placeholderText : null,
                                    valueTextStyle,
                                ]}
                            >
                                {formattedValue || placeholder || "Select"}
                            </Text>
                        </FieldBox>
                    </Pressable>
                </FormField>
            )}

            <DateTimePickerModal
                isVisible={isVisible}
                mode={mode}
                date={value}
                display={display}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onConfirm={(selected: Date) => {
                    onChange(selected);
                    close();
                }}
                onCancel={close}
                {...modalProps}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    valueText: {
        fontSize: 16,
        color: GlobalStyles.colors.foreground,
    },
    placeholderText: {
        color: GlobalStyles.colors.foreground + "80",
    },
});