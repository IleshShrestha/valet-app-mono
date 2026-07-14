import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GlobalStyles } from '../constants/style';
import AddLocation from '../screens/AddLocation';
import AddUser from '../screens/AddUser';
import Loading from '../screens/Loading';
import Login from '../screens/Login';
import ServiceDayDetails from '../screens/ServiceDayDetails';
import Invoicing from '../screens/Invoicing';
import LocationBilling from '../screens/LocationBilling';
import { useAuth } from '../store/Authcontext';
import type { RootStackParamList } from '../types';
import BottomTabsNavigator from './BottomTabsNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: GlobalStyles.colors.background },
          headerTintColor: GlobalStyles.colors.background,
          headerStyle: { backgroundColor: GlobalStyles.colors.maroon600 },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="BottomTabs" component={BottomTabsNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="ServiceDayDetails" component={ServiceDayDetails} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Invoicing" component={Invoicing} options={{ title: 'Invoicing' }} />
            <Stack.Screen name="LocationBilling" component={LocationBilling} options={{ title: 'Location billing' }} />
            <Stack.Screen name="AddLocation" component={AddLocation} options={{ presentation: 'modal', title: 'Add location' }} />
            <Stack.Screen name="AddUser" component={AddUser} options={{ presentation: 'modal', title: 'Add user' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
