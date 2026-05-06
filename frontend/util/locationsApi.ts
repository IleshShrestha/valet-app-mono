import { apiClient } from "./apiClient";

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
  return apiClient.post<unknown>("/locations/", payload);
}
