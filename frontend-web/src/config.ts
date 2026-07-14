const rawApiUrl = (import.meta.env.VITE_API_URL ?? "").trim();

/** Backend base URL including the /v1 prefix (mirrors the mobile config). */
export const API_BASE_URL = rawApiUrl || "http://localhost:8080/v1";
