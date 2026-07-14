import { apiClient } from "./apiClient";
import { clearTokens, getRefreshToken, saveTokens } from "./tokenStorage";
import type { LoginResponse, RefreshResponse, User } from "@/types/auth";

export async function login(email: string, password: string): Promise<User> {
  const { data } = await apiClient.post<{ data: LoginResponse }>(
    "/auth/login",
    { email, password, platform: "web", device_name: "Web browser" },
    { skipAuthRefresh: true },
  );

  await saveTokens(data.access_token, data.refresh_token);
  return data.user;
}

export async function refreshAuthToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  const { data } = await apiClient.post<{ data: RefreshResponse }>(
    "/auth/refresh",
    { refresh_token: refreshToken },
    { skipAuthRefresh: true },
  );
  await saveTokens(data.access_token, data.refresh_token);
  return true;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await apiClient.post("/auth/logout", { refresh_token: refreshToken }, { skipAuthRefresh: true });
    }
  } finally {
    await clearTokens();
  }
}

export async function logoutAll(): Promise<void> {
  try {
    await apiClient.post("/auth/logout-all");
  } finally {
    await clearTokens();
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ data: { user: User } }>("/auth/me");
  return response.data.user;
}
