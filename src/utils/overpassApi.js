/**
 * Overpass API Client
 * 
 * Fetches road network data from OpenStreetMap via the public Overpass API.
 * No API key required — this is a free, public service.
 * 
 * Supports corridor-based tile loading: for large distances, the bounding box
 * is split into a chain of overlapping tiles along the straight line between
 * start and end. Each tile is fetched sequentially with rate limiting.
 * 
 * Rate limiting: The public Overpass API has rate limits.
 * We add a delay between sequential tile fetches.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** Size of each tile in degrees (~0.009 sq degrees, well within API limits) */
const TILE_SIZE = 0.009;

/** Overlap between adjacent tiles (30% of tile size) to ensure connectivity */
const TILE_OVERLAP = 0.3;

/** Delay between sequential tile fetches in milliseconds */
const FETCH_DELAY_MS = 500;

/** Maximum straight-line distance in km before we refuse to load */
export const MAX_DISTANCE_KM = 15;

/**
 * Haversine distance between two lat/lng points, in km.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch road network data for a given bounding box.
 * 
 * @param {object} bounds - The map bounding box
 * @param {number} bounds.south - Southern latitude
 * @param {number} bounds.west - Western longitude
 * @param {number} bounds.north - Northern latitude
 * @param {number} bounds.east - Eastern longitude
 * @returns {Promise<object>} Raw Overpass API JSON response
 */
export async function fetchRoadNetwork(bounds) {
  const { south, west, north, east } = bounds;

  // Overpass QL query:
  // 1. Fetch all highway ways within the bbox (filtered to drivable road types)
  // 2. Recurse down to get all nodes referenced by those ways
  // 3. Output as JSON with geometry
  const query = `
    [out:json][timeout:30];
    (
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"]
        (${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Generate corridor tiles — a chain of overlapping bounding boxes along
 * the straight line from ptA to ptB.
 * 
 * For short distances that fit in a single tile, returns just one bbox.
 * 
 * @param {{ lat: number, lng: number }} ptA - Start point
 * @param {{ lat: number, lng: number }} ptB - End point
 * @returns {Array<{ south: number, west: number, north: number, east: number }>}
 */
export function generateCorridorTiles(ptA, ptB) {
  // Half-size of each tile (radius from center point)
  const halfTile = TILE_SIZE / 2;

  // Padding around the corridor (extra width perpendicular to the line)
  const corridorPadding = TILE_SIZE * 0.5;

  // Step distance between tile centers (tile size minus overlap)
  const step = TILE_SIZE * (1 - TILE_OVERLAP);

  // Vector from A to B
  const dLat = ptB.lat - ptA.lat;
  const dLng = ptB.lng - ptA.lng;
  const lineLength = Math.sqrt(dLat * dLat + dLng * dLng); // in degrees

  // For very short distances, single tile with padding
  if (lineLength < TILE_SIZE) {
    const centerLat = (ptA.lat + ptB.lat) / 2;
    const centerLng = (ptA.lng + ptB.lng) / 2;
    return [{
      south: centerLat - halfTile - corridorPadding,
      north: centerLat + halfTile + corridorPadding,
      west: centerLng - halfTile - corridorPadding,
      east: centerLng + halfTile + corridorPadding,
    }];
  }

  // Number of sample points along the line
  const numSteps = Math.ceil(lineLength / step);
  const tiles = [];
  const seen = new Set(); // deduplicate tiles by rounded center

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const lat = ptA.lat + t * dLat;
    const lng = ptA.lng + t * dLng;

    // Deduplicate very close tile centers
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    tiles.push({
      south: lat - halfTile - corridorPadding,
      north: lat + halfTile + corridorPadding,
      west: lng - halfTile - corridorPadding,
      east: lng + halfTile + corridorPadding,
    });
  }

  return tiles;
}

/**
 * Fetch road network data for a corridor between two points.
 * 
 * Generates tiles, fetches each sequentially with rate limiting,
 * and merges results. Calls onProgress after each tile completes.
 * 
 * @param {{ lat: number, lng: number }} ptA - Start point
 * @param {{ lat: number, lng: number }} ptB - End point
 * @param {function} [onProgress] - Callback: (currentTile, totalTiles) => void
 * @returns {Promise<object>} Merged Overpass API data (same shape as single fetch)
 */
export async function fetchCorridorNetwork(ptA, ptB, onProgress) {
  // Check straight-line distance
  const distKm = haversineKm(ptA.lat, ptA.lng, ptB.lat, ptB.lng);
  if (distKm > MAX_DISTANCE_KM) {
    throw new Error(
      `Distance is ${distKm.toFixed(1)} km — maximum is ${MAX_DISTANCE_KM} km. Pick closer points.`
    );
  }

  const tiles = generateCorridorTiles(ptA, ptB);
  const allElements = [];

  for (let i = 0; i < tiles.length; i++) {
    // Rate-limit between fetches (skip delay for first tile)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
    }

    const data = await fetchRoadNetwork(tiles[i]);

    if (data.elements) {
      allElements.push(...data.elements);
    }

    if (onProgress) {
      onProgress(i + 1, tiles.length);
    }
  }

  // Deduplicate elements by type+id (nodes and ways may appear in overlapping tiles)
  const uniqueMap = new Map();
  for (const el of allElements) {
    const key = `${el.type}-${el.id}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, el);
    }
  }

  return {
    elements: [...uniqueMap.values()],
  };
}

/**
 * Calculate the area of a bounding box in square degrees.
 * Used to warn users if the area is too large for the Overpass API.
 */
export function getBoundsArea(bounds) {
  const { south, west, north, east } = bounds;
  return Math.abs((north - south) * (east - west));
}

/** Maximum recommended bounding box area (in square degrees) */
export const MAX_BOUNDS_AREA = 0.01; // ~roughly 1km x 1km at equator
