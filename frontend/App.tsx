import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GlobalStyles } from './constants/style';

import Loading from './screens/Loading';
import Login from './screens/Login';
import Settings from './screens/Settings';
import AddLocation from './screens/AddLocation';
import AddUser from './screens/AddUser';
import ShiftDetails from './screens/ShiftDetails';
import ShiftList from './screens/ShiftList';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import IconButton from './components/UI/IconButton';
import type { BottomTabParamList, RootStackParamList } from './types';
import { ShiftContextProvider } from './store/ShiftContext';
import { runSilentHealthCheck } from './util/shiftsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const Stack = createNativeStackNavigator<RootStackParamList>();
const BottomTabs = createBottomTabNavigator<BottomTabParamList>();

function BottomTabsNavigator() {
  return (
    <BottomTabs.Navigator screenOptions={{
      tabBarStyle: { backgroundColor: GlobalStyles.colors.maroon600 },
      tabBarActiveTintColor: GlobalStyles.colors.background,
      tabBarInactiveTintColor: GlobalStyles.colors.maroon200,
      headerStyle: { backgroundColor: GlobalStyles.colors.maroon600 },
      headerTintColor: GlobalStyles.colors.background
    }}>
      <BottomTabs.Screen
        name="ShiftList"
        component={ShiftList}
        options={({ navigation }) => ({
          title: 'Shifts',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
          headerRight: () => (
            <IconButton
              icon="add"
              size={24}
              color={GlobalStyles.colors.maroon600}
              onPress={() => {
                navigation
                  .getParent<NativeStackNavigationProp<RootStackParamList>>()
                  ?.navigate({ name: "ShiftDetails", params: {} });
              }}
            />
          ),
        })}
      />
      <BottomTabs.Screen name="Settings" component={Settings} options={{
        title: 'Settings', tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="cog" color={color} size={size} />
        )
      }} />
    </BottomTabs.Navigator>
  );
}
const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    runSilentHealthCheck();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <ShiftContextProvider>
          <NavigationContainer>
          <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: GlobalStyles.colors.background }, headerTintColor: GlobalStyles.colors.background, headerStyle: { backgroundColor: GlobalStyles.colors.maroon600 } }}>
            <Stack.Screen name="BottomTabs" component={BottomTabsNavigator} options={{ headerShown: false }} />

            <Stack.Screen name="ShiftDetails" component={ShiftDetails} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AddLocation" component={AddLocation} options={{ presentation: 'modal', title: 'Add location' }} />
            <Stack.Screen name="AddUser" component={AddUser} options={{ presentation: 'modal', title: 'Add user' }} />
            <Stack.Screen name="Login" component={Login} />



          </Stack.Navigator>
          </NavigationContainer>
        </ShiftContextProvider>
      </QueryClientProvider>
    </>
  );
}


