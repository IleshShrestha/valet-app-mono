const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  console.warn("EXPO_PUBLIC_API_URL is not set. Falling back to http://localhost:8080");
}

export const API_BASE_URL = (rawApiUrl || "http://localhost:8080").replace(/\/+$/, "");
