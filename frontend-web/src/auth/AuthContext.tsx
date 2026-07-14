import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthState, User } from "@/types/auth";
import { ApiError } from "@/lib/apiClient";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/tokenStorage";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  logoutAll as logoutAllRequest,
  refreshAuthToken,
} from "@/lib/authApi";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = await getAccessToken();
        const refreshToken = await getRefreshToken();

        if (!accessToken && !refreshToken) {
          setUser(null);
          return;
        }

        // Access token lives in memory only, so on a page reload it's gone even
        // when a valid refresh token remains — re-establish it before /me.
        if (!accessToken && refreshToken) {
          const refreshed = await refreshAuthToken().catch(() => false);
          if (!refreshed) {
            await clearTokens();
            setUser(null);
            return;
          }
        }

        try {
          setUser(await getCurrentUser());
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            const refreshed = await refreshAuthToken().catch(() => false);
            if (refreshed) {
              setUser(await getCurrentUser());
              return;
            }
          }
          await clearTokens();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login: async (email, password) => {
        setUser(await loginRequest(email, password));
      },
      logout: async () => {
        await logoutRequest();
        setUser(null);
      },
      logoutAll: async () => {
        await logoutAllRequest();
        setUser(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
