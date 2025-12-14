/**
 * Distance calculation utility using Haversine formula
 * Calculates the great-circle distance between two points on Earth
 */

/**
 * Calculate distance between two coordinates in kilometers
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers

  // Convert degrees to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance and return formatted string
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Formatted distance string (e.g., "2.5 km" or "150 m")
 */
export function calculateDistanceFormatted(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): string {
  const distanceKm = calculateDistance(lat1, lon1, lat2, lon2);

  if (distanceKm < 1) {
    // If less than 1 km, show in meters
    const distanceM = Math.round(distanceKm * 1000);
    return `${distanceM} m`;
  }

  // Show in kilometers with 2 decimal places
  return `${distanceKm.toFixed(2)} km`;
}

