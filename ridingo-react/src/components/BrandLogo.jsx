import React from 'react';

/**
 * BrandLogo Component
 * Renders both Ridingo Black and Ridingo White logo images stacked,
 * with CSS cross-fade transition on theme changes for 60fps buttery smoothness.
 */
export default function BrandLogo({ height = 24, width = 96, center = false, className = '', style = {} }) {
  return (
    <span
      className={`ridingo-brand-logo-wrap ${center ? 'center' : ''} ${className}`}
      style={{
        position: 'relative',
        display: center ? 'flex' : 'inline-flex',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        height: `${height}px`,
        width: `${width}px`,
        flex: 'none',
        ...style
      }}
    >
      <img
        src="/Ridingo Black.png"
        alt="Ridingo"
        className="brand-logo-img logo-light"
      />
      <img
        src="/Ridingo White.png"
        alt="Ridingo"
        className="brand-logo-img logo-dark"
      />
    </span>
  );
}
