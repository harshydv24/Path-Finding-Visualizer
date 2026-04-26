/**
 * ControlPanel
 * 
 * Sidebar panel with status display, algorithm selection, speed control,
 * and action buttons. Streamlined click-to-pathfind workflow.
 */
import {
  MousePointer2,
  Navigation,
  Crosshair,
  Zap,
  SlidersHorizontal,
  Play,
  SkipForward,
  RotateCcw,
  Loader2,
  GitFork,
  Route,
  CheckCircle2,
} from 'lucide-react';

function ControlPanel({
  algorithm,
  setAlgorithm,
  heuristic,
  setHeuristic,
  speed,
  setSpeed,
  onVisualize,
  onReset,
  onStep,
  isRunning,
  isLoading,
  loadProgress,
  graphInfo,
  status,
  hasStart,
  hasEnd,
}) {
  const canVisualize = status === 'ready' && !isRunning;

  return (
    <div className="control-panel">
      {/* ── Status Display ── */}
      <div className="panel-section">
        <h3 className="panel-title">
          <MousePointer2 size={12} strokeWidth={2} />
          Status
        </h3>
        <div className={`status-display status-${status}`}>
          {status === 'set-start' && (
            <>
              <span className="status-icon"><Navigation size={14} strokeWidth={2} /></span>
              <span className="status-text">Click the map to set <strong>start point</strong></span>
            </>
          )}
          {status === 'set-end' && (
            <>
              <span className="status-icon"><Crosshair size={14} strokeWidth={2} /></span>
              <span className="status-text">Click the map to set <strong>end point</strong></span>
            </>
          )}
          {status === 'loading' && (
            <>
              <span className="status-icon"><Loader2 size={14} strokeWidth={2} className="spin-icon" /></span>
              <div className="status-content">
                <span className="status-text">
                  {loadProgress && loadProgress.total > 1
                    ? <>Loading tile <strong>{loadProgress.current}</strong> of <strong>{loadProgress.total}</strong>…</>
                    : <>Loading road network…</>
                  }
                </span>
                {loadProgress && loadProgress.total > 1 && (
                  <div className="tile-progress">
                    <div className="tile-progress-bar">
                      <div
                        className="tile-progress-fill"
                        style={{ width: `${(loadProgress.current / loadProgress.total) * 100}%` }}
                      />
                    </div>
                    <span className="tile-progress-text">
                      {Math.round((loadProgress.current / loadProgress.total) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          {status === 'ready' && (
            <>
              <span className="status-icon"><CheckCircle2 size={14} strokeWidth={2} /></span>
              <span className="status-text">Ready to <strong>visualize</strong></span>
            </>
          )}
          {status === 'running' && (
            <>
              <span className="status-icon"><Loader2 size={14} strokeWidth={2} className="spin-icon" /></span>
              <span className="status-text">Algorithm running…</span>
            </>
          )}
        </div>
      </div>

      <div className="panel-divider" />

      {/* ── Algorithm ── */}
      <div className="panel-section">
        <h3 className="panel-title">
          <Zap size={12} strokeWidth={2} />
          Algorithm
        </h3>
        <div className="algorithm-selector">
          {['A*', 'Dijkstra', 'BFS'].map((algo) => (
            <button
              key={algo}
              className={`algo-btn ${algorithm === algo ? 'active' : ''}`}
              onClick={() => setAlgorithm(algo)}
              disabled={isRunning}
            >
              {algo}
            </button>
          ))}
        </div>

        {algorithm === 'A*' && (
          <div className="heuristic-toggle">
            <label className="toggle-label">Heuristic</label>
            <div className="toggle-buttons">
              {['haversine', 'euclidean'].map((h) => (
                <button
                  key={h}
                  className={`toggle-btn ${heuristic === h ? 'active' : ''}`}
                  onClick={() => setHeuristic(h)}
                  disabled={isRunning}
                >
                  {h.charAt(0).toUpperCase() + h.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel-divider" />

      {/* ── Speed ── */}
      <div className="panel-section">
        <h3 className="panel-title">
          <SlidersHorizontal size={12} strokeWidth={2} />
          Speed
        </h3>
        <div className="speed-control">
          <input
            type="range"
            min="1"
            max="100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="speed-slider"
            disabled={false}
          />
          <div className="speed-labels">
            <span>Slow</span>
            <span className="speed-value">{speed} steps/frame</span>
            <span>Fast</span>
          </div>
        </div>
      </div>

      <div className="panel-divider" />

      {/* ── Action Buttons ── */}
      <div className="panel-section">
        <div className="action-buttons">
          <button
            className="btn btn-visualize"
            onClick={onVisualize}
            disabled={!canVisualize}
          >
            <span className="btn-icon"><Play size={14} strokeWidth={2} fill="currentColor" /></span>
            Visualize
          </button>

          <button
            className="btn btn-step"
            onClick={onStep}
            disabled={!canVisualize && !isRunning}
          >
            <span className="btn-icon"><SkipForward size={14} strokeWidth={2} /></span>
            Step
          </button>

          <button
            className="btn btn-reset"
            onClick={onReset}
            disabled={isLoading}
          >
            <span className="btn-icon"><RotateCcw size={14} strokeWidth={2} /></span>
            Reset
          </button>
        </div>
      </div>

      {graphInfo && (
        <>
          <div className="panel-divider" />
          <div className="panel-section">
            <div className="graph-info">
              <span><GitFork size={12} strokeWidth={1.8} /> {graphInfo.nodeCount} nodes</span>
              <span><Route size={12} strokeWidth={1.8} /> {graphInfo.edgeCount} edges</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ControlPanel;
