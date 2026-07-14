/**
 * Uses Google Geocoding API (REST). Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`.
 * Restrict the key in Google Cloud Console for production.
 */

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
  }>;
};

function getMapsApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof key === "string" && key.trim()) return key.trim();
  throw new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error("Enter an address or place name");
  }

  const apiKey = getMapsApiKey();
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(trimmed)}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding request failed (${res.status})`);
  }

  const json = (await res.json()) as GoogleGeocodeResponse;

  if (json.status === "ZERO_RESULTS") {
    throw new Error("No results for that address");
  }
  if (json.status === "REQUEST_DENIED" || json.status === "INVALID_REQUEST") {
    throw new Error(json.error_message || `Geocoding error: ${json.status}`);
  }
  if (json.status !== "OK" || !json.results?.length) {
    throw new Error(json.error_message || `Geocoding error: ${json.status}`);
  }

  const first = json.results[0];
  const loc = first.geometry?.location;
  if (
    !loc ||
    typeof loc.lat !== "number" ||
    typeof loc.lng !== "number"
  ) {
    throw new Error("Invalid geocoding response");
  }

  return {
    latitude: loc.lat,
    longitude: loc.lng,
    formattedAddress: first.formatted_address ?? trimmed,
  };
}
