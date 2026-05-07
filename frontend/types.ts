import { Ionicons } from "@expo/vector-icons";

export interface Shift {
    id: string;
    title: string;
    date: Date;
    timeStart: string;
    timeEnd: string;
    locationId: string;
    location: string;

    assignedUsers: AssignedUser[];
}

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
    ShiftDetails: { shiftId?: string };
    AddLocation: undefined;
    AddUser: undefined;
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
