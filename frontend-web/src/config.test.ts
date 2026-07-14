import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "./config";

describe("config", () => {
  it("API_BASE_URL points at a /v1 API", () => {
    expect(API_BASE_URL).toMatch(/^https?:\/\/.+\/v1$/);
  });
});
