import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "./apiClient";
import { clearTokens, getAccessToken, saveTokens } from "./tokenStorage";

/** Minimal Response stand-in — apiClient only uses ok/status/text(). */
function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as Response;
}

beforeEach(async () => {
  await clearTokens();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiClient", () => {
  it("returns the parsed body of a successful GET", async () => {
    const fetchMock = vi.fn(async () => res(200, { data: [{ id: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await apiClient.get<{ data: { id: number }[] }>("/service-days");
    expect(out.data[0].id).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes once on 401 then retries the original request", async () => {
    await saveTokens("old-access", "refresh-1");
    let dataCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return res(200, { data: { access_token: "new-access", refresh_token: "refresh-2" } });
      }
      dataCalls += 1;
      return dataCalls === 1 ? res(401, { error: "expired" }) : res(200, { data: { ok: true } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await apiClient.get<{ data: { ok: boolean } }>("/service-days");
    expect(out.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3); // request(401) + refresh + retry
    expect(await getAccessToken()).toBe("new-access");
  });

  it("throws ApiError (no infinite retry) when refresh fails", async () => {
    await saveTokens("old-access", "refresh-1");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return res(401, { error: "bad refresh" });
      return res(401, { error: "expired" });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/service-days")).rejects.toBeInstanceOf(ApiError);
  });
});
