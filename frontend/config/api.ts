const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();

export const API_BASE_URL = rawApiUrl || "http://localhost:8080";
