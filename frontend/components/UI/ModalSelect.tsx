import { StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { GlobalStyles } from "../../constants/style";

export type ModalSelectOption = {
    label: string;
    value: string;
};

type ModalSelectProps = {
    value: string;
    onChange: (next: string) => void;
    options: ModalSelectOption[];
    placeholder?: string;
    maxVisibleOptions?: number;
    searchPlaceholder?: string;
};

export default function ModalSelect({
    value,
    onChange,
    options,
    placeholder = "Search or select",
    maxVisibleOptions = 5,
    searchPlaceholder = "Type to filter options...",
}: ModalSelectProps) {
    const computedMaxHeight = Math.max(180, maxVisibleOptions * 52);

    return (
        <View style={styles.wrapper}>
            <Dropdown
                style={styles.dropdown}
                containerStyle={styles.menu}
                placeholderStyle={styles.placeholderText}
                selectedTextStyle={styles.selectedText}
                itemTextStyle={styles.itemText}
                inputSearchStyle={styles.searchInput}
                activeColor={GlobalStyles.colors.maroon50}
                data={options}
                search
                maxHeight={computedMaxHeight}
                labelField="label"
                valueField="value"
                placeholder={placeholder}
                searchPlaceholder={searchPlaceholder}
                value={value || null}
                onChange={(item: ModalSelectOption) => onChange(item.value)}
                autoScroll={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        zIndex: 5,
    },
    dropdown: {
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.inputBackground,
    },
    menu: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.background,
        marginTop: 6,
    },
    placeholderText: {
        fontSize: 16,
        color: GlobalStyles.colors.foreground + "80",
    },
    selectedText: {
        fontSize: 16,
        color: GlobalStyles.colors.foreground,
    },
    itemText: {
        fontSize: 16,
        color: GlobalStyles.colors.foreground,
    },
    searchInput: {
        fontSize: 16,
        color: GlobalStyles.colors.foreground,
        borderRadius: 8,
        borderColor: GlobalStyles.colors.border,
        backgroundColor: GlobalStyles.colors.inputBackground,
    },
});

