import { Ionicons } from "@expo/vector-icons";

export interface Shift {
    id: string;
    title: string;
    date: Date;
    timeStart: string;
    timeEnd: string;
    location: string;

    userNames: string[];
}

export type RootStackParamList = {
    BottomTabs: undefined;
    ShiftDetails: { shiftId?: string };
    AddLocation: undefined;
    Login: undefined;
};

export type BottomTabParamList = {
    ShiftList: undefined;
    Settings: undefined;
};



export type IconButtonProps = {
    icon: keyof typeof Ionicons.glyphMap;
    size: number;
    color: string;
    onPress: () => void;
};