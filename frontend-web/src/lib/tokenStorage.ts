// Web token storage: the short-lived access token lives ONLY in memory (so an
// XSS bug can't lift it from disk), while the long-lived refresh token is kept
// in localStorage so a page reload can silently re-establish the session.
// Async API mirrors the mobile tokenStorage so apiClient/authApi port verbatim.

const REFRESH_KEY = "valet_refresh_token";

let accessToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  return accessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  try {
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable (private mode) — access token still works for the session */
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}
