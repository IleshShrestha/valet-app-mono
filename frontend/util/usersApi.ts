import type { PickerOption } from "../types/picker";
import { apiClient } from "./apiClient";

export type CreateUserPayload = {
  role: "employee" | "manager";
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

/** POST /users/ */
export async function createUser(payload: CreateUserPayload): Promise<unknown> {
  return apiClient.post<unknown>("/users/", payload);
}

type ApiRecord = Record<string, unknown>;

function unwrapList(res: unknown): ApiRecord[] {
  const data =
    res && typeof res === "object" && "data" in (res as ApiRecord)
      ? (res as { data: unknown }).data
      : res;
  return Array.isArray(data) ? (data as ApiRecord[]) : [];
}

function userLabel(o: ApiRecord): string {
  const first = typeof o.first_name === "string" ? o.first_name.trim() : "";
  const last = typeof o.last_name === "string" ? o.last_name.trim() : "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  if (name) return name;
  return typeof o.email === "string" ? o.email : "User";
}

/** GET /users/ — team members for the segment worker picker. */
export async function fetchUserPickerOptions(): Promise<PickerOption[]> {
  try {
    const rows = unwrapList(await apiClient.get<unknown>("/users/"));
    return rows
      .map((o) => ({ label: userLabel(o), value: String(o.id ?? "") }))
      .filter((opt) => opt.value);
  } catch {
    return [];
  }
}
