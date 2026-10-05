import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon';

export const ROUTE_PTS_MODAL = [
  { x: 55, y: 225, name: 'Edappally Toll (Pickup)' },
  { x: 105, y: 185, name: 'Metro Viaduct Corridor' },
  { x: 175, y: 185, name: 'Palarivattom Bypass' },
  { x: 235, y: 120, name: 'NH 66 Express Flyover' },
  { x: 285, y: 120, name: 'Lulu Junction' },
  { x: 330, y: 50, name: 'Lulu Mall (Destination)' }
];

export const ROUTE_PTS_MINI = [
  { x: 65, y: 155, name: 'Edappally Toll (Pickup)' },
  { x: 115, y: 125, name: 'Metro Corridor' },
  { x: 175, y: 125, name: 'Palarivattom Bypass' },
  { x: 235, y: 80, name: 'NH 66 Flyover' },
  { x: 285, y: 80, name: 'Lulu Junction' },
  { x: 325, y: 40, name: 'Lulu Mall (Destination)' }
];

export function getRouteTelemetry(prog = 0.38, isModal = false) {
  prog = Math.max(0.02, Math.min(0.98, prog));
  const pts = isModal ? ROUTE_PTS_MODAL : ROUTE_PTS_MINI;
  let totalLen = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const d = Math.hypot(dx, dy);
    lens.push(d);
    totalLen += d;
  }
  const targetDist = prog * totalLen;
  let accumulated = 0;
  for (let i = 0; i < lens.length; i++) {
    if (accumulated + lens[i] >= targetDist || i === lens.length - 1) {
      const segT = (targetDist - accumulated) / (lens[i] || 1);
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const x = p0.x + (p1.x - p0.x) * segT;
      const y = p0.y + (p1.y - p0.y) * segT;
      const angle = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
      return {
        x: Math.round(x),
        y: Math.round(y),
        angle: Math.round(angle),
        currentStreet: p0.name
      };
    }
    accumulated += lens[i];
  }
  return { x: pts[0].x, y: pts[0].y, angle: 0, currentStreet: pts[0].name };
}

/**
 * GraphicLiveMap Component
 * High-fidelity, large modern vector graphic map with buildings, street grid,
 * metro rail, glowing gradient route ribbon, rotating car with radar ripples, live telemetry,
 * and free drag (pan) + zoom in / zoom out interactive controls.
 */
export default function GraphicLiveMap({
  trip,
  isModal = false,
  height,
  progress = 0.42,
  speed = 38,
  onOpenModal
}) {
  const mapHeight = height || (isModal ? 275 : 180);
  const geom = getRouteTelemetry(progress, isModal);
  const mid = isModal ? 'modal' : 'mini';
  const pickupLabel = (typeof trip?.pickup === 'string' && trip.pickup ? trip.pickup.split(',')[0] : 'PICKUP').slice(0, 16).toUpperCase();
  const dropLabel = (typeof trip?.drop_loc === 'string' && trip.drop_loc ? trip.drop_loc.split(',')[0] : 'LULU MALL').slice(0, 16).toUpperCase();

  // Interactive Pan and Zoom State (smooth natural feel)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });
  const pinchRef = useRef({ initialDist: 0, initialZoom: 1 });

  // Gentle, natural zoom in (+18% smooth step)
  const handleZoomIn = useCallback((e) => {
    e?.stopPropagation?.();
    setZoom((z) => Math.min(3.2, parseFloat((z * 1.18).toFixed(2))));
  }, []);

  // Gentle, natural zoom out (-18% smooth step)
  const handleZoomOut = useCallback((e) => {
    e?.stopPropagation?.();
    setZoom((z) => Math.max(0.65, parseFloat((z / 1.18).toFixed(2))));
  }, []);

  // Recenter map back to vehicle/center position smoothly
  const handleRecenter = useCallback((e) => {
    e?.stopPropagation?.();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse drag handlers (free smooth pan)
  const handleMouseDown = (e) => {
    if (!isModal || e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const maxPan = Math.max(160, 220 * zoom);
      const newX = Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanX + dx));
      const newY = Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanY + dy));
      setPan({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoom]);

  // Touch handlers (1-finger drag & natural 2-finger pinch zoom)
  const handleTouchStart = (e) => {
    if (!isModal) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: pan.x,
        initialPanY: pan.y
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = {
        initialDist: dist,
        initialZoom: zoom
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isModal) return;
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.startX;
      const dy = e.touches[0].clientY - dragStartRef.current.startY;
      const maxPan = Math.max(160, 220 * zoom);
      const newX = Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanX + dx));
      const newY = Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanY + dy));
      setPan({ x: newX, y: newY });
    } else if (e.touches.length === 2 && pinchRef.current.initialDist > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const rawScale = currentDist / pinchRef.current.initialDist;
      // Damped scaling so pinch feels natural and controlled rather than runaway
      const dampedScale = 1 + (rawScale - 1) * 0.7;
      const newZoom = Math.max(0.65, Math.min(3.2, parseFloat((pinchRef.current.initialZoom * dampedScale).toFixed(2))));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      pinchRef.current = { initialDist: 0, initialZoom: zoom };
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: pan.x,
        initialPanY: pan.y
      };
    }
  };

  // Mouse wheel zoom with gentle dampening for natural, continuous deceleration
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isModal) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Clamp delta to prevent sudden huge jumps from fast wheel spins or trackpad swipes
      const clampedDelta = Math.max(-35, Math.min(35, e.deltaY));
      const factor = Math.exp(-clampedDelta * 0.0024);
      setZoom((prev) => {
        const next = Math.max(0.65, Math.min(3.2, parseFloat((prev * factor).toFixed(3))));
        return next;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isModal]);

  // Route path strings for SVG
  const routePathD = isModal
    ? 'M 55 225 L 105 185 L 175 185 L 235 120 L 285 120 L 330 50'
    : 'M 65 155 L 115 125 L 175 125 L 235 80 L 285 80 L 325 40';

  const viewBox = isModal ? '0 0 390 270' : '0 0 390 195';
  const hasMoved = pan.x !== 0 || pan.y !== 0 || zoom !== 1;

  return (
    <div
      ref={containerRef}
      className={`live-map-viewport ${isModal ? 'modal' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onClick={isModal ? undefined : onOpenModal}
      onMouseDown={isModal ? handleMouseDown : undefined}
      onTouchStart={isModal ? handleTouchStart : undefined}
      onTouchMove={isModal ? handleTouchMove : undefined}
      onTouchEnd={isModal ? handleTouchEnd : undefined}
      onTouchCancel={isModal ? handleTouchEnd : undefined}
      style={{
        position: 'relative',
        height: `${mapHeight}px`,
        width: '100%',
        borderRadius: isModal ? '20px' : '16px',
        overflow: 'hidden',
        cursor: isModal ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        boxShadow: isModal ? '0 8px 30px rgba(0, 0, 0, 0.12)' : 'none',
        userSelect: 'none',
        touchAction: isModal ? 'none' : 'auto'
      }}
    >
      {/* Pan & Zoom Transforming Inner Canvas with Natural Eased Transition */}
      <div
        className="live-map-canvas-inner"
        style={{
          transform: isModal ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : 'none',
          transformOrigin: 'center center',
          width: '100%',
          height: '100%',
          transition: isDragging ? 'none' : 'transform 0.38s cubic-bezier(0.25, 1, 0.45, 1)',
          willChange: 'transform',
          pointerEvents: 'none'
        }}
      >
        <svg
          className="live-map-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
        <defs>
          <linearGradient id={`routeGrad-${mid}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="45%" stopColor="#FFC70A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Water pattern */}
          <linearGradient id={`waterGrad-${mid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 122, 255, 0.15)" />
            <stop offset="100%" stopColor="rgba(0, 122, 255, 0.28)" />
          </linearGradient>

          {/* Park pattern */}
          <linearGradient id={`parkGrad-${mid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.14)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.24)" />
          </linearGradient>
        </defs>

        {/* 1. Base Map Ground Grid */}
        <g opacity="0.65">
          {/* Secondary streets */}
          <line x1="10" y1="40" x2="380" y2="40" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="10" y1={isModal ? 225 : 155} x2="380" y2={isModal ? 225 : 155} stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="60" y1="10" x2="60" y2={isModal ? 260 : 185} stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="175" y1="10" x2="175" y2={isModal ? 260 : 185} stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="330" y1="10" x2="330" y2={isModal ? 260 : 185} stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />

          {/* Cross avenues */}
          <line x1="105" y1="10" x2="105" y2={isModal ? 260 : 185} stroke="rgba(140,140,150,0.28)" strokeWidth="3" />
          <line x1="235" y1="10" x2="235" y2={isModal ? 260 : 185} stroke="rgba(140,140,150,0.28)" strokeWidth="3" />
          <line x1="285" y1="10" x2="285" y2={isModal ? 260 : 185} stroke="rgba(140,140,150,0.28)" strokeWidth="3" />

          {/* Major Arterial Road Corridors (dual outline casing) */}
          <line
            x1="10"
            y1={isModal ? 185 : 125}
            x2="380"
            y2={isModal ? 185 : 125}
            stroke="rgba(140,140,150,0.38)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1={isModal ? 185 : 125}
            x2="380"
            y2={isModal ? 185 : 125}
            stroke="var(--card)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <line
            x1="10"
            y1={isModal ? 120 : 80}
            x2="380"
            y2={isModal ? 120 : 80}
            stroke="rgba(140,140,150,0.38)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1={isModal ? 120 : 80}
            x2="380"
            y2={isModal ? 120 : 80}
            stroke="var(--card)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Metro Viaduct Railway Track */}
          <path
            d={isModal ? "M 15 250 L 105 185 L 200 185 L 285 100 L 375 70" : "M 15 170 L 105 125 L 200 125 L 285 70 L 375 50"}
            fill="none"
            stroke="rgba(150, 150, 165, 0.45)"
            strokeWidth="4"
            strokeDasharray="2 6"
          />
        </g>

        {/* 2. Realistic Top-View Building Polygons */}
        <g opacity="0.82">
          {/* Commercial Center Block */}
          <polygon
            points={isModal ? "25,30 85,30 85,68 64,68 64,50 25,50" : "25,18 75,18 75,44 58,44 58,32 25,32"}
            fill="var(--field)"
            stroke="rgba(140,140,150,0.4)"
            strokeWidth="1.2"
          />

          {/* Tech Park Quadrant */}
          <polygon
            points={isModal ? "115,28 165,28 165,68 150,68 150,45 130,45 130,68 115,68" : "90,18 135,18 135,46 122,46 122,32 108,32 108,46 90,46"}
            fill="var(--field)"
            stroke="rgba(140,140,150,0.4)"
            strokeWidth="1.2"
          />

          {/* IT Tower with glass core */}
          <rect
            x="290"
            y={isModal ? 140 : 96}
            width="50"
            height="34"
            rx="4"
            fill="var(--field)"
            stroke="rgba(140,140,150,0.4)"
            strokeWidth="1.2"
          />
          <rect
            x="298"
            y={isModal ? 148 : 102}
            width="34"
            height="18"
            rx="2"
            fill="none"
            stroke="rgba(140,140,150,0.3)"
            strokeWidth="1"
          />

          {/* Residential Avenue Blocks */}
          <rect
            x="348"
            y={isModal ? 135 : 94}
            width="28"
            height="48"
            rx="4"
            fill="var(--field)"
            stroke="rgba(140,140,150,0.4)"
            strokeWidth="1.2"
          />
          <rect
            x="35"
            y={isModal ? 135 : 92}
            width="46"
            height="24"
            rx="4"
            fill="var(--field)"
            stroke="rgba(140,140,150,0.4)"
            strokeWidth="1.2"
          />

          {isModal && (
            <>
              {/* Additional blocks for tall modal map */}
              <rect x="25" y="195" width="22" height="35" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1" />
              <rect x="125" y="200" width="36" height="24" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1" />
              <rect x="195" y="200" width="40" height="28" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1" />
              <rect x="248" y="145" width="30" height="25" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1" />
            </>
          )}
        </g>

        {/* 3. Landmark Areas (Urban Park & Water Lake) */}
        <rect
          x="180"
          y="28"
          width="88"
          height={isModal ? "50" : "38"}
          rx="12"
          fill={`url(#parkGrad-${mid})`}
          stroke="rgba(34, 197, 94, 0.38)"
          strokeWidth="1.2"
        />
        <text
          x="224"
          y={isModal ? "56" : "50"}
          fontSize="9"
          fontWeight="700"
          fill="var(--muted)"
          textAnchor="middle"
          letterSpacing="0.08em"
        >
          CENTRAL PARK
        </text>

        <rect
          x="115"
          y={isModal ? 210 : 142}
          width="80"
          height={isModal ? "45" : "36"}
          rx="12"
          fill={`url(#waterGrad-${mid})`}
          stroke="rgba(0, 122, 255, 0.35)"
          strokeWidth="1.2"
        />
        <text
          x="155"
          y={isModal ? "236" : "163"}
          fontSize="9"
          fontWeight="700"
          fill="var(--muted)"
          textAnchor="middle"
          letterSpacing="0.08em"
        >
          SOUTH LAKE
        </text>

        {/* 4. Glowing Outlined Route Ribbon with animated white dash centerline */}
        <path
          d={routePathD}
          fill="none"
          stroke="var(--yellow)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.28"
        />
        <path
          d={routePathD}
          fill="none"
          stroke={`url(#routeGrad-${mid})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={routePathD}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 12"
          style={{ animation: 'dash-travel 1.2s linear infinite' }}
          opacity="0.95"
        />

        {/* 5. Pickup Pin with accurate label */}
        <g transform={isModal ? "translate(55, 225)" : "translate(65, 155)"}>
          <circle cx="0" cy="0" r="15" fill="#22C55E" opacity="0.22" />
          <circle cx="0" cy="0" r="7.5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="2.2" />
          <rect x="-32" y="14" width="64" height="18" rx="5" fill="var(--ink)" opacity="0.92" />
          <text x="0" y="26" fontSize="8" fontWeight="700" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.04em">
            {pickupLabel}
          </text>
        </g>

        {/* 6. Destination Pin with accurate label */}
        <g transform={isModal ? "translate(330, 50)" : "translate(325, 40)"}>
          <circle cx="0" cy="0" r="15" fill="#EF4444" opacity="0.22" />
          <circle cx="0" cy="0" r="7.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.2" />
          <rect x="-36" y="-25" width="72" height="18" rx="5" fill="var(--ink)" opacity="0.92" />
          <text x="0" y="-13" fontSize="8" fontWeight="700" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.04em">
            {dropLabel}
          </text>
        </g>

        {/* 7. Top-View Vehicle Icon with multi-ripple radar pulse */}
        <g transform={`translate(${geom.x}, ${geom.y}) rotate(${geom.angle})`}>
          <circle cx="0" cy="0" r="20" fill="var(--yellow)" opacity="0.25" style={{ animation: 'radar-ring 2s ease-out infinite' }} />
          <circle cx="0" cy="0" r="12" fill="var(--yellow)" opacity="0.4" />
          <rect x="-7.5" y="-14" width="15" height="28" rx="5" fill="var(--ink)" stroke="#FFC70A" strokeWidth="2" />
          <rect x="-5.5" y="-5.5" width="11" height="9" rx="1.5" fill="#FFC70A" />
          <circle cx="-4" cy="-11" r="1.5" fill="#FFFFFF" />
          <circle cx="4" cy="-11" r="1.5" fill="#FFFFFF" />
        </g>

        {/* 8. Floating Speed Tag Badge */}
        <g transform={`translate(${Math.min(300, geom.x + 14)}, ${Math.max(18, geom.y - 14)})`}>
          <rect x="0" y="0" width="54" height="20" rx="10" fill="var(--ink)" opacity="0.92" />
          <text x="27" y="14" fontSize="9.5" fontWeight="700" fill="#FFC70A" textAnchor="middle">
            {speed} km/h
          </text>
        </g>
        </svg>
      </div>

      {/* Floating HUD overlay on card */}
      {!isModal && (
        <div className="live-map-overlay-btn" onClick={onOpenModal}>
          <Icon name="navigation" size={13} />
          <span>View Live Map</span>
        </div>
      )}

      {/* Floating HUD & Interactive Controls overlay on popup */}
      {isModal && (
        <>
          {/* Top telemetry & street pills */}
          <div className="live-sheet-hud-top">
            <span className="live-sheet-pill">
              <Icon name="navigation" size={12} />
              <span>{geom.currentStreet}</span>
            </span>
            <span className="live-sheet-pill live-status-pill">
              <span className="live-pulse-dot" style={{ background: '#22C55E' }} /> Live GPS
            </span>
          </div>

          {/* Interactive Zoom Controls Dock (Right side) */}
          <div className="live-map-controls-dock">
            <button
              type="button"
              className="map-ctrl-btn"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom In"
            >
              <Icon name="plus" size={15} />
            </button>
            <button
              type="button"
              className="map-ctrl-btn map-zoom-badge"
              onClick={handleRecenter}
              title="Reset Zoom to 100%"
              aria-label="Reset Zoom"
            >
              <span>{Math.round(zoom * 100)}%</span>
            </button>
            <button
              type="button"
              className="map-ctrl-btn"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <Icon name="minus" size={15} />
            </button>
            <button
              type="button"
              className={`map-ctrl-btn map-recenter-btn ${hasMoved ? 'has-offset' : ''}`}
              onClick={handleRecenter}
              title="Recenter & Reset View"
              aria-label="Recenter Map"
            >
              <Icon name="target" size={16} />
            </button>
          </div>

          {/* Bottom Left: Interactive Hint or Recenter Quick Action */}
          {hasMoved ? (
            <button
              type="button"
              className="live-map-hint-pill live-map-reset-pill"
              onClick={handleRecenter}
              title="Recenter Map"
            >
              <Icon name="target" size={12} />
              <span>Recenter Map</span>
            </button>
          ) : (
            <div className="live-map-hint-pill">
              <span>Drag to Pan · Pinch / ± to Zoom</span>
            </div>
          )}

          {/* Bottom Progress Bar Dock */}
          <div
            className="live-map-progress-dock"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'rgba(0,0,0,0.18)'
            }}
          >
            <div
              className="live-map-progress-dock-fill"
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22C55E, #FFC70A)',
                borderRadius: '0 2px 2px 0',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
