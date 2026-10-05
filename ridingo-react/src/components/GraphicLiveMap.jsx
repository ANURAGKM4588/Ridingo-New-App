import React from 'react';
import Icon from './Icon';

export const ROUTE_PTS = [
  { x: 65, y: 165, name: 'Edappally Toll (Pickup)' },
  { x: 115, y: 135, name: 'Metro Corridor' },
  { x: 175, y: 135, name: 'Palarivattom Bypass' },
  { x: 235, y: 90, name: 'NH 66 Flyover' },
  { x: 285, y: 90, name: 'Lulu Junction' },
  { x: 325, y: 45, name: 'Lulu Mall (Destination)' }
];

export function getRouteTelemetry(prog = 0.38) {
  prog = Math.max(0.02, Math.min(0.98, prog));
  let totalLen = 0;
  const lens = [];
  for (let i = 0; i < ROUTE_PTS.length - 1; i++) {
    const dx = ROUTE_PTS[i + 1].x - ROUTE_PTS[i].x;
    const dy = ROUTE_PTS[i + 1].y - ROUTE_PTS[i].y;
    const d = Math.hypot(dx, dy);
    lens.push(d);
    totalLen += d;
  }
  const targetDist = prog * totalLen;
  let accumulated = 0;
  for (let i = 0; i < lens.length; i++) {
    if (accumulated + lens[i] >= targetDist || i === lens.length - 1) {
      const segT = (targetDist - accumulated) / (lens[i] || 1);
      const p0 = ROUTE_PTS[i];
      const p1 = ROUTE_PTS[i + 1];
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
  return { x: ROUTE_PTS[0].x, y: ROUTE_PTS[0].y, angle: 0, currentStreet: ROUTE_PTS[0].name };
}

/**
 * GraphicLiveMap Component
 * A modern, minimal graphic vector map with building footprints, arterial casings,
 * dynamic gradient route ribbon, rotating car with radar pulse, and floating HUD overlays.
 */
export default function GraphicLiveMap({
  trip,
  isModal = false,
  progress = 0.42,
  speed = 38,
  onOpenModal
}) {
  const geom = getRouteTelemetry(progress);
  const mid = isModal ? 'modal' : 'mini';
  const pickupLabel = trip?.pickup ? trip.pickup.split(',')[0].slice(0, 16).toUpperCase() : 'PICKUP';
  const dropLabel = trip?.drop_loc ? trip.drop_loc.split(',')[0].slice(0, 16).toUpperCase() : 'LULU MALL';

  return (
    <div
      className={`live-map-viewport ${isModal ? 'modal' : ''}`}
      onClick={onOpenModal}
      style={{
        position: 'relative',
        height: isModal ? '230px' : '175px',
        borderRadius: isModal ? '18px' : '14px',
        overflow: 'hidden',
        cursor: isModal ? 'default' : 'pointer'
      }}
    >
      <svg
        className="live-map-svg"
        viewBox="0 0 390 215"
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
        </defs>

        {/* 1. Street Grid & Outlined Road Corridors */}
        <g opacity="0.75">
          <line x1="15" y1="50" x2="375" y2="50" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="15" y1="175" x2="375" y2="175" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="175" y1="15" x2="175" y2="200" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          <line x1="115" y1="15" x2="115" y2="200" stroke="rgba(140,140,150,0.25)" strokeWidth="3" />
          <line x1="235" y1="15" x2="235" y2="200" stroke="rgba(140,140,150,0.25)" strokeWidth="3" />
          <line x1="285" y1="15" x2="285" y2="200" stroke="rgba(140,140,150,0.25)" strokeWidth="3" />

          {/* Major Arterial Road Corridors */}
          <line x1="15" y1="135" x2="375" y2="135" stroke="rgba(140,140,150,0.38)" strokeWidth="11" strokeLinecap="round" />
          <line x1="15" y1="135" x2="375" y2="135" stroke="var(--card)" strokeWidth="7" strokeLinecap="round" />
          <line x1="15" y1="90" x2="375" y2="90" stroke="rgba(140,140,150,0.38)" strokeWidth="11" strokeLinecap="round" />
          <line x1="15" y1="90" x2="375" y2="90" stroke="var(--card)" strokeWidth="7" strokeLinecap="round" />
        </g>

        {/* 2. Top-View Building Footprint Polygons */}
        <g opacity="0.85">
          <polygon points="35,22 80,22 80,48 64,48 64,36 35,36" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1.2" />
          <polygon points="90,22 135,22 135,50 120,50 120,36 105,36 105,50 90,50" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1.2" />
          <rect x="290" y="112" width="46" height="30" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1.2" />
          <rect x="298" y="119" width="30" height="16" rx="2" fill="none" stroke="rgba(140,140,150,0.3)" strokeWidth="1" />
          <rect x="345" y="110" width="28" height="44" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1.2" />
          <rect x="42" y="105" width="40" height="20" rx="3" fill="var(--field)" stroke="rgba(140,140,150,0.4)" strokeWidth="1.2" />
        </g>

        {/* 3. Landmark Areas */}
        <rect x="185" y="24" width="80" height="42" rx="10" fill="rgba(52, 199, 89, 0.14)" stroke="rgba(52, 199, 89, 0.35)" strokeWidth="1.2" />
        <text x="225" y="49" fontSize="8.5" fontWeight="700" fill="var(--muted)" textAnchor="middle" letterSpacing="0.08em">CENTRAL PARK</text>

        <rect x="110" y="156" width="76" height="38" rx="10" fill="rgba(0, 122, 255, 0.1)" stroke="rgba(0, 122, 255, 0.28)" strokeWidth="1.2" />
        <text x="148" y="179" fontSize="8.5" fontWeight="700" fill="var(--muted)" textAnchor="middle" letterSpacing="0.08em">LAKE VIEW</text>

        {/* 4. Glowing Outlined Route Ribbon with animated white dash centerline */}
        <path d="M 65 165 L 115 135 L 175 135 L 235 90 L 285 90 L 325 45" fill="none" stroke="var(--yellow)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
        <path d="M 65 165 L 115 135 L 175 135 L 235 90 L 285 90 L 325 45" fill="none" stroke={`url(#routeGrad-${mid})`} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 65 165 L 115 135 L 175 135 L 235 90 L 285 90 L 325 45" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 12" style={{ animation: 'dash-travel 1.2s linear infinite' }} opacity="0.95" />

        {/* 5. Pickup Pin with accurate label */}
        <g transform="translate(65, 165)">
          <circle cx="0" cy="0" r="14" fill="#22C55E" opacity="0.22" />
          <circle cx="0" cy="0" r="7" fill="#22C55E" stroke="#FFFFFF" strokeWidth="2" />
          <rect x="-30" y="13" width="60" height="17" rx="4" fill="var(--ink)" opacity="0.92" />
          <text x="0" y="24.5" fontSize="8" fontWeight="700" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.04em">{pickupLabel}</text>
        </g>

        {/* 6. Destination Pin with accurate label */}
        <g transform="translate(325, 45)">
          <circle cx="0" cy="0" r="14" fill="#EF4444" opacity="0.22" />
          <circle cx="0" cy="0" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
          <rect x="-34" y="-24" width="68" height="17" rx="4" fill="var(--ink)" opacity="0.92" />
          <text x="0" y="-12.5" fontSize="8" fontWeight="700" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.04em">{dropLabel}</text>
        </g>

        {/* 7. Top-View Vehicle Icon with radar pulse */}
        <g transform={`translate(${geom.x}, ${geom.y}) rotate(${geom.angle})`}>
          <circle cx="0" cy="0" r="18" fill="var(--yellow)" opacity="0.25" style={{ animation: 'radar-ring 2s ease-out infinite' }} />
          <circle cx="0" cy="0" r="11" fill="var(--yellow)" opacity="0.4" />
          <rect x="-7" y="-13" width="14" height="26" rx="4.5" fill="var(--ink)" stroke="#FFC70A" strokeWidth="1.8" />
          <rect x="-5" y="-5" width="10" height="8" rx="1.5" fill="#FFC70A" />
          <circle cx="-4" cy="-11" r="1.5" fill="#FFFFFF" />
          <circle cx="4" cy="-11" r="1.5" fill="#FFFFFF" />
        </g>

        {/* 8. Floating Speed Tag */}
        <g transform={`translate(${Math.min(305, geom.x + 14)}, ${Math.max(16, geom.y - 14)})`}>
          <rect x="0" y="0" width="52" height="18" rx="9" fill="var(--ink)" opacity="0.92" />
          <text x="26" y="12.5" fontSize="9" fontWeight="700" fill="#FFC70A" textAnchor="middle">{speed} km/h</text>
        </g>
      </svg>

      {/* Floating HUD overlay on card */}
      {!isModal && (
        <div className="live-map-overlay-btn" onClick={onOpenModal}>
          <Icon name="navigation" size={13} />
          <span>View Live Map</span>
        </div>
      )}

      {/* Floating HUD overlay on popup */}
      {isModal && (
        <>
          <div className="live-sheet-hud-top">
            <span className="live-sheet-pill">
              <Icon name="navigation" size={12} />
              <span>{geom.currentStreet}</span>
            </span>
            <span className="live-sheet-pill live-status-pill">
              <span className="live-pulse-dot" style={{ background: '#22C55E' }} /> Live GPS
            </span>
          </div>
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
