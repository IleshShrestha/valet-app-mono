/**
 * Google Places Autocomplete (legacy REST). Uses `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
 * (enable Places API in Google Cloud; restrict the key appropriately).
 */

const AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";

export type PlacePrediction = {
  description: string;
  placeId: string;
};

type GoogleAutocompleteResponse = {
  status: string;
  error_message?: string;
  predictions?: Array<{
    description: string;
    place_id: string;
  }>;
};

function getMapsApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof key === "string" && key.trim()) return key.trim();
  throw new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
}

const MIN_QUERY_LEN = 2;
const MAX_RESULTS = 8;

/** Returns up to `MAX_RESULTS` predictions; empty array if query too short or no matches. */
export async function fetchPlacePredictions(
  input: string,
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < MIN_QUERY_LEN) return [];

  const apiKey = getMapsApiKey();
  const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(trimmed)}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Places request failed (${res.status})`);
  }

  const json = (await res.json()) as GoogleAutocompleteResponse;

  if (json.status === "ZERO_RESULTS") return [];
  if (json.status === "REQUEST_DENIED" || json.status === "INVALID_REQUEST") {
    throw new Error(json.error_message || `Places error: ${json.status}`);
  }
  if (json.status !== "OK") {
    throw new Error(json.error_message || `Places error: ${json.status}`);
  }

  const preds = json.predictions ?? [];
  return preds.slice(0, MAX_RESULTS).map((p) => ({
    description: p.description,
    placeId: p.place_id,
  }));
}
