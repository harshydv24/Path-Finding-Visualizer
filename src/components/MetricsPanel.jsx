/**
 * MetricsPanel
 * 
 * Displays live statistics during and after pathfinding visualization.
 * Shows nodes visited, path length, execution time, and a progress indicator.
 * Linear-style: monospace values, subtle borders, weight-510 labels.
 */
import { Activity } from 'lucide-react';

function MetricsPanel({ metrics, isRunning, algorithm }) {
  if (!metrics && !isRunning) return null;

  const {
    nodesVisited = 0,
    totalNodes = 0,
    pathLength = 0,
    executionTime = 0,
    pathFound = null,
    stepsProcessed = 0,
  } = metrics || {};

  const progress = totalNodes > 0 ? Math.min(100, (nodesVisited / totalNodes) * 100) : 0;

  const formatDistance = (meters) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatTime = (ms) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
    return `${Math.round(ms)} ms`;
  };

  return (
    <div className="metrics-panel">
      <h3 className="metrics-title">
        <Activity size={12} strokeWidth={2} />
        Metrics
        {isRunning && <span className="running-badge">RUNNING</span>}
        {pathFound === true && <span className="success-badge">PATH FOUND</span>}
        {pathFound === false && <span className="fail-badge">NO PATH</span>}
      </h3>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{algorithm}</div>
          <div className="metric-label">Algorithm</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{nodesVisited.toLocaleString()}</div>
          <div className="metric-label">Nodes Visited</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{formatDistance(pathLength)}</div>
          <div className="metric-label">Path Length</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{formatTime(executionTime)}</div>
          <div className="metric-label">Time</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text">
          {nodesVisited} / {totalNodes} nodes ({progress.toFixed(1)}%)
        </div>
      </div>
    </div>
  );
}

export default MetricsPanel;
