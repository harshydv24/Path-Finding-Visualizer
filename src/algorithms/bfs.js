/**
 * Breadth-First Search (BFS)
 * 
 * BFS explores nodes layer by layer, expanding all neighbors at distance k
 * before moving to distance k+1. It finds the path with the fewest edges
 * (not necessarily the shortest by weight).
 * 
 * On road networks, BFS treats all roads as equal length, which produces
 * suboptimal paths but is interesting to visualize — it creates a uniform
 * expanding circle from the start node.
 * 
 * Same generator interface as A* and Dijkstra for uniform animation handling.
 */

/**
 * BFS pathfinding generator.
 * 
 * @param {Map} nodes - Graph nodes: Map<id, { lat, lng }>
 * @param {Map} adjacency - Adjacency list: Map<id, [{ neighbor, distance }]>
 * @param {number} startId - Start node ID
 * @param {number} goalId - Goal node ID
 * @yields {object} Step snapshots for visualization
 */
export function* bfs(nodes, adjacency, startId, goalId) {
  const visited = new Set();
  const cameFrom = new Map();
  const queue = [startId];

  visited.add(startId);

  let stepCount = 0;

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentNode = nodes.get(currentId);

    yield {
      type: 'visit',
      nodeId: currentId,
      lat: currentNode.lat,
      lng: currentNode.lng,
      g: 0,
      f: 0,
      step: stepCount++,
    };

    if (currentId === goalId) {
      const path = reconstructPath(cameFrom, currentId, nodes);
      yield { type: 'path', path, distance: calculatePathDistance(path), steps: stepCount };
      return;
    }

    const neighbors = adjacency.get(currentId) || [];
    for (const { neighbor: neighborId } of neighbors) {
      if (visited.has(neighborId)) continue;

      const neighborNode = nodes.get(neighborId);
      if (!neighborNode) continue;

      visited.add(neighborId);
      cameFrom.set(neighborId, currentId);
      queue.push(neighborId);

      yield {
        type: 'frontier',
        nodeId: neighborId,
        lat: neighborNode.lat,
        lng: neighborNode.lng,
        g: 0,
        f: 0,
        step: stepCount,
      };
    }
  }

  yield { type: 'no-path', reason: 'No path found', steps: stepCount };
}

function reconstructPath(cameFrom, currentId, nodes) {
  const path = [];
  let nodeId = currentId;

  while (nodeId !== undefined) {
    const node = nodes.get(nodeId);
    path.unshift({ id: nodeId, lat: node.lat, lng: node.lng });
    nodeId = cameFrom.get(nodeId);
  }

  return path;
}

/**
 * Calculate total distance of a path (sum of Haversine between consecutive nodes).
 */
function calculatePathDistance(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const { lat: lat1, lng: lng1 } = path[i - 1];
    const { lat: lat2, lng: lng2 } = path[i];
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6_371_000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}
