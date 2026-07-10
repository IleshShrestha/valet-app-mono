import { Ionicons } from "@expo/vector-icons";

export interface AssignedUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
}

export type RootStackParamList = {
    BottomTabs: undefined;
    ServiceDayDetails: { serviceDayId?: string };
    AddLocation: undefined;
    AddUser: undefined;
    Login: undefined;
};

export type BottomTabParamList = {
    ServiceDays: undefined;
    Settings: undefined;
};

export type IconButtonProps = {
    icon: keyof typeof Ionicons.glyphMap;
    size: number;
    color: string;
    onPress: () => void;
};
