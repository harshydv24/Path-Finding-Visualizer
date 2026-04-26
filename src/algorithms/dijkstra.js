/**
 * Dijkstra's Algorithm
 * 
 * Dijkstra's is a special case of A* where h(n) = 0 (no heuristic).
 * It guarantees the shortest path in weighted graphs with non-negative weights.
 * 
 * Without a heuristic, Dijkstra explores nodes in all directions equally,
 * which means it typically visits MORE nodes than A* before finding the goal.
 * This makes it a great comparison to demonstrate A*'s efficiency.
 * 
 * Same generator interface as A* for uniform animation handling.
 */

import { MinHeap } from '../utils/minHeap.js';

/**
 * Dijkstra's pathfinding generator.
 * 
 * @param {Map} nodes - Graph nodes: Map<id, { lat, lng }>
 * @param {Map} adjacency - Adjacency list: Map<id, [{ neighbor, distance }]>
 * @param {number} startId - Start node ID
 * @param {number} goalId - Goal node ID
 * @yields {object} Step snapshots for visualization
 */
export function* dijkstra(nodes, adjacency, startId, goalId) {
  // g(n): shortest known distance from start to n
  const gScore = new Map();
  const cameFrom = new Map();
  const closedSet = new Set();

  gScore.set(startId, 0);

  const openSet = new MinHeap();
  openSet.push(startId, 0);

  let stepCount = 0;

  while (!openSet.isEmpty()) {
    const currentId = openSet.pop();

    if (closedSet.has(currentId)) continue;

    const currentNode = nodes.get(currentId);
    const currentG = gScore.get(currentId) ?? Infinity;

    yield {
      type: 'visit',
      nodeId: currentId,
      lat: currentNode.lat,
      lng: currentNode.lng,
      g: currentG,
      f: currentG, // f = g when h = 0
      step: stepCount++,
    };

    if (currentId === goalId) {
      const path = reconstructPath(cameFrom, currentId, nodes);
      yield { type: 'path', path, distance: currentG, steps: stepCount };
      return;
    }

    closedSet.add(currentId);

    const neighbors = adjacency.get(currentId) || [];
    for (const { neighbor: neighborId, distance } of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const neighborNode = nodes.get(neighborId);
      if (!neighborNode) continue;

      const tentativeG = currentG + distance;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);

        openSet.push(neighborId, tentativeG);

        yield {
          type: 'frontier',
          nodeId: neighborId,
          lat: neighborNode.lat,
          lng: neighborNode.lng,
          g: tentativeG,
          f: tentativeG,
          step: stepCount,
        };
      }
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
