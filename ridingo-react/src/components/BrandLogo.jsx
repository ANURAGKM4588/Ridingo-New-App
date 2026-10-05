import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

/**
 * BrandLogo Component
 * Uses /Ridingo White.png in dark theme and /Ridingo Black.png in light theme,
 * reacting instantly to app theme settings and system theme changes.
 */
export default function BrandLogo({ height = 24, width = 96, center = false, className = '', style = {} }) {
  let themeVal = 'light';
  try {
    const appContext = useApp();
    if (appContext?.theme) {
      themeVal = appContext.theme;
    }
  } catch (e) {
    // Context fallback
  }

  // Determine dark mode state
  const computeIsDark = () => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return true;
      if (attr === 'light') return false;
    }
    if (themeVal === 'dark') return true;
    if (themeVal === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  const [isDark, setIsDark] = useState(computeIsDark);

  useEffect(() => {
    setIsDark(computeIsDark());

    // Observe data-theme changes on html
    const observer = new MutationObserver(() => {
      setIsDark(computeIsDark());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Also observe media query
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const handleMql = () => setIsDark(computeIsDark());
    mql?.addEventListener?.('change', handleMql);

    return () => {
      observer.disconnect();
      mql?.removeEventListener?.('change', handleMql);
    };
  }, [themeVal]);

  const logoSrc = isDark ? '/Ridingo White.png' : '/Ridingo Black.png';

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
        src={logoSrc}
        alt="Ridingo"
        className="brand-logo-img"
        key={logoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: center ? 'center center' : 'left center',
          display: 'block',
          transition: 'opacity 0.25s ease'
        }}
      />
    </span>
  );
}
