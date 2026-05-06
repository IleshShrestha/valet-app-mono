import { apiClient } from "./apiClient";

export type CreateUserPayload = {
  role: "worker" | "manager" | "admin";
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

/** POST /users/ */
export async function createUser(payload: CreateUserPayload): Promise<unknown> {
  return apiClient.post<unknown>("/users/", payload);
}
