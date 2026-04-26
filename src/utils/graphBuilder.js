/**
 * Graph Builder
 * 
 * Converts raw Overpass API JSON into a clean adjacency list graph.
 * 
 * Key optimization: We only keep "intersection" nodes — nodes that appear in
 * 2+ ways, or are at the start/end of a way. Intermediate nodes along a
 * straight road segment are collapsed into a single weighted edge.
 * This typically reduces graph size by 60–80%.
 * 
 * Graph structure:
 *   nodes: Map<nodeId, { id, lat, lng }>
 *   adjacency: Map<nodeId, [{ neighbor, distance }]>
 */

import { haversine } from './haversine.js';

/**
 * Build a graph from Overpass API response data.
 * 
 * @param {object} overpassData - Raw JSON from the Overpass API
 * @returns {{ nodes: Map, adjacency: Map, nodeCount: number, edgeCount: number }}
 */
export function buildGraph(overpassData) {
  const elements = overpassData.elements;

  // Step 1: Separate nodes and ways
  const rawNodes = new Map(); // id → { lat, lon }
  const ways = [];

  for (const el of elements) {
    if (el.type === 'node') {
      rawNodes.set(el.id, { lat: el.lat, lng: el.lon });
    } else if (el.type === 'way' && el.nodes) {
      ways.push(el);
    }
  }

  // Step 2: Count how many ways reference each node.
  // Nodes referenced by 2+ ways are intersections and must be kept.
  const nodeWayCount = new Map();
  for (const way of ways) {
    for (const nodeId of way.nodes) {
      nodeWayCount.set(nodeId, (nodeWayCount.get(nodeId) || 0) + 1);
    }
  }

  // Step 3: Determine which nodes to keep as graph vertices.
  // Keep a node if:
  //   - It's referenced by 2+ ways (intersection)
  //   - It's the first or last node of any way (endpoint)
  const keepNodes = new Set();
  for (const way of ways) {
    const nodeIds = way.nodes;
    if (nodeIds.length < 2) continue;

    // Always keep endpoints
    keepNodes.add(nodeIds[0]);
    keepNodes.add(nodeIds[nodeIds.length - 1]);

    // Keep intersections
    for (const nodeId of nodeIds) {
      if (nodeWayCount.get(nodeId) >= 2) {
        keepNodes.add(nodeId);
      }
    }
  }

  // Step 4: Build the graph nodes map (only kept nodes)
  const nodes = new Map();
  for (const nodeId of keepNodes) {
    const raw = rawNodes.get(nodeId);
    if (raw) {
      nodes.set(nodeId, { id: nodeId, lat: raw.lat, lng: raw.lng });
    }
  }

  // Step 5: Build adjacency list by walking each way.
  // For each pair of consecutive "kept" nodes in a way, create an edge
  // whose weight is the sum of Haversine distances of the intermediate segments.
  const adjacency = new Map();
  let edgeCount = 0;

  const addEdge = (fromId, toId, distance) => {
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    if (!adjacency.has(toId)) adjacency.set(toId, []);
    adjacency.get(fromId).push({ neighbor: toId, distance });
    adjacency.get(toId).push({ neighbor: fromId, distance });
    edgeCount++;
  };

  for (const way of ways) {
    const nodeIds = way.nodes;
    if (nodeIds.length < 2) continue;

    // Check if this is a one-way road
    const isOneway = way.tags?.oneway === 'yes';

    let lastKeptId = null;
    let cumulativeDistance = 0;
    let prevLat = null;
    let prevLng = null;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const raw = rawNodes.get(nodeId);
      if (!raw) continue;

      // Accumulate distance along intermediate nodes
      if (prevLat !== null) {
        cumulativeDistance += haversine(prevLat, prevLng, raw.lat, raw.lng);
      }

      prevLat = raw.lat;
      prevLng = raw.lng;

      // If this node is a kept node, create an edge from the last kept node
      if (keepNodes.has(nodeId)) {
        if (lastKeptId !== null && lastKeptId !== nodeId && cumulativeDistance > 0) {
          if (isOneway) {
            // One-way: only add edge in the direction of the way
            if (!adjacency.has(lastKeptId)) adjacency.set(lastKeptId, []);
            adjacency.get(lastKeptId).push({ neighbor: nodeId, distance: cumulativeDistance });
            if (!adjacency.has(nodeId)) adjacency.set(nodeId, []);
            edgeCount++;
          } else {
            addEdge(lastKeptId, nodeId, cumulativeDistance);
          }
        }
        lastKeptId = nodeId;
        cumulativeDistance = 0;
      }
    }
  }

  // Remove nodes that ended up with zero connections
  for (const nodeId of [...nodes.keys()]) {
    if (!adjacency.has(nodeId) || adjacency.get(nodeId).length === 0) {
      nodes.delete(nodeId);
      adjacency.delete(nodeId);
    }
  }

  return {
    nodes,
    adjacency,
    nodeCount: nodes.size,
    edgeCount,
  };
}

/**
 * Find the nearest graph node to a given lat/lng coordinate.
 * Used to snap user clicks to the nearest intersection.
 * 
 * @param {Map} nodes - The graph nodes
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @returns {number|null} The ID of the nearest node, or null if no nodes
 */
export function findNearestNode(nodes, lat, lng) {
  let nearestId = null;
  let nearestDist = Infinity;

  for (const [id, node] of nodes) {
    const d = haversine(lat, lng, node.lat, node.lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearestId = id;
    }
  }

  return nearestId;
}
