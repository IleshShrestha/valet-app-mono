package geo

import "math"

const earthRadiusMeters = 6371000.0

// DistanceMeters returns the great-circle distance between two WGS84 points in meters (Haversine).
func DistanceMeters(lat1, lon1, lat2, lon2 float64) float64 {
	phi1 := lat1 * math.Pi / 180
	phi2 := lat2 * math.Pi / 180
	dPhi := (lat2 - lat1) * math.Pi / 180
	dLambda := (lon2 - lon1) * math.Pi / 180

	sinHalfDPhi := math.Sin(dPhi / 2)
	sinHalfDLambda := math.Sin(dLambda / 2)
	a := sinHalfDPhi*sinHalfDPhi + math.Cos(phi1)*math.Cos(phi2)*sinHalfDLambda*sinHalfDLambda
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusMeters * c
}
