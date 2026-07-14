import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { AuthState, User } from "../types/auth";
import { getAccessToken, clearTokens } from "../util/tokenStorage";
import { getCurrentUser, login as loginRequest, logout as logoutRequest, logoutAll as logoutAllRequest, refreshAuthToken } from "../services/authService";
import { ApiError } from "../util/apiClient";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setUser(null);
          return;
        }

        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          return;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            const refreshed = await refreshAuthToken().catch(() => false);
            if (refreshed) {
              const currentUser = await getCurrentUser();
              setUser(currentUser);
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

    initializeAuth();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    login: async (email: string, password: string) => {
      const loggedInUser = await loginRequest(email, password);
      setUser(loggedInUser);
    },
    logout: async () => {
      await logoutRequest();
      setUser(null);
    },
    logoutAll: async () => {
      await logoutAllRequest();
      setUser(null);
    },
    refreshSession: async () => {
      try {
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          setUser(null);
        }
        return refreshed;
      } catch {
        setUser(null);
        return false;
      }
    },
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
