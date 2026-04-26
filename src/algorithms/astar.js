/**
 * A* Search Algorithm
 * 
 * A* is an informed search algorithm that finds the shortest path between
 * a start node and a goal node in a weighted graph. It uses a heuristic
 * function h(n) to estimate the cost from node n to the goal.
 * 
 * Key formula: f(n) = g(n) + h(n)
 *   - g(n): actual cost from start to node n (accumulated edge weights)
 *   - h(n): estimated cost from n to the goal (heuristic)
 *   - f(n): total estimated cost of the cheapest path through n
 * 
 * The heuristic must be ADMISSIBLE (never overestimates) for A* to guarantee
 * the optimal path. Haversine distance is admissible because the straight-line
 * distance is always ≤ the actual road distance.
 * 
 * This implementation uses a generator to yield each step, enabling
 * smooth step-by-step animation in the UI.
 * 
 * Visualization states yielded:
 *   - 'visit':    Node is being explored (popped from open set)
 *   - 'frontier': Node is added/updated in the open set
 *   - 'path':     Final shortest path found
 *   - 'no-path':  No path exists between start and goal
 */

import { MinHeap } from '../utils/minHeap.js';
import { haversine, euclidean } from '../utils/haversine.js';

/**
 * A* pathfinding generator.
 * 
 * @param {Map} nodes - Graph nodes: Map<id, { lat, lng }>
 * @param {Map} adjacency - Adjacency list: Map<id, [{ neighbor, distance }]>
 * @param {number} startId - Start node ID
 * @param {number} goalId - Goal node ID
 * @param {string} heuristicType - 'haversine' or 'euclidean'
 * @yields {object} Step snapshots for visualization
 */
export function* astar(nodes, adjacency, startId, goalId, heuristicType = 'haversine') {
  const heuristicFn = heuristicType === 'euclidean' ? euclidean : haversine;

  const goalNode = nodes.get(goalId);
  if (!goalNode) {
    yield { type: 'no-path', reason: 'Goal node not found' };
    return;
  }

  // g(n): cost from start to n (initially Infinity for all except start)
  const gScore = new Map();
  // f(n): g(n) + h(n)
  const fScore = new Map();
  // Parent pointers for path reconstruction
  const cameFrom = new Map();
  // Track which nodes have been fully explored (closed set)
  const closedSet = new Set();

  // Initialize start node
  gScore.set(startId, 0);
  const startH = heuristicFn(
    nodes.get(startId).lat, nodes.get(startId).lng,
    goalNode.lat, goalNode.lng
  );
  fScore.set(startId, startH);

  // Open set as a min-heap ordered by f(n)
  const openSet = new MinHeap();
  openSet.push(startId, startH);

  let stepCount = 0;

  while (!openSet.isEmpty()) {
    // Pop the node with the lowest f(n) — most promising path
    const currentId = openSet.pop();

    // Skip if already fully explored (may have stale entries in heap)
    if (closedSet.has(currentId)) continue;

    const currentNode = nodes.get(currentId);
    const currentG = gScore.get(currentId) ?? Infinity;
    const currentF = fScore.get(currentId) ?? Infinity;

    // Yield: this node is now being visited/explored
    yield {
      type: 'visit',
      nodeId: currentId,
      lat: currentNode.lat,
      lng: currentNode.lng,
      g: currentG,
      f: currentF,
      step: stepCount++,
    };

    // Goal reached! Reconstruct the path.
    if (currentId === goalId) {
      const path = reconstructPath(cameFrom, currentId, nodes);
      yield { type: 'path', path, distance: currentG, steps: stepCount };
      return;
    }

    // Mark as fully explored
    closedSet.add(currentId);

    // Explore all neighbors
    const neighbors = adjacency.get(currentId) || [];
    for (const { neighbor: neighborId, distance } of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const neighborNode = nodes.get(neighborId);
      if (!neighborNode) continue;

      // Calculate tentative g score through current node
      const tentativeG = currentG + distance;

      // Only update if this path is better than any previously known
      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        // This path is the best so far — record it
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);

        const h = heuristicFn(
          neighborNode.lat, neighborNode.lng,
          goalNode.lat, goalNode.lng
        );
        const f = tentativeG + h;
        fScore.set(neighborId, f);

        // Add to open set (may create duplicate entries, but closedSet handles it)
        openSet.push(neighborId, f);

        // Yield: this neighbor is now in the frontier
        yield {
          type: 'frontier',
          nodeId: neighborId,
          lat: neighborNode.lat,
          lng: neighborNode.lng,
          g: tentativeG,
          f,
          step: stepCount,
        };
      }
    }
  }

  // Open set exhausted without reaching goal — no path exists
  yield { type: 'no-path', reason: 'No path found', steps: stepCount };
}

/**
 * Reconstruct the shortest path by following parent pointers from goal to start.
 */
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
