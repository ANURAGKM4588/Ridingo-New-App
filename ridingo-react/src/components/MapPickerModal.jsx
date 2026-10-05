import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { GRAPHIC_LANDMARKS } from '../lib/locationService';

export default function MapPickerModal({ isOpen, onClose, onSelect, targetField = 'drop' }) {
  if (!isOpen) return null;

  const label = targetField === 'pickup' ? 'Pickup Location' : 'Destination';
  const [selectedAddr, setSelectedAddr] = useState('Lulu International Mall, Edappally, Kochi');
  const [activeChip, setActiveChip] = useState(0);
  const [pan, setPan] = useState({ x: -260, y: -180 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initPanX: -260, initPanY: -180 });
  const containerRef = useRef(null);

  const applyPan = (newX, newY) => {
    const clampedX = Math.max(-540, Math.min(0, newX));
    const clampedY = Math.max(-360, Math.min(0, newY));
    setPan({ x: clampedX, y: clampedY });

    if (containerRef.current) {
      const centerWorldX = -clampedX + (containerRef.current.clientWidth / 2);
      const centerWorldY = -clampedY + (containerRef.current.clientHeight / 2);

      let closest = GRAPHIC_LANDMARKS[0];
      let minD = Infinity;
      GRAPHIC_LANDMARKS.forEach(lm => {
        const d = Math.hypot(lm.x - centerWorldX, lm.y - centerWorldY);
        if (d < minD) {
          minD = d;
          closest = lm;
        }
      });
      setSelectedAddr(`${closest.title}, ${closest.sub}`);
    }
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPanX: pan.x,
      initPanY: pan.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    applyPan(dragRef.current.initPanX + dx, dragRef.current.initPanY + dy);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const jumpToLandmark = (idx) => {
    const lm = GRAPHIC_LANDMARKS[idx];
    if (!lm || !containerRef.current) return;
    setActiveChip(idx);
    const targetPanX = -(lm.x - (containerRef.current.clientWidth / 2));
    const targetPanY = -(lm.y - (containerRef.current.clientHeight / 2));
    applyPan(targetPanX, targetPanY);
    setSelectedAddr(`${lm.title}, ${lm.sub}`);
  };

  const handleConfirm = () => {
    onSelect(selectedAddr);
    onClose();
  };

  return (
    <div className="map-picker-scrim" style={{ zIndex: 1000 }}>
      {/* Header */}
      <div className="map-picker-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="logo" style={{ width: '28px', height: '28px', borderRadius: '8px' }}>
            <Icon name="pin" size={16} />
          </span>
          <div>
            <b style={{ font: '700 15px var(--font-display)', display: 'block' }}>Choose {label}</b>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Drag map or pick a popular landmark</span>
          </div>
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="Close" style={{ width: '32px', height: '32px', borderRadius: '10px' }}>
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Quick Landmark Chips */}
      <div className="map-picker-chips" id="picker-chips">
        {GRAPHIC_LANDMARKS.map((lm, idx) => (
          <button
            key={lm.title}
            className={`map-picker-chip ${activeChip === idx ? 'on' : ''}`}
            onClick={() => jumpToLandmark(idx)}
            type="button"
          >
            <Icon name={lm.icon} size={13} />
            <span style={{ marginLeft: '4px' }}>{lm.title.split('(')[0].trim().slice(0, 18)}</span>
          </button>
        ))}
      </div>

      {/* Interactive Drag Vector Map */}
      <div
        ref={containerRef}
        className="map-picker-container"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#F0F2F6',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          flex: 1
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          viewBox="0 0 900 650"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '900px',
            height: '650px',
            pointerEvents: 'none',
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: isDragging ? 'none' : 'transform .15s ease-out'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Grid */}
          <g opacity="0.55">
            <line x1="50" y1="140" x2="850" y2="140" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="50" y1="280" x2="850" y2="280" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="50" y1="420" x2="850" y2="420" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="50" y1="560" x2="850" y2="560" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="160" y1="50" x2="160" y2="600" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="330" y1="50" x2="330" y2="600" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="510" y1="50" x2="510" y2="600" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="680" y1="50" x2="680" y2="600" stroke="rgba(140,140,150,0.18)" strokeWidth="1.8" strokeDasharray="4 4" />
          </g>

          {/* Secondary cross streets */}
          <g stroke="rgba(140,140,150,0.28)" strokeWidth="3.5" strokeLinecap="round">
            <line x1="100" y1="80" x2="100" y2="580" />
            <line x1="260" y1="80" x2="260" y2="580" />
            <line x1="430" y1="80" x2="430" y2="580" />
            <line x1="600" y1="80" x2="600" y2="580" />
            <line x1="770" y1="80" x2="770" y2="580" />
            <line x1="80" y1="210" x2="820" y2="210" />
            <line x1="80" y1="360" x2="820" y2="360" />
            <line x1="80" y1="490" x2="820" y2="490" />
          </g>

          {/* Major Arterial Corridors */}
          <g strokeLinecap="round">
            {/* 100 Feet Road Corridor (Vertical) */}
            <line x1="400" y1="40" x2="400" y2="610" stroke="rgba(140,140,150,0.45)" strokeWidth="16" />
            <line x1="400" y1="40" x2="400" y2="610" stroke="#FFFFFF" strokeWidth="10" />
            <line x1="400" y1="40" x2="400" y2="610" stroke="rgba(140,140,150,0.2)" strokeWidth="1.5" strokeDasharray="8 8" />

            {/* Airport Expressway (Diagonal) */}
            <line x1="80" y1="480" x2="780" y2="80" stroke="rgba(140,140,150,0.45)" strokeWidth="18" />
            <line x1="80" y1="480" x2="780" y2="80" stroke="#FFFFFF" strokeWidth="12" />
            <line x1="80" y1="480" x2="780" y2="80" stroke="rgba(140,140,150,0.2)" strokeWidth="1.5" strokeDasharray="10 10" />

            {/* Outer Ring Road (Horizontal) */}
            <line x1="40" y1="300" x2="860" y2="300" stroke="rgba(140,140,150,0.45)" strokeWidth="16" />
            <line x1="40" y1="300" x2="860" y2="300" stroke="#FFFFFF" strokeWidth="10" />
            <line x1="40" y1="300" x2="860" y2="300" stroke="rgba(140,140,150,0.2)" strokeWidth="1.5" strokeDasharray="8 8" />
          </g>

          {/* Buildings */}
          <g opacity="0.88">
            <polygon points="120,90 190,90 190,140 160,140 160,115 120,115" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <polygon points="280,90 350,90 350,145 328,145 328,115 302,115 302,145 280,145" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <rect x="430" y="90" width="60" height="42" rx="4" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <rect x="520" y="90" width="45" height="38" rx="3" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <rect x="580" y="90" width="55" height="38" rx="3" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <polygon points="120,380 180,380 180,440 150,440 150,410 120,410" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <rect x="200" y="380" width="48" height="36" rx="3" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <rect x="430" y="380" width="65" height="44" rx="4" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
            <rect x="520" y="380" width="50" height="38" rx="3" fill="#E6E9F0" stroke="rgba(140,140,150,0.45)" strokeWidth="1.4" />
          </g>

          {/* Zones */}
          <rect x="280" y="225" width="100" height="60" rx="14" fill="rgba(52, 199, 89, 0.15)" stroke="rgba(52, 199, 89, 0.4)" strokeWidth="1.5" />
          <text x="330" y="260" fontSize="10" fontWeight="700" fill="#2E7D32" textAnchor="middle" letterSpacing="0.06em">CENTRAL PARK</text>

          <rect x="120" y="225" width="90" height="55" rx="14" fill="rgba(0, 122, 255, 0.12)" stroke="rgba(0, 122, 255, 0.35)" strokeWidth="1.5" />
          <text x="165" y="258" fontSize="10" fontWeight="700" fill="#1565C0" textAnchor="middle" letterSpacing="0.06em">SOUTH LAKE</text>

          <rect x="510" y="225" width="110" height="60" rx="14" fill="rgba(100, 116, 139, 0.12)" stroke="rgba(100, 116, 139, 0.35)" strokeWidth="1.5" />
          <text x="565" y="260" fontSize="10" fontWeight="700" fill="#475569" textAnchor="middle" letterSpacing="0.06em">TECH PARK</text>

          <rect x="660" y="50" width="120" height="55" rx="14" fill="rgba(245, 158, 11, 0.14)" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" />
          <text x="720" y="82" fontSize="9.5" fontWeight="700" fill="#B45309" textAnchor="middle" letterSpacing="0.06em">AIRPORT</text>

          {/* Road labels */}
          <text x="400" y="585" fontSize="9" fontWeight="700" fill="var(--muted)" textAnchor="middle" letterSpacing="0.08em">100 FEET ROAD</text>
          <text x="750" y="292" fontSize="9" fontWeight="700" fill="var(--muted)" textAnchor="middle" letterSpacing="0.08em">OUTER RING ROAD</text>
        </svg>

        {/* Center Pin Fixed in Viewport Center */}
        <div className={`map-center-pin-wrap ${isDragging ? 'pin-lifted' : ''}`} style={{ pointerEvents: 'none' }}>
          <div className="map-center-pin-badge">{label}</div>
          <svg width="34" height="44" viewBox="0 0 24 32" fill="none">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#0B0B0C" />
            <circle cx="12" cy="11" r="4.5" fill="#FFC70A" />
          </svg>
          <div className="map-center-pin-shadow" />
        </div>

        {/* GPS Button */}
        <button
          className="map-picker-gps-btn"
          type="button"
          onClick={() => jumpToLandmark(0)}
          title="Center Current Point"
        >
          <Icon name="crosshair" size={20} />
        </button>
      </div>

      {/* Footer */}
      <div className="map-picker-foot">
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>
            Selected Location
          </span>
          <div className="map-picker-addr">{selectedAddr}</div>
        </div>
        <button className="btn primary block" onClick={handleConfirm}>
          Confirm {label}
        </button>
      </div>
    </div>
  );
}
