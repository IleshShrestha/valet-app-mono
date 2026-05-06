import axios from "axios";
import { SHIFTS_API_BASE } from "./shiftsApi";

const client = axios.create({
  baseURL: SHIFTS_API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export type CreateLocationPayload = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

/** POST /locations/ */
export async function createLocation(
  payload: CreateLocationPayload,
): Promise<unknown> {
  const { data } = await client.post<unknown>("/locations/", payload);
  return data;
}
