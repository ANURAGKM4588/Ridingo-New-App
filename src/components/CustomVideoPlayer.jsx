import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

/**
 * CustomVideoPlayer: Sleek, high-performance HTML5 video player
 * Controls:
 * - Play / Pause toggle
 * - Replay button (resets to 0:00 and auto-plays)
 * - Timeline scrubber slider
 * - Time elapsed / total duration display
 * - Mute / Unmute audio toggle
 * - Touch-friendly center play/replay overlay
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

  // Handle Fullscreen body overflow lock & Escape key
  useEffect(() => {
    if (isFullscreen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsFullscreen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFullscreen]);

  // Synchronize when src prop changes
  useEffect(() => {
    setVideoSrc(src || '');
    setLoadError(false);
    setIsEnded(false);
    setIsLoading(true);
    setFirstFrameThumbnail(null);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsLoading(false);
      setLoadError(false);
      // Cue the video to the first frame (0.001s) so the browser renders the actual video frame
      if (video.currentTime === 0) {
        try { video.currentTime = 0.001; } catch (_) {}
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      if (video.currentTime === 0) {
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
  }, [videoSrc]);

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
            console.warn('[CustomVideoPlayer] Unmuted play rejected, retrying muted:', err);
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
      }, 3000);
    }
  };

  return (
    <div
      className={`custom-video-player-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      onClick={togglePlay}
      onMouseMove={triggerControlsAutoHide}
      onTouchStart={triggerControlsAutoHide}
      style={isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#000000',
        borderRadius: 0,
        margin: 0,
        padding: 0,
        border: 'none',
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none'
      } : {
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
        userSelect: 'none'
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
          maxWidth: isFullscreen ? '100vw' : '100%',
          maxHeight: isFullscreen ? '100vh' : '100%',
          objectFit: 'contain',
          display: 'block',
          background: '#000000'
        }}
      />

      {/* Fullscreen Close Button */}
      {isFullscreen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(false);
          }}
          aria-label="Exit Fullscreen"
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            right: 'max(16px, env(safe-area-inset-right, 16px))',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 40,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Error state if recorded video cannot be loaded */}
      {loadError && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9, 10, 13, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 10,
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
              padding: '6px 14px',
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
      )}

      {/* Center Action Overlay (Play / Replay / Spinner) */}
      {!loadError && (!isPlaying || isEnded) && (
        <div
          style={{
            position: 'absolute',
            zIndex: 4,
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            transform: 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {isEnded ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          )}
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: isFullscreen
            ? '12px 18px max(24px, env(safe-area-inset-bottom, 24px))'
            : '8px 12px 10px',
          background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.4) 70%, rgba(0, 0, 0, 0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 35,
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

        {/* Buttons Row */}
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
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            {/* Timestamp Display */}
            <span style={{ fontSize: '11.5px', color: '#E2E8F0', fontFamily: 'monospace', fontWeight: 650 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Audio Mute / Unmute Button */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#CBD5E1',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            {/* Fullscreen Expand & Fit to Frame Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(prev => !prev);
              }}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#CBD5E1',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
