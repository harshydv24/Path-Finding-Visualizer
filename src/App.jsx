import { useState, useRef, useCallback, useEffect } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import MetricsPanel from './components/MetricsPanel';
import Legend from './components/Legend';
import { fetchCorridorNetwork, MAX_DISTANCE_KM } from './utils/overpassApi';
import { buildGraph, findNearestNode } from './utils/graphBuilder';
import { astar } from './algorithms/astar';
import { dijkstra } from './algorithms/dijkstra';
import { bfs } from './algorithms/bfs';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Default center: New Delhi, India
const DEFAULT_CENTER = [28.6139, 77.2090];
const DEFAULT_ZOOM = 15;

function App() {
  // Map state
  const [mapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom] = useState(DEFAULT_ZOOM);

  // Click-selected points (raw lat/lng, before graph snapping)
  const [rawStart, setRawStart] = useState(null);
  const [rawEnd, setRawEnd] = useState(null);

  // Graph-snapped nodes (set after auto-load)
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);

  // Graph state
  const [graph, setGraph] = useState(null);
  const [graphInfo, setGraphInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadProgress, setLoadProgress] = useState(null); // { current, total }

  // Algorithm state
  const [algorithm, setAlgorithm] = useState('A*');
  const [heuristic, setHeuristic] = useState('haversine');
  const [speed, setSpeed] = useState(10);

  // Visualization state
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [frontierNodes, setFrontierNodes] = useState([]);
  const [pathNodes, setPathNodes] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState(null);

  // Edges for rendering the graph
  const [graphEdges, setGraphEdges] = useState([]);

  // Refs for animation control
  const generatorRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const isPausedRef = useRef(false);
  const stepsBufferRef = useRef([]);
  const visitedBufferRef = useRef([]);
  const frontierMapRef = useRef(new Map());

  // Always dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  // Derive the current status message for the UI
  const status = isLoading
    ? 'loading'
    : isRunning
      ? 'running'
      : !rawStart
        ? 'set-start'
        : !rawEnd
          ? 'set-end'
          : graph && startNode && endNode
            ? 'ready'
            : 'set-start'; // fallback

  // ─── Auto-load graph when both points are set ─────────────────────
  const loadGraphForPoints = useCallback(async (ptA, ptB) => {
    setIsLoading(true);
    setLoadError(null);
    setLoadProgress(null);

    try {
      // Corridor-based tile loading with progress tracking
      const data = await fetchCorridorNetwork(ptA, ptB, (current, total) => {
        setLoadProgress({ current, total });
      });

      const result = buildGraph(data);

      if (result.nodeCount === 0) {
        setLoadError('No road network found in this area. Try a different location.');
        setRawEnd(null);
        return;
      }

      setGraph(result);
      setGraphInfo({ nodeCount: result.nodeCount, edgeCount: result.edgeCount });

      // Build edges array for canvas rendering
      const edges = [];
      const seen = new Set();
      for (const [nodeId, neighbors] of result.adjacency) {
        for (const { neighbor } of neighbors) {
          const key = nodeId < neighbor ? `${nodeId}-${neighbor}` : `${neighbor}-${nodeId}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({ from: nodeId, to: neighbor });
          }
        }
      }
      setGraphEdges(edges);

      // Snap both points to nearest graph nodes
      const startId = findNearestNode(result.nodes, ptA.lat, ptA.lng);
      const endId = findNearestNode(result.nodes, ptB.lat, ptB.lng);

      if (!startId || !endId) {
        setLoadError('Could not snap points to road network. Try different locations.');
        setRawEnd(null);
        return;
      }

      const sNode = result.nodes.get(startId);
      const eNode = result.nodes.get(endId);
      setStartNode({ id: startId, lat: sNode.lat, lng: sNode.lng });
      setEndNode({ id: endId, lat: eNode.lat, lng: eNode.lng });

      // Reset any previous visualization
      setVisitedNodes([]);
      setFrontierNodes([]);
      setPathNodes([]);
      setMetrics(null);

    } catch (err) {
      console.error('Failed to load map data:', err);
      setLoadError(err.message);
      setRawEnd(null);
    } finally {
      setIsLoading(false);
      setLoadProgress(null);
    }
  }, []);

  // ─── Handle map click — direct point placement ────────────────────
  const handleMapClick = useCallback((lat, lng) => {
    if (isRunning || isLoading) return;

    if (!rawStart) {
      // First click → set start
      setRawStart({ lat, lng });
      // Clear everything from a previous session
      setRawEnd(null);
      setStartNode(null);
      setEndNode(null);
      setGraph(null);
      setGraphInfo(null);
      setGraphEdges([]);
      setVisitedNodes([]);
      setFrontierNodes([]);
      setPathNodes([]);
      setMetrics(null);
    } else if (!rawEnd) {
      // Second click → set end, auto-load graph
      const newEnd = { lat, lng };
      setRawEnd(newEnd);
      loadGraphForPoints(rawStart, newEnd);
    } else {
      // Both are set → restart: new start point, clear end
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      generatorRef.current = null;

      setRawStart({ lat, lng });
      setRawEnd(null);
      setStartNode(null);
      setEndNode(null);
      setGraph(null);
      setGraphInfo(null);
      setGraphEdges([]);
      setVisitedNodes([]);
      setFrontierNodes([]);
      setPathNodes([]);
      setMetrics(null);
      setIsRunning(false);
      visitedBufferRef.current = [];
      frontierMapRef.current = new Map();
    }
  }, [rawStart, rawEnd, isRunning, isLoading, loadGraphForPoints]);

  // ─── Visualization ────────────────────────────────────────────────
  const handleVisualize = useCallback(() => {
    if (!graph || !startNode || !endNode || isRunning) return;

    // Reset previous visualization
    setVisitedNodes([]);
    setFrontierNodes([]);
    setPathNodes([]);
    visitedBufferRef.current = [];
    frontierMapRef.current = new Map();

    // Select algorithm
    let gen;
    switch (algorithm) {
      case 'A*':
        gen = astar(graph.nodes, graph.adjacency, startNode.id, endNode.id, heuristic);
        break;
      case 'Dijkstra':
        gen = dijkstra(graph.nodes, graph.adjacency, startNode.id, endNode.id);
        break;
      case 'BFS':
        gen = bfs(graph.nodes, graph.adjacency, startNode.id, endNode.id);
        break;
      default:
        gen = astar(graph.nodes, graph.adjacency, startNode.id, endNode.id, heuristic);
    }

    generatorRef.current = gen;
    startTimeRef.current = performance.now();
    isPausedRef.current = false;
    setIsRunning(true);
    setMetrics({
      nodesVisited: 0,
      totalNodes: graph.nodeCount,
      pathLength: 0,
      executionTime: 0,
      pathFound: null,
      stepsProcessed: 0,
    });

    // Start animation loop
    const animate = () => {
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const gen = generatorRef.current;
      if (!gen) return;

      let done = false;

      // Process `speed` steps per frame
      for (let i = 0; i < speed; i++) {
        const result = gen.next();

        if (result.done) {
          done = true;
          break;
        }

        const step = result.value;

        if (step.type === 'visit') {
          visitedBufferRef.current.push(step);
          // Remove from frontier
          frontierMapRef.current.delete(step.nodeId);
        } else if (step.type === 'frontier') {
          frontierMapRef.current.set(step.nodeId, step);
        } else if (step.type === 'path') {
          setPathNodes(step.path);
          setMetrics((prev) => ({
            ...prev,
            pathLength: step.distance || 0,
            pathFound: true,
            executionTime: performance.now() - startTimeRef.current,
            stepsProcessed: step.steps || prev.stepsProcessed,
          }));
          done = true;
          break;
        } else if (step.type === 'no-path') {
          setMetrics((prev) => ({
            ...prev,
            pathFound: false,
            executionTime: performance.now() - startTimeRef.current,
          }));
          done = true;
          break;
        }
      }

      // Batch update React state (avoid per-step re-renders)
      setVisitedNodes([...visitedBufferRef.current]);
      setFrontierNodes([...frontierMapRef.current.values()]);
      setMetrics((prev) => ({
        ...prev,
        nodesVisited: visitedBufferRef.current.length,
        executionTime: performance.now() - startTimeRef.current,
      }));

      if (done) {
        setIsRunning(false);
        generatorRef.current = null;
        return;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [graph, startNode, endNode, algorithm, heuristic, speed, isRunning]);

  // Step through one iteration
  const handleStep = useCallback(() => {
    if (!graph || !startNode || !endNode) return;

    // If not running, start the generator
    if (!generatorRef.current) {
      let gen;
      switch (algorithm) {
        case 'A*':
          gen = astar(graph.nodes, graph.adjacency, startNode.id, endNode.id, heuristic);
          break;
        case 'Dijkstra':
          gen = dijkstra(graph.nodes, graph.adjacency, startNode.id, endNode.id);
          break;
        case 'BFS':
          gen = bfs(graph.nodes, graph.adjacency, startNode.id, endNode.id);
          break;
        default:
          gen = astar(graph.nodes, graph.adjacency, startNode.id, endNode.id, heuristic);
      }
      generatorRef.current = gen;
      startTimeRef.current = performance.now();
      visitedBufferRef.current = [];
      frontierMapRef.current = new Map();
      setVisitedNodes([]);
      setFrontierNodes([]);
      setPathNodes([]);
      setIsRunning(true);
      setMetrics({
        nodesVisited: 0,
        totalNodes: graph.nodeCount,
        pathLength: 0,
        executionTime: 0,
        pathFound: null,
        stepsProcessed: 0,
      });
    }

    // Single step
    const gen = generatorRef.current;
    if (!gen) return;

    const result = gen.next();

    if (result.done) {
      setIsRunning(false);
      generatorRef.current = null;
      return;
    }

    const step = result.value;

    if (step.type === 'visit') {
      visitedBufferRef.current.push(step);
      frontierMapRef.current.delete(step.nodeId);
    } else if (step.type === 'frontier') {
      frontierMapRef.current.set(step.nodeId, step);
    } else if (step.type === 'path') {
      setPathNodes(step.path);
      setMetrics((prev) => ({
        ...prev,
        pathLength: step.distance || 0,
        pathFound: true,
        executionTime: performance.now() - startTimeRef.current,
      }));
      setIsRunning(false);
      generatorRef.current = null;
    } else if (step.type === 'no-path') {
      setMetrics((prev) => ({
        ...prev,
        pathFound: false,
        executionTime: performance.now() - startTimeRef.current,
      }));
      setIsRunning(false);
      generatorRef.current = null;
    }

    setVisitedNodes([...visitedBufferRef.current]);
    setFrontierNodes([...frontierMapRef.current.values()]);
    setMetrics((prev) => ({
      ...prev,
      nodesVisited: visitedBufferRef.current.length,
      executionTime: performance.now() - startTimeRef.current,
    }));
  }, [graph, startNode, endNode, algorithm, heuristic]);

  // Reset everything
  const handleReset = useCallback(() => {
    // Stop animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    generatorRef.current = null;

    setIsRunning(false);
    setRawStart(null);
    setRawEnd(null);
    setStartNode(null);
    setEndNode(null);
    setGraph(null);
    setGraphInfo(null);
    setGraphEdges([]);
    setVisitedNodes([]);
    setFrontierNodes([]);
    setPathNodes([]);
    setMetrics(null);
    setLoadError(null);
    setLoadProgress(null);
    visitedBufferRef.current = [];
    frontierMapRef.current = new Map();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Use snapped nodes for markers when available, fall back to raw clicks
  const displayStart = startNode || rawStart;
  const displayEnd = endNode || rawEnd;

  return (
    <div className="app" data-theme="dark">
      <Header />

      <main className="app-main">
        <MapView
          startNode={displayStart}
          endNode={displayEnd}
          onMapClick={handleMapClick}
          visitedNodes={visitedNodes}
          frontierNodes={frontierNodes}
          pathNodes={pathNodes}
          graphNodes={graph?.nodes || null}
          graphEdges={graphEdges}
          totalSteps={visitedNodes.length}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          isClickable={!isRunning && !isLoading}
        />

        <div className="sidebar">
          <ControlPanel
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            heuristic={heuristic}
            setHeuristic={setHeuristic}
            speed={speed}
            setSpeed={setSpeed}
            onVisualize={handleVisualize}
            onReset={handleReset}
            onStep={handleStep}
            isRunning={isRunning}
            isLoading={isLoading}
            loadProgress={loadProgress}
            graphInfo={graphInfo}
            status={status}
            hasStart={!!rawStart}
            hasEnd={!!rawEnd}
          />

          <MetricsPanel
            metrics={metrics}
            isRunning={isRunning}
            algorithm={algorithm}
          />

          <Legend />
        </div>
      </main>

      {/* Error toast */}
      {loadError && (
        <div className="error-toast" onClick={() => setLoadError(null)}>
          <span>❌</span> {loadError}
          <button className="toast-close">✕</button>
        </div>
      )}
    </div>
  );
}

export default App;
