import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ServiceDayList from '../screens/ServiceDayList';
import Settings from '../screens/Settings';
import IconButton from '../components/UI/IconButton';
import { GlobalStyles } from '../constants/style';
import type { BottomTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../store/Authcontext';
import { isAdmin } from '../auth/permissions';

const BottomTabs = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabsNavigator() {
  const { user } = useAuth();
  const admin = isAdmin(user);

  return (
    <BottomTabs.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: GlobalStyles.colors.maroon600 },
        tabBarActiveTintColor: GlobalStyles.colors.background,
        tabBarInactiveTintColor: GlobalStyles.colors.maroon200,
        headerStyle: { backgroundColor: GlobalStyles.colors.maroon600 },
        headerTintColor: GlobalStyles.colors.background,
      }}
    >
      <BottomTabs.Screen
        name="ServiceDays"
        component={ServiceDayList}
        options={({ navigation }) => ({
          title: 'Service Days',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
          headerRight: admin
            ? () => (
                <IconButton
                  icon="add"
                  size={24}
                  color={GlobalStyles.colors.maroon600}
                  onPress={() => {
                    navigation
                      .getParent<NativeStackNavigationProp<RootStackParamList>>()
                      ?.navigate({ name: 'ServiceDayDetails', params: {} });
                  }}
                />
              )
            : undefined,
        })}
      />
      <BottomTabs.Screen
        name="Settings"
        component={Settings}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" color={color} size={size} />,
        }}
      />
    </BottomTabs.Navigator>
  );
}
