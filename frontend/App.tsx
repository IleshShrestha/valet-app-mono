import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ShiftContextProvider } from './store/ShiftContext';
import { AuthProvider } from './store/Authcontext';
import { runSilentHealthCheck } from './util/shiftsApi';
import RootNavigator from './navigation/RootNavigator';

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    runSilentHealthCheck();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ShiftContextProvider>
            <RootNavigator />
          </ShiftContextProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}
