import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

/**
 * BrandLogo Component
 * Uses /Ridingo White.png in dark theme and /Ridingo Black.png in light theme,
 * reacting instantly to scoped container theme (User App vs Driver App),
 * app theme settings and system theme changes.
 */
export default function BrandLogo({ height = 24, width = 96, center = false, className = '', style = {}, themeOverride }) {
  const wrapRef = useRef(null);
  const appContext = useApp();
  const contextTheme = appContext?.theme || 'light';

  // Determine dark mode state based on scoped container or global theme
  const computeIsDark = () => {
    if (themeOverride === 'dark') return true;
    if (themeOverride === 'light') return false;

    // Check closest scoped container with data-theme (e.g. #col-u or #col-d)
    if (wrapRef.current) {
      const scopedContainer = wrapRef.current.closest('[data-theme]');
      if (scopedContainer) {
        const ct = scopedContainer.getAttribute('data-theme');
        if (ct === 'dark') return true;
        if (ct === 'light') return false;
      }
    }

    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return true;
      if (attr === 'light') return false;
    }
    if (contextTheme === 'dark') return true;
    if (contextTheme === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  const [isDark, setIsDark] = useState(computeIsDark);

  useEffect(() => {
    setIsDark(computeIsDark());

    // Observe data-theme changes on closest scoped container and root
    const scoped = wrapRef.current?.closest('[data-theme]');
    const targetElement = scoped || document.documentElement;

    const observer = new MutationObserver(() => {
      setIsDark(computeIsDark());
    });
    observer.observe(targetElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    if (targetElement !== document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    // Also observe media query
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const handleMql = () => setIsDark(computeIsDark());
    mql?.addEventListener?.('change', handleMql);

    return () => {
      observer.disconnect();
      mql?.removeEventListener?.('change', handleMql);
    };
  }, [themeOverride, contextTheme]);

  const logoSrc = isDark ? '/Ridingo White.png' : '/Ridingo Black.png';

  return (
    <span
      ref={wrapRef}
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
