import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/**
 * CustomVideoPlayer: Sleek, high-performance HTML5 video player
 * Features:
 * - True edge-to-edge Fullscreen via React Portal (escapes all ancestor CSS transforms/overflow)
 * - Seamless playback continuity (preserves currentTime, play/pause, and mute state across transitions)
 * - Responsive fit-to-frame (vertical videos fit full device height, landscape videos fit width)
 * - Prominent close button in fullscreen with safe-area notch support
 * - Auto-hiding control bar with timeline scrubber, play/pause, replay, timestamps, and volume toggle
 * - Dynamic first-frame thumbnail generation
 * - No background scroll or swipe interference during fullscreen playback
 */
export default function CustomVideoPlayer({
  src,
  poster,
  title = 'Vehicle Walkaround Inspection Video',
  subtitle = 'Verified Pre-Trip Condition Recording'
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Default muted for mobile autoplay compatibility
  const [isEnded, setIsEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState(src || '');
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [firstFrameThumbnail, setFirstFrameThumbnail] = useState(null);
  const activePoster = firstFrameThumbnail || poster || undefined;

  // Preserves playback state seamlessly when switching between inline & portal fullscreen
  const savedStateRef = useRef({
    currentTime: 0,
    isPlaying: false,
    isMuted: true
  });

  // Extract the actual video's first frame to use as the true cover thumbnail
  useEffect(() => {
    if (!videoSrc) {
      setFirstFrameThumbnail(null);
      return;
    }
    let isCancelled = false;
    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.preload = 'auto';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.src = videoSrc;

    const captureFrame = () => {
      if (isCancelled) return;
      try {
        if (!tempVideo.videoWidth || !tempVideo.videoHeight) return;
        const canvas = document.createElement('canvas');
        canvas.width = tempVideo.videoWidth;
        canvas.height = tempVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (dataUrl && dataUrl.length > 200 && !isCancelled) {
            setFirstFrameThumbnail(dataUrl);
          }
        }
      } catch (_) {}
    };

    tempVideo.addEventListener('loadeddata', () => {
      try { tempVideo.currentTime = 0.001; } catch (_) {}
    }, { once: true });

    tempVideo.addEventListener('seeked', () => {
      captureFrame();
      tempVideo.remove();
    }, { once: true });

    tempVideo.addEventListener('canplay', () => {
      captureFrame();
    }, { once: true });

    return () => {
      isCancelled = true;
      tempVideo.src = '';
      tempVideo.remove();
    };
  }, [videoSrc]);

  // Synchronize when src prop changes
  useEffect(() => {
    setVideoSrc(src || '');
    setLoadError(false);
    setIsEnded(false);
    setIsLoading(true);
    setFirstFrameThumbnail(null);
    savedStateRef.current = { currentTime: 0, isPlaying: false, isMuted: true };
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  const handleVideoError = (e) => {
    console.warn('[CustomVideoPlayer] Error playing driver recorded video:', videoSrc, e);
    setLoadError(true);
    setIsLoading(false);
    setIsPlaying(false);
  };

  // Video event listeners & playback state restoration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Restore saved playback state on mount/portal-switch
    if (savedStateRef.current.currentTime > 0) {
      try {
        video.currentTime = savedStateRef.current.currentTime;
      } catch (_) {}
    }
    video.muted = savedStateRef.current.isMuted ?? isMuted;

    if (savedStateRef.current.isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsLoading(false);
      setLoadError(false);
      if (savedStateRef.current.currentTime > 0) {
        try { video.currentTime = savedStateRef.current.currentTime; } catch (_) {}
      } else if (video.currentTime === 0) {
        try { video.currentTime = 0.001; } catch (_) {}
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      if (savedStateRef.current.currentTime > 0) {
        try { video.currentTime = savedStateRef.current.currentTime; } catch (_) {}
      } else if (video.currentTime === 0) {
        try { video.currentTime = 0.001; } catch (_) {}
      }
      try {
        if (video.videoWidth && video.videoHeight) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            if (dataUrl && dataUrl.length > 200) {
              setFirstFrameThumbnail(prev => prev || dataUrl);
            }
          }
        }
      } catch (_) {}
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsEnded(true);
      setShowControls(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsEnded(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setLoadError(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleVideoError);
    };
  }, [videoSrc, isFullscreen]);

  // Fullscreen entrance handler
  const enterFullscreen = useCallback((e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      savedStateRef.current = {
        currentTime: videoRef.current.currentTime || 0,
        isPlaying: !videoRef.current.paused,
        isMuted: videoRef.current.muted
      };
    }

    // Push history entry for hardware back button support on mobile/Android
    try {
      window.history.pushState({ customVideoFullscreen: true }, '');
    } catch (_) {}

    // Trigger hardware fullscreen if supported
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (_) {}

    setIsFullscreen(true);
    setShowControls(true);
  }, []);

  // Fullscreen exit handler
  const exitFullscreen = useCallback((e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      savedStateRef.current = {
        currentTime: videoRef.current.currentTime || 0,
        isPlaying: !videoRef.current.paused,
        isMuted: videoRef.current.muted
      };
    }

    // Revert history state if applicable
    try {
      if (window.history.state && window.history.state.customVideoFullscreen) {
        window.history.back();
      }
    } catch (_) {}

    // Exit native fullscreen if active
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (_) {}

    setIsFullscreen(false);
    setShowControls(true);
  }, []);

  // Body lock, Escape key, and Android back button listener
  useEffect(() => {
    if (!isFullscreen) return;

    const origOverflow = document.body.style.overflow;
    const origTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        exitFullscreen();
      }
    };

    const handlePopState = () => {
      if (videoRef.current) {
        savedStateRef.current = {
          currentTime: videoRef.current.currentTime || 0,
          isPlaying: !videoRef.current.paused,
          isMuted: videoRef.current.muted
        };
      }
      setIsFullscreen(false);
      setShowControls(true);
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, exitFullscreen]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video || loadError) return;

    if (isEnded) {
      handleReplay(e);
      return;
    }

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsEnded(false);
          })
          .catch(err => {
            console.warn('[CustomVideoPlayer] Play rejected, retrying muted:', err);
            video.muted = true;
            setIsMuted(true);
            video.play()
              .then(() => {
                setIsPlaying(true);
                setIsEnded(false);
              })
              .catch(err2 => {
                console.warn('[CustomVideoPlayer] Play totally failed:', err2);
                setLoadError(true);
              });
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleReplay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentTime(0);
    setIsEnded(false);
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
      setCurrentTime(newTime);
      if (isEnded) {
        setIsEnded(false);
      }
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const triggerControlsAutoHide = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  // Reusable bottom control bar
  const renderControlBar = (inFullscreenMode) => (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: inFullscreenMode
          ? '14px 20px max(24px, env(safe-area-inset-bottom, 24px))'
          : '8px 12px 10px',
        background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.45) 75%, rgba(0, 0, 0, 0) 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 50,
        opacity: showControls || !isPlaying || isEnded ? 1 : 0,
        transition: 'opacity 0.25s ease',
        pointerEvents: showControls || !isPlaying || isEnded ? 'auto' : 'none'
      }}
    >
      {/* Progress Scrubber */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '999px',
            accentColor: '#FFC70A',
            cursor: 'pointer',
            margin: 0
          }}
        />
      </div>

      {/* Control Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            )}
          </button>

          {/* Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            title="Replay Video from Start"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          {/* Timestamp Display */}
          <span style={{ fontSize: inFullscreenMode ? '13px' : '11.5px', color: '#E2E8F0', fontFamily: 'monospace', fontWeight: 650 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Audio Mute / Unmute Button */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          {/* Fullscreen Expand & Fit to Frame Button (Beside Volume Icon) */}
          <button
            type="button"
            onClick={inFullscreenMode ? exitFullscreen : enterFullscreen}
            title={inFullscreenMode ? 'Exit Full Screen' : 'Full Screen'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {inFullscreenMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Center Play / Replay button
  const renderCenterAction = (size = 56) => {
    if (loadError || (isPlaying && !isEnded)) return null;
    return (
      <div
        onClick={togglePlay}
        style={{
          position: 'absolute',
          zIndex: 40,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255, 255, 255, 0.28)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.6)',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        {isEnded ? (
          <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        ) : (
          <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        )}
      </div>
    );
  };

  // Error overlay
  const renderErrorOverlay = () => {
    if (!loadError) return null;
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 10, 13, 0.94)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 60,
          textAlign: 'center'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 750, color: '#F87171', marginBottom: '8px' }}>
          Inspection Video Playback Error
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLoadError(false);
            if (videoRef.current) {
              videoRef.current.load();
              videoRef.current.play().catch(() => {});
            }
          }}
          style={{
            padding: '7px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.16)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Inline Player Component */}
      {!isFullscreen ? (
        <div
          className="custom-video-player-container inline-mode"
          onClick={togglePlay}
          onMouseMove={triggerControlsAutoHide}
          onTouchStart={triggerControlsAutoHide}
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#090A0D',
            aspectRatio: '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            border: '1.5px solid rgba(255, 255, 255, 0.1)',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            poster={activePoster}
            playsInline
            webkit-playsinline="true"
            muted={isMuted}
            preload="auto"
            onError={handleVideoError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              background: '#000000'
            }}
          />

          {renderErrorOverlay()}
          {renderCenterAction(54)}
          {renderControlBar(false)}
        </div>
      ) : (
        /* Static Placeholder in trip row accordion so layout never shifts or collapses */
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: '16px',
            background: '#090A0D',
            border: '1.5px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            fontSize: '12px',
            gap: '8px'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span style={{ fontWeight: 600 }}>Playing in Full Screen</span>
        </div>
      )}

      {/* True Fullscreen Overlay Portal (Mounted directly to document.body, escaping all container CSS transforms) */}
      {isFullscreen && typeof document !== 'undefined' && createPortal(
        <div
          className="custom-video-fullscreen-portal"
          onClick={() => {
            // Tapping video/backdrop in fullscreen toggles controls visibility
            setShowControls(prev => !prev);
            triggerControlsAutoHide();
          }}
          onMouseMove={triggerControlsAutoHide}
          onTouchStart={triggerControlsAutoHide}
          onTouchMove={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            height: '100dvh',
            zIndex: 99999999,
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'default'
          }}
        >
          {/* Fit-to-frame Video Element:
              - Vertical videos fit screen height with clean black letterboxes
              - Landscape videos fit screen width without distortion or stretching */}
          <video
            ref={videoRef}
            src={videoSrc}
            poster={activePoster}
            playsInline
            webkit-playsinline="true"
            muted={isMuted}
            preload="auto"
            onError={handleVideoError}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100dvh',
              objectFit: 'contain',
              display: 'block',
              background: '#000000'
            }}
          />

          {/* Prominent High-Contrast Close Button in Top-Right with Safe-Area Padding */}
          <button
            type="button"
            onClick={exitFullscreen}
            aria-label="Exit Fullscreen"
            title="Close Fullscreen"
            style={{
              position: 'absolute',
              top: 'max(16px, env(safe-area-inset-top, 16px))',
              right: 'max(16px, env(safe-area-inset-right, 16px))',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(20, 20, 25, 0.78)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
              transition: 'transform 0.16s ease, background 0.16s ease'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {renderErrorOverlay()}
          {renderCenterAction(64)}
          {renderControlBar(true)}
        </div>,
        document.body
      )}
    </>
  );
}

