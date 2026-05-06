import axios from "axios";
import { SHIFTS_API_BASE } from "./shiftsApi";

const client = axios.create({
  baseURL: SHIFTS_API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export type CreateUserPayload = {
  role: "worker" | "manager" | "admin";
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

/** POST /users/ */
export async function createUser(payload: CreateUserPayload): Promise<unknown> {
  const { data } = await client.post<unknown>("/users/", payload);
  return data;
}
