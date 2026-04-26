/**
 * Haversine Distance Formula
 * 
 * Calculates the great-circle distance between two points on Earth
 * given their latitude and longitude in decimal degrees.
 * 
 * This is used for:
 * 1. Edge weights in the graph (actual road segment distance)
 * 2. A* heuristic (straight-line distance to goal — always admissible)
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in meters
 */

const EARTH_RADIUS_M = 6_371_000; // Earth's mean radius in meters

export function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Euclidean distance approximation for nearby points.
 * Faster than Haversine but less accurate over large distances.
 * Uses a simple lat/lng to meters conversion.
 */
export function euclidean(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const avgLat = toRad((lat1 + lat2) / 2);

  // Approximate meters per degree at this latitude
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(avgLat);

  const dy = (lat2 - lat1) * mPerDegLat;
  const dx = (lng2 - lng1) * mPerDegLng;

  return Math.sqrt(dx * dx + dy * dy);
}
