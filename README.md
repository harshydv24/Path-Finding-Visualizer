<p align="center">
  <img src="public/favicon.svg" alt="PathFinder Visualizer" width="64" height="64" />
</p>

<h1 align="center">PathFinder Visualizer</h1>

<p align="center">
  An interactive pathfinding visualizer that runs A*, Dijkstra, and BFS on real OpenStreetMap road networks.
  <br />Click any two points on the map and watch the algorithm explore the city in real time.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenStreetMap-Overpass_API-7EBC6F?logo=openstreetmap&logoColor=white" />
</p>

---

## Overview

PathFinder Visualizer fetches live road network data from OpenStreetMap for any two points you pick on the map, builds a weighted graph in the browser, and animates your chosen algorithm as it searches for the shortest route. Visited nodes, frontier nodes, and the final path are rendered on a canvas overlay above the Leaflet tile layer — giving you a clear picture of how each algorithm behaves on real urban geography.

## Demo

> Default center: **New Delhi, India** — but you can click anywhere in the world (within a 15 km straight-line range).

## Features

- **Three algorithms** — A\*, Dijkstra, and BFS — all implemented as JavaScript generators for frame-accurate animation
- **Live road data** — corridor-based tile fetching from the public Overpass API (no API key needed)
- **Graph optimization** — intermediate nodes along straight road segments are collapsed, reducing graph size by 60–80%
- **Step-by-step mode** — advance the algorithm one step at a time for close inspection
- **Adjustable speed** — control how many steps are processed per animation frame
- **Live metrics panel** — tracks nodes visited, path length, execution time, and a search progress bar
- **Two A\* heuristics** — Haversine (great-circle, accurate) and Euclidean (approximation, faster)
- **Canvas overlay** — graph edges, visited nodes, frontier nodes, and the final path are all rendered on a `<canvas>` element layered over the map
- **Dark-mode native** — Linear-inspired design system, always dark

## How It Works

### 1. Click to Place Points

Click the map to set a **start** point, then click again to set an **end** point. The app immediately fetches the road network between them.

### 2. Road Data Loading

The straight-line corridor between your two points is divided into overlapping tiles. Each tile fetches `highway=*` ways and their nodes from the Overpass API. Tiles are fetched sequentially to respect rate limits, and progress is shown in the control panel.

Maximum supported distance: **15 km** (straight line).

### 3. Graph Construction

Raw OSM data is converted into an adjacency list graph:
- Only **intersection nodes** (referenced by 2+ ways) and **endpoints** are kept as vertices
- Intermediate nodes along a straight segment are collapsed into a single weighted edge
- Edge weights are the **Haversine distance** in meters between the two endpoints

### 4. Pathfinding

All three algorithms are implemented as [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*), yielding one step at a time. The animation loop processes `N` steps per `requestAnimationFrame` call (where `N` is your speed setting), then batch-updates React state to avoid per-step re-renders.

Each step is one of four event types:

| Type | Meaning |
|---|---|
| `visit` | Node popped from the open set — now being explored |
| `frontier` | Neighbor discovered and added to the open set |
| `path` | Goal reached — final path with distance attached |
| `no-path` | Open set exhausted — no route exists |

## Algorithms

### A\* Search
Uses `f(n) = g(n) + h(n)` where `g(n)` is the actual cost from start and `h(n)` is the heuristic estimate to the goal. The Haversine heuristic is **admissible** (never overestimates real road distance), so A\* is guaranteed to find the optimal path while visiting fewer nodes than Dijkstra.

**Heuristic options:**
- `haversine` — great-circle distance in meters (accurate, default)
- `euclidean` — flat-Earth approximation (faster to compute, less accurate over larger distances)

### Dijkstra's Algorithm
A special case of A\* with `h(n) = 0`. Explores in all directions uniformly — finds the guaranteed shortest path but visits significantly more nodes than A\* before reaching the goal. Great for seeing how a heuristic changes the search shape.

### Breadth-First Search (BFS)
Explores layer by layer using a FIFO queue. Finds the path with the **fewest road segments** (hops), not the shortest by distance. Produces a visually distinctive uniform expanding ring from the start node. Path length is calculated post-hoc using Haversine.

## Project Structure

```
src/
├── algorithms/
│   ├── astar.js          # A* generator with MinHeap open set
│   ├── dijkstra.js       # Dijkstra generator (A* with h=0)
│   └── bfs.js            # BFS generator with FIFO queue
├── utils/
│   ├── overpassApi.js    # Corridor tile fetching from Overpass API
│   ├── graphBuilder.js   # OSM → adjacency list, node collapsing
│   ├── haversine.js      # Haversine & Euclidean distance functions
│   └── minHeap.js        # Binary min-heap for A* / Dijkstra open sets
├── components/
│   ├── Header.jsx        # App title and branding
│   ├── MapView.jsx       # Leaflet map + canvas overlay rendering
│   ├── CanvasOverlay.jsx # Draws graph edges, visited, frontier, path
│   ├── ControlPanel.jsx  # Algorithm picker, speed, run/step/reset
│   ├── MetricsPanel.jsx  # Live stats: nodes visited, distance, time
│   └── Legend.jsx        # Color key for visualization states
├── App.jsx               # Root state, click handler, animation loop
└── App.css               # Dark-mode design system (Linear-inspired)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 5 |
| Map rendering | Leaflet 1.9, react-leaflet 5 |
| Visualization | HTML5 Canvas (custom overlay) |
| Road data | OpenStreetMap via Overpass API |
| Distance math | Haversine formula (custom implementation) |
| Icons | lucide-react |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- An internet connection (road data is fetched live from the Overpass API)

### Installation

```sh
# 1. Clone the repository
git clone https://github.com/harshydv24/path-finding-visualizer.git
cd path-finding-visualizer

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |

## Usage Guide

1. **Set start** — Click any point on the map. A green marker appears.
2. **Set end** — Click a second point. Road data loads automatically (progress shown in the panel).
3. **Choose algorithm** — Pick A\*, Dijkstra, or BFS from the control panel.
4. **Tune settings** — Select a heuristic (A\* only) and set the animation speed.
5. **Visualize** — Click **Run** to animate, or **Step** to advance one node at a time.
6. **Reset** — Click **Reset** (or click a new start point) to clear and start over.

## Limitations

- Maximum straight-line distance between points: **15 km**
- The Overpass API is a free public service — response time varies with server load
- Very dense road networks (city centres) may have large graphs and slower load times
- BFS path length is in meters but the path is not distance-optimal (it minimizes hops)

## Contributing

Found a bug or want to add another algorithm (Bidirectional A\*, Greedy Best-First)?

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

This project uses road data from [OpenStreetMap](https://www.openstreetmap.org/), available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).

---

<p align="center">If this helped you understand pathfinding, give it a ⭐</p>
