/**
 * Geolocation & School Geofencing Helpers
 */

export interface GeolocationPositionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  error?: string;
}

// Convert degrees to radians
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates distance between two GPS coordinates using Haversine formula in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format coordinates string: "-6.2088, 106.8456"
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Generates the requested 'View Lokasi' Google Maps URL
 */
export function generateMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Get current browser geolocation
 */
export function getCurrentPosition(): Promise<GeolocationPositionResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: -6.208763,
        longitude: 106.845599,
        accuracy: 25,
        error: 'Geolokasi tidak didukung browser ini. Menggunakan koordinat default.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        // Fallback to sample school coordinate if user denies or simulated environment
        resolve({
          latitude: -6.208763,
          longitude: 106.845599,
          accuracy: 50,
          error: `GPS tidak aktif: ${err.message}. Menggunakan koordinat sekolah.`,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  });
}
