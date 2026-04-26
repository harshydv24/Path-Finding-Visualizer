import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import CanvasOverlay from './CanvasOverlay';

// Lucide icon SVG paths for use in Leaflet divIcon (raw HTML context)
// Navigation icon (start marker)
const navigationSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
// Crosshair icon (end marker)
const crosshairSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>`;

// Custom marker icons — Linear-style: clean, geometric
const createIcon = (color, svgIcon) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 28px; height: 28px; 
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: rgba(0,0,0,0.4) 0px 2px 4px;
      border: 1.5px solid rgba(255,255,255,0.2);
    "><span style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">${svgIcon}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const startIcon = createIcon('#27a644', navigationSvg);
const endIcon = createIcon('#ef4444', crosshairSvg);

/**
 * MapClickHandler — fires onMapClick for every click; cursor is always crosshair when clickable.
 */
function MapClickHandler({ onMapClick, isClickable }) {
  useMapEvents({
    click: (e) => {
      if (isClickable) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = isClickable ? 'crosshair' : '';
    return () => { container.style.cursor = ''; };
  }, [map, isClickable]);

  return null;
}

/**
 * BoundsTracker — reports map bounds changes to the parent.
 * Extracted as a standalone component to avoid re-mount on parent renders.
 */
function BoundsTracker({ onBoundsChange }) {
  const map = useMap();
  const callbackRef = useRef(onBoundsChange);
  callbackRef.current = onBoundsChange;

  useEffect(() => {
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      callbackRef.current({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    };

    map.on('moveend', handleMoveEnd);
    // Defer initial call to avoid triggering during React render phase
    const timer = setTimeout(handleMoveEnd, 0);

    return () => {
      clearTimeout(timer);
      map.off('moveend', handleMoveEnd);
    };
  }, [map]);

  return null;
}

/**
 * MapView — Main map component
 */
function MapView({
  startNode,
  endNode,
  onMapClick,
  visitedNodes,
  frontierNodes,
  pathNodes,
  graphNodes,
  graphEdges,
  totalSteps,
  mapCenter,
  mapZoom,
  isClickable,
}) {
  // Dark tile layer (always)
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution={tileAttribution}
          maxZoom={19}
        />

        <MapClickHandler
          onMapClick={onMapClick}
          isClickable={isClickable}
        />

        <CanvasOverlay
          visitedNodes={visitedNodes}
          frontierNodes={frontierNodes}
          pathNodes={pathNodes}
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          totalSteps={totalSteps}
        />

        {startNode && (
          <Marker position={[startNode.lat, startNode.lng]} icon={startIcon}>
            <Popup>
              <strong>Start</strong><br />
              {startNode.id ? `Node #${startNode.id}` : `${startNode.lat.toFixed(5)}, ${startNode.lng.toFixed(5)}`}
            </Popup>
          </Marker>
        )}

        {endNode && (
          <Marker position={[endNode.lat, endNode.lng]} icon={endIcon}>
            <Popup>
              <strong>End</strong><br />
              {endNode.id ? `Node #${endNode.id}` : `${endNode.lat.toFixed(5)}, ${endNode.lng.toFixed(5)}`}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;
