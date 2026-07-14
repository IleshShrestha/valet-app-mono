import * as Location from "expo-location";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function getCurrentLocation(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
