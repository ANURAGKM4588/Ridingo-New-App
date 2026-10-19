/**
 * GPS Distance Calculation Helper (Haversine Formula)
 * Calculates distance between two GPS coordinate points in kilometers.
 */

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return 0;
  }

  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) {
    return 0;
  }

  // Radius of the Earth in kilometers
  const R = 6371;
  const dLat = (p2Lat - p1Lat) * (Math.PI / 180);
  const dLon = (p2Lon - p1Lon) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1Lat * (Math.PI / 180)) *
    Math.cos(p2Lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Filter out microscopic jitter when vehicle is idle (less than 6 meters = 0.006 km)
  if (distanceKm < 0.006) {
    return 0;
  }

  return distanceKm;
}

/**
 * Format distance in km or meters
 */
export function formatDistanceKm(km) {
  if (!km || isNaN(km) || km <= 0) return '0.00 km';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${Number(km).toFixed(2)} km`;
}

/**
 * Format duration in seconds to hh:mm:ss or mm:ss
 */
export function formatDurationSeconds(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
