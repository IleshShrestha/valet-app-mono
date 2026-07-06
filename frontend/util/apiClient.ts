import { API_BASE_URL } from "../config/api";
import type { RefreshResponse } from "../types/auth";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "./tokenStorage";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & { skipAuthRefresh?: boolean; isRetry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toFriendlyMessage(status: number, endpoint: string, body: unknown): string {
  if (status === 401 && endpoint.includes("/auth/login")) return "Invalid email or password.";
  if (status === 401) return "Session expired. Please log in again.";
  if (status >= 500) return "Backend is unavailable right now. Please try again.";
  if (typeof body === "object" && body !== null && "error" in body) {
    const maybeError = (body as Record<string, unknown>).error;
    if (typeof maybeError === "string") return maybeError;
  }
  return `Request failed with status ${status}.`;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const parsed = (await parseResponse(response)) as { data?: RefreshResponse } | null;
    const data = parsed?.data ?? null;
    if (!response.ok || !data?.access_token || !data?.refresh_token) {
      await clearTokens();
      return null;
    }

    await saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  const data = await parseResponse(response);

  const isAuthRoute = endpoint.startsWith("/auth/login") || endpoint.startsWith("/auth/refresh");
  const canRetry = response.status === 401 && !options.isRetry && !options.skipAuthRefresh && !isAuthRoute;

  if (canRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(endpoint, { ...options, isRetry: true });
    }
  }

  if (!response.ok) {
    throw new ApiError(toFriendlyMessage(response.status, endpoint, data), response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string, options?: RequestOptions) => apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
