import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * CanvasOverlay
 * 
 * A custom Leaflet Canvas layer for rendering algorithm visualization.
 * Uses refs for all visualization data to avoid re-render cascades.
 * The draw loop runs independently via requestAnimationFrame.
 * 
 * The canvas is placed inside the map's overlay pane and repositioned
 * on every frame so that drawn content tracks map pan / zoom exactly.
 * 
 * Colors adjusted for Linear's indigo-violet accent palette.
 */
function CanvasOverlay({ visitedNodes, frontierNodes, pathNodes, graphNodes, graphEdges, totalSteps }) {
  const map = useMap();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Store props in refs so the draw loop always has current data
  // without needing to restart when props change
  const dataRef = useRef({ visitedNodes, frontierNodes, pathNodes, graphNodes, graphEdges, totalSteps });
  dataRef.current = { visitedNodes, frontierNodes, pathNodes, graphNodes, graphEdges, totalSteps };

  // Create and manage the canvas element + animation loop
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '450';

    const pane = map.getPane('overlayPane');
    if (pane) {
      pane.appendChild(canvas);
    }
    canvasRef.current = canvas;

    const resize = () => {
      const size = map.getSize();
      canvas.width = size.x * window.devicePixelRatio;
      canvas.height = size.y * window.devicePixelRatio;
      canvas.style.width = size.x + 'px';
      canvas.style.height = size.y + 'px';
    };

    resize();
    map.on('resize', resize);
    map.on('zoomend', resize);

    /**
     * Reposition the canvas so that its (0,0) corresponds to layer
     * point (0,0). Leaflet translates the overlayPane during panning;
     * we compensate by setting the canvas top/left to the negated
     * pixel origin, keeping our layer-point draws perfectly aligned.
     */
    const reposition = () => {
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
    };

    // Draw function — reads from dataRef for current props
    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Keep canvas aligned with the map pane
      reposition();

      const dpr = window.devicePixelRatio;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const { visitedNodes, frontierNodes, pathNodes, graphNodes, graphEdges, totalSteps } = dataRef.current;

      const zoom = map.getZoom();
      const baseRadius = Math.max(2, Math.min(6, zoom - 10));

      // Convert lat/lng → pixel position relative to container (after
      // the canvas itself has been offset to match the layer origin,
      // using containerPoint gives us the correct position).
      const toPixel = (lat, lng) => {
        const point = map.latLngToContainerPoint([lat, lng]);
        return { x: point.x, y: point.y };
      };

      // 1. Draw graph edges (subtle indigo tint)
      if (graphEdges && graphEdges.length > 0 && graphNodes) {
        ctx.strokeStyle = 'rgba(94, 106, 210, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const { from, to } of graphEdges) {
          const fromNode = graphNodes.get(from);
          const toNode = graphNodes.get(to);
          if (!fromNode || !toNode) continue;
          const p1 = toPixel(fromNode.lat, fromNode.lng);
          const p2 = toPixel(toNode.lat, toNode.lng);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
      }

      // 2. Draw visited nodes (deep indigo → bright violet gradient)
      if (visitedNodes && visitedNodes.length > 0) {
        const maxStep = totalSteps || visitedNodes.length;
        for (let i = 0; i < visitedNodes.length; i++) {
          const node = visitedNodes[i];
          const p = toPixel(node.lat, node.lng);
          const t = Math.min(1, node.step / maxStep);

          // Gradient: deep indigo (#3b3f8a) → bright violet (#7170ff)
          const r = Math.round(59 + t * (113 - 59));
          const g = Math.round(63 + t * (112 - 63));
          const b = Math.round(138 + t * (255 - 138));
          const alpha = 0.45 + t * 0.4;

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, baseRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Draw frontier nodes (pulsing amber)
      if (frontierNodes && frontierNodes.length > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        const r = baseRadius * (1 + pulse * 0.3);

        for (const node of frontierNodes) {
          const p = toPixel(node.lat, node.lng);

          // Glow
          ctx.fillStyle = `rgba(245, 158, 11, ${0.2 + pulse * 0.15})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(245, 158, 11, ${0.6 + pulse * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Draw final path (bright emerald green, thick line)
      if (pathNodes && pathNodes.length > 1) {
        // Path glow
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.lineWidth = baseRadius * 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < pathNodes.length; i++) {
          const p = toPixel(pathNodes[i].lat, pathNodes[i].lng);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Path core
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = baseRadius * 1.8;
        ctx.beginPath();
        for (let i = 0; i < pathNodes.length; i++) {
          const p = toPixel(pathNodes[i].lat, pathNodes[i].lng);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Path nodes
        for (const node of pathNodes) {
          const p = toPixel(node.lat, node.lng);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(p.x, p.y, baseRadius + 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    };

    // Animation loop
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    // Also redraw on map moves
    map.on('move', draw);
    map.on('moveend', draw);
    map.on('zoomend', draw);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('resize', resize);
      map.off('zoomend', resize);
      map.off('move', draw);
      map.off('moveend', draw);
      map.off('zoomend', draw);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [map]);

  return null;
}

export default CanvasOverlay;
