/**
 * Legend
 * 
 * Color legend explaining what each visualization color means.
 * Linear-style: subtle items, monochrome labels, Lucide icons for markers.
 */
import { Navigation, Crosshair } from 'lucide-react';

function Legend() {
  const items = [
    { color: '#1e40af', label: 'Visited (early)', shape: 'circle' },
    { color: '#06b6d4', label: 'Visited (late)', shape: 'circle' },
    { color: '#f59e0b', label: 'Frontier', shape: 'circle' },
    { color: '#10b981', label: 'Shortest Path', shape: 'line' },
    { color: '#10b981', label: 'Start', shape: 'marker-start' },
    { color: '#ef4444', label: 'End', shape: 'marker-end' },
  ];

  return (
    <div className="legend-panel">
      <h4 className="legend-title">Legend</h4>
      <div className="legend-items">
        {items.map((item) => (
          <div key={item.label} className="legend-item">
            {item.shape === 'circle' && (
              <span className="legend-circle" style={{ background: item.color }} />
            )}
            {item.shape === 'line' && (
              <span className="legend-line" style={{ background: item.color }} />
            )}
            {item.shape === 'marker-start' && (
              <span className="legend-marker" style={{ background: item.color }}>
                <Navigation size={9} strokeWidth={2.5} color="#fff" />
              </span>
            )}
            {item.shape === 'marker-end' && (
              <span className="legend-marker" style={{ background: item.color }}>
                <Crosshair size={9} strokeWidth={2.5} color="#fff" />
              </span>
            )}
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Legend;
