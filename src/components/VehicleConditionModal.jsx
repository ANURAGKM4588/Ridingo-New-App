import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { searchBrands, getModelsForBrand, searchAllModels, ALL_BRANDS, INDIAN_VEHICLE_DATABASE } from '../utils/indianVehicles';
import { saveRecordedVideo, getRecordedVideoUrl } from '../utils/inspectionVideoStore';

const STORAGE_KEY = 'ridingo_vehicle_inspections';
const RETENTION_PERIOD_MS = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

/**
 * Automatically cleans any vehicle photos/records older than 5 days from the database
 */
export const purgeExpiredVehiclePhotos = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const records = JSON.parse(raw);
    const now = Date.now();
    const validRecords = records.filter(r => r.expiresAt && Number(r.expiresAt) > now);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validRecords));
  } catch (e) {
    console.error('Error auto-cleaning expired vehicle photos:', e);
  }
};

/**
 * Saves vehicle details & photos with exact 5-day expiration timestamp
 */
export const saveVehicleDetailsWith5DayRetention = (tripId, details) => {
  try {
    purgeExpiredVehiclePhotos();
    const raw = localStorage.getItem(STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const newRecord = {
      tripId: String(tripId),
      brand: details.brand,
      model: details.model,
      regNumber: details.regNumber,
      photos: details.photos,
      videoUrl: details.videoUrl || null,
      notes: details.notes || '',
      verifiedAt: now,
      expiresAt: now + RETENTION_PERIOD_MS,
      retentionNotice: 'Stored in database for 5 days before permanent auto-erasure'
    };
    records.push(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return newRecord;
  } catch (e) {
    console.error('Error saving vehicle details with 5-day retention:', e);
    return null;
  }
};

export default function VehicleConditionModal({
  trip,
  onComplete,
  onCancel
}) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState([]);
  const [sessionVideoUrl, setSessionVideoUrl] = useState(null);
  const [captureMode, setCaptureMode] = useState('photo'); // 'photo' | 'video'
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [facingMode, setFacingMode] = useState('environment');
  const [showGallerySheet, setShowGallerySheet] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Brand & Model Suggestion Dropdown States
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isTypingBrand, setIsTypingBrand] = useState(false);
  const [isTypingModel, setIsTypingModel] = useState(false);
  const brandContainerRef = useRef(null);
  const modelContainerRef = useRef(null);
  const brandInputRef = useRef(null);
  const modelInputRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const sessionListRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordedBlobRef = useRef(null);

  // Outside click listener to dismiss floating dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (brandContainerRef.current && !brandContainerRef.current.contains(e.target)) {
        setShowBrandDropdown(false);
        setIsTypingBrand(false);
      }
      if (modelContainerRef.current && !modelContainerRef.current.contains(e.target)) {
        setShowModelDropdown(false);
        setIsTypingModel(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Compute matched brand and model suggestions dynamically
  const isBrandSelected = Boolean(brand && brand.trim());

  // Show full list on tap/focus to allow changing brand easily; filter when actively typing
  const brandSuggestions = (isTypingBrand && brand.trim())
    ? searchBrands(brand)
    : ALL_BRANDS;

  // Show all models for the selected brand on tap/focus; filter when actively typing
  const allBrandModels = isBrandSelected ? getModelsForBrand(brand) : [];
  const modelSuggestions = (isTypingModel && model.trim())
    ? getModelsForBrand(brand, model)
    : allBrandModels;

  const handleSelectBrand = (brandName) => {
    setBrand(brandName);
    setIsTypingBrand(false);
    setShowBrandDropdown(false);
    // If the currently entered model doesn't match this brand, clear it
    if (model) {
      const brandModels = getModelsForBrand(brandName);
      if (!brandModels.some(m => m.toLowerCase() === model.toLowerCase())) {
        setModel('');
      }
    }
    // Automatically open model dropdown showing all models of the selected brand
    setIsTypingModel(false);
    setTimeout(() => {
      setShowModelDropdown(true);
      if (modelInputRef.current) modelInputRef.current.focus();
    }, 60);
  };

  const handleSelectModel = (modelName) => {
    setModel(modelName);
    setIsTypingModel(false);
    setShowModelDropdown(false);
  };

  // Auto clean expired records when modal mounts
  useEffect(() => {
    purgeExpiredVehiclePhotos();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCameraStream = async (targetFacing = facingMode) => {
    stopCameraStream();
    setCameraError('');
    if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this browser.');
      return;
    }

    const constraintTiers = [
      { video: { facingMode: { ideal: targetFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: targetFacing }, audio: false },
      { video: { facingMode: { ideal: targetFacing } }, audio: false },
      { video: true, audio: false }
    ];

    let activeStream = null;
    for (const constraints of constraintTiers) {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (activeStream) break;
      } catch (err) {
        // try next tier
      }
    }

    if (activeStream) {
      streamRef.current = activeStream;
      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraReady(true);
        };
        // Fallback play
        videoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
      }
    } else {
      setCameraError('Camera permission required. Please allow camera access in your device settings.');
    }
  };

  const handleFlipFacingMode = () => {
    if (isRecordingVideo) return;
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  /**
   * User taps to open custom camera UI
   */
  const handleOpenCustomCamera = (initialMode = 'photo') => {
    setErrorMsg('');
    setCameraError('');
    setCaptureMode(initialMode === 'video' ? 'video' : 'photo');
    setSessionPhotos([...photos]); // initialize with existing saved photos
    setSessionVideoUrl(videoUrl);
    setShowGallerySheet(false);
    setIsCustomCameraOpen(true);
    // Start camera stream immediately
    startCameraStream(facingMode);
  };

  /**
   * User taps Cancel button in camera
   */
  const handleCancelCamera = () => {
    if (isRecordingVideo) {
      setIsRecordingVideo(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
    }
    stopCameraStream();
    setSessionPhotos([]);
    setSessionVideoUrl(null);
    setShowGallerySheet(false);
    setIsCustomCameraOpen(false);
  };

  /**
   * User taps Done button in camera (saves all images & video taken in this session)
   */
  const handleDoneCamera = async () => {
    if (isRecordingVideo) {
      setIsRecordingVideo(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise((resolve) => {
          const originalOnStop = mediaRecorderRef.current.onstop;
          mediaRecorderRef.current.onstop = async (e) => {
            if (originalOnStop) await originalOnStop(e);
            resolve();
          };
          try { mediaRecorderRef.current.stop(); } catch (_) { resolve(); }
        });
      }
    }
    stopCameraStream();
    setPhotos([...sessionPhotos]);
    if (sessionVideoUrl) {
      setVideoUrl(sessionVideoUrl);
    }
    setShowGallerySheet(false);
    setIsCustomCameraOpen(false);
    setErrorMsg('');
  };

  /**
   * Capture Button clicked in PHOTO mode:
   * Strictly takes snapshots from the live camera stream. NO file uploading allowed.
   */
  const handleSnapPhoto = () => {
    // If camera stream is not delivering frames yet, inform the user without opening any file dialog
    if (!videoRef.current || !cameraReady || videoRef.current.videoWidth === 0) {
      setCameraError('Camera is starting up, please wait a moment...');
      setTimeout(() => setCameraError(''), 2500);
      return;
    }

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 120);

    let photoData = null;

    if (canvasRef.current && videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoData = canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.warn('[Camera] Canvas snapshot note:', e);
      }
    }

    if (photoData) {
      setSessionPhotos(prev => [...prev, photoData]);
      setCameraError('');
    } else {
      setCameraError('Could not capture frame. Please ensure camera is active and try again.');
      setTimeout(() => setCameraError(''), 2500);
    }
  };

  /**
   * Video Recording Handler in VIDEO mode
   */
  const handleToggleVideoRecord = () => {
    if (!isRecordingVideo) {
      // START RECORDING
      recordedChunksRef.current = [];
      setRecordDuration(0);
      setIsRecordingVideo(true);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(d => d + 1);
      }, 1000);

      try {
        if (streamRef.current && typeof MediaRecorder !== 'undefined') {
          const supportedMimes = [
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm'
          ];
          let chosenMime = '';
          for (const m of supportedMimes) {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
              chosenMime = m;
              break;
            }
          }
          const mr = chosenMime ? new MediaRecorder(streamRef.current, { mimeType: chosenMime }) : new MediaRecorder(streamRef.current);
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          mr.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: chosenMime || 'video/mp4' });
            recordedBlobRef.current = blob;
            // Create in-memory object URL for live preview only - DO NOT store in database yet!
            const url = URL.createObjectURL(blob);
            setSessionVideoUrl(url);
            setVideoUrl(url);

            // Also capture a thumbnail frame for the collected files stack
            if (videoRef.current && canvasRef.current) {
              try {
                const canvas = canvasRef.current;
                canvas.width = videoRef.current.videoWidth || 640;
                canvas.height = videoRef.current.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const thumb = canvas.toDataURL('image/jpeg', 0.8);
                if (thumb) {
                  setSessionPhotos(prev => [...prev, thumb]);
                }
              } catch (_) {}
            }
          };
          mr.start(200);
          mediaRecorderRef.current = mr;
        }
      } catch (recErr) {
        console.warn('[Camera] MediaRecorder start note:', recErr);
      }
    } else {
      // STOP RECORDING
      setIsRecordingVideo(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
    }
  };

  const handleRemoveSessionPhoto = (index) => {
    setSessionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSavedPhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!brand.trim()) {
      setErrorMsg('Vehicle Brand is required. Please enter or select the vehicle brand.');
      return;
    }
    if (!model.trim()) {
      setErrorMsg('Vehicle Model is required. Please enter the vehicle model.');
      return;
    }
    if (!regNumber.trim()) {
      setErrorMsg('Vehicle Registration Number is required. Please enter the plate number.');
      return;
    }
    if (!photos || photos.length === 0) {
      setErrorMsg('Vehicle Camera Inspection is required. Please capture at least 1 photo using the camera before starting the trip.');
      return;
    }

    // ONLY store the taken video and image files in the database AFTER "Complete Inspection & Start Trip" is clicked
    let finalVideoUrl = videoUrl;
    if (recordedBlobRef.current) {
      try {
        const savedUrl = await saveRecordedVideo(trip?.id || 'TRP', recordedBlobRef.current, {
          brand: brand.trim(),
          model: model.trim(),
          regNumber: regNumber.trim().toUpperCase()
        });
        if (savedUrl) finalVideoUrl = savedUrl;
      } catch (saveErr) {
        console.warn('[Inspection] Error saving recorded video on submit:', saveErr);
      }
    }

    const inspectionRecord = saveVehicleDetailsWith5DayRetention(trip?.id || 'TRP', {
      brand: brand.trim(),
      model: model.trim(),
      regNumber: regNumber.trim().toUpperCase(),
      photos,
      videoUrl: finalVideoUrl,
      notes: notes.trim()
    });

    onComplete({
      brand: brand.trim(),
      model: model.trim(),
      regNumber: regNumber.trim().toUpperCase(),
      photos,
      videoUrl: finalVideoUrl,
      notes: notes.trim(),
      inspectionRecord
    });
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 0
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            background: 'var(--sheet, #FFFFFF)',
            borderRadius: '28px 28px 0 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Subtle Top Drag Indicator */}
          <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center', background: 'var(--sheet, #FFFFFF)' }}>
            <div style={{ width: '38px', height: '4px', borderRadius: '999px', background: 'var(--line, #E2E8F0)' }} />
          </div>

          {/* Minimalist Header */}
          <div
            style={{
              padding: '10px 20px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--sheet, #FFFFFF)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 850, color: 'var(--ink, #0F172A)', letterSpacing: '-0.02em' }}>
                  Vehicle Verification
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 750, padding: '2px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)', color: 'var(--ink, #0F172A)' }}>
                  {trip?.id ? `#${trip.id}` : 'Pre-Trip'}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)', marginTop: '2px', display: 'block' }}>
                Verify vehicle & capture photos to unlock trip start
              </span>
            </div>

            <button
              type="button"
              onClick={onCancel}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--field, #F1F5F9)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink, #0F172A)',
                transition: 'background 0.15s ease'
              }}
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            style={{
              padding: '4px 20px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Error Message if any */}
            {errorMsg && (
              <div style={{ background: 'var(--field, #F1F5F9)', border: '1px solid var(--line, #CBD5E1)', color: 'var(--ink, #0F172A)', padding: '10px 14px', borderRadius: '14px', fontSize: '12.5px', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={15} color="var(--ink, #0F172A)" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Unified Vehicle Spec Card (Brand + Model + License Plate) */}
            <div
              style={{
                background: 'var(--field, #F8FAFC)',
                border: '1.5px solid var(--line, #E2E8F0)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Vehicle Details
              </div>

              {/* 2-Column: Brand & Model with Suggestion Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Brand Column */}
                <div ref={brandContainerRef} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 750, color: 'var(--muted, #64748B)' }}>
                      Brand
                    </label>
                    {brand && (
                      <span style={{ fontSize: '10px', color: 'var(--muted, #94A3B8)', fontWeight: 600 }}>
                        {INDIAN_VEHICLE_DATABASE[brand]?.length ? `${INDIAN_VEHICLE_DATABASE[brand].length} models` : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={brandInputRef}
                      type="text"
                      value={brand}
                      onChange={e => {
                        setBrand(e.target.value);
                        setIsTypingBrand(true);
                        setShowBrandDropdown(true);
                      }}
                      onFocus={() => {
                        setIsTypingBrand(false);
                        setShowBrandDropdown(true);
                        setShowModelDropdown(false);
                      }}
                      onClick={() => {
                        setIsTypingBrand(false);
                        setShowBrandDropdown(true);
                      }}
                      placeholder="e.g. Maruti, Tata"
                      style={{
                        width: '100%',
                        padding: brand ? '11px 54px 11px 12px' : '11px 34px 11px 12px',
                        borderRadius: '12px',
                        border: showBrandDropdown ? '1.5px solid var(--ink, #0F172A)' : '1px solid var(--line, #CBD5E1)',
                        background: 'var(--card, #FFFFFF)',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: 'var(--ink, #0F172A)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border 0.15s ease'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {brand && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBrand('');
                            setModel('');
                            setIsTypingBrand(false);
                            setShowBrandDropdown(true);
                            if (brandInputRef.current) brandInputRef.current.focus();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--muted, #94A3B8)',
                            borderRadius: '50%'
                          }}
                          title="Clear brand"
                          aria-label="Clear brand"
                        >
                          <Icon name="x" size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTypingBrand(false);
                          setShowBrandDropdown(prev => !prev);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted, #64748B)',
                          transform: `rotate(${showBrandDropdown ? '180deg' : '0deg'})`,
                          transition: 'transform 0.18s ease'
                        }}
                      >
                        <Icon name="chevronDown" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Floating Brand Dropdown Menu */}
                  {showBrandDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        left: 0,
                        right: 0,
                        zIndex: 120,
                        background: 'var(--card, #FFFFFF)',
                        border: '1.5px solid var(--line, #CBD5E1)',
                        borderRadius: '14px',
                        boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.06)',
                        maxHeight: '210px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ padding: '6px 8px 4px', fontSize: '10px', fontWeight: 800, color: 'var(--muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isTypingBrand && brand.trim() ? `Matching Brands (${brandSuggestions.length})` : `All Indian Brands (${brandSuggestions.length})`}
                      </div>
                      {brandSuggestions.length > 0 ? (
                        brandSuggestions.map((b) => {
                          const isSelected = brand.toLowerCase() === b.toLowerCase();
                          return (
                            <div
                              key={b}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectBrand(b);
                              }}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: isSelected ? 'var(--field, #F1F5F9)' : 'transparent',
                                transition: 'background 0.12s ease',
                                boxSizing: 'border-box',
                                width: '100%',
                                minWidth: 0
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'var(--field, #F8FAFC)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 650, color: 'var(--ink, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {b}
                              </span>
                              {isSelected && (
                                <Icon name="check" size={13} color="var(--ink, #0F172A)" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)', display: 'block', marginBottom: '6px' }}>
                            Brand not in list
                          </span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectBrand(brand);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              background: 'var(--field, #F1F5F9)',
                              border: '1px solid var(--line, #CBD5E1)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: 'var(--ink, #0F172A)',
                              cursor: 'pointer'
                            }}
                          >
                            Use "{brand}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Model Column - Only enabled after Brand is selected */}
                <div ref={modelContainerRef} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 750, color: 'var(--muted, #64748B)' }}>
                      Model
                    </label>
                    {isBrandSelected && (
                      <span style={{ fontSize: '10px', color: 'var(--muted, #64748B)', fontWeight: 600 }}>
                        {brand}
                      </span>
                    )}
                  </div>
                  <div
                    style={{ position: 'relative' }}
                    onClick={() => {
                      if (!isBrandSelected) {
                        setIsTypingBrand(false);
                        setShowBrandDropdown(true);
                      }
                    }}
                  >
                    <input
                      ref={modelInputRef}
                      type="text"
                      disabled={!isBrandSelected}
                      value={model}
                      onChange={e => {
                        setModel(e.target.value);
                        setIsTypingModel(true);
                        setShowModelDropdown(true);
                      }}
                      onFocus={() => {
                        if (isBrandSelected) {
                          setIsTypingModel(false);
                          setShowModelDropdown(true);
                          setShowBrandDropdown(false);
                        }
                      }}
                      onClick={() => {
                        if (isBrandSelected) {
                          setIsTypingModel(false);
                          setShowModelDropdown(true);
                        }
                      }}
                      placeholder={isBrandSelected ? `e.g. ${INDIAN_VEHICLE_DATABASE[brand]?.[0] || 'Swift'}` : 'Select brand first'}
                      style={{
                        width: '100%',
                        padding: (model && isBrandSelected) ? '11px 54px 11px 12px' : '11px 34px 11px 12px',
                        borderRadius: '12px',
                        border: showModelDropdown ? '1.5px solid var(--ink, #0F172A)' : '1px solid var(--line, #CBD5E1)',
                        background: isBrandSelected ? 'var(--card, #FFFFFF)' : 'var(--field, #F1F5F9)',
                        opacity: isBrandSelected ? 1 : 0.75,
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: 'var(--ink, #0F172A)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: isBrandSelected ? 'text' : 'not-allowed',
                        transition: 'border 0.15s ease'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {model && isBrandSelected && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModel('');
                            setIsTypingModel(false);
                            setShowModelDropdown(true);
                            if (modelInputRef.current) modelInputRef.current.focus();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--muted, #94A3B8)',
                            borderRadius: '50%'
                          }}
                          title="Clear model"
                          aria-label="Clear model"
                        >
                          <Icon name="x" size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!isBrandSelected}
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isBrandSelected) {
                            setIsTypingModel(false);
                            setShowModelDropdown(prev => !prev);
                          } else {
                            setIsTypingBrand(false);
                            setShowBrandDropdown(true);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: isBrandSelected ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted, #64748B)',
                          opacity: isBrandSelected ? 1 : 0.5,
                          transform: `rotate(${showModelDropdown ? '180deg' : '0deg'})`,
                          transition: 'transform 0.18s ease'
                        }}
                      >
                        <Icon name="chevronDown" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Floating Model Dropdown Menu - Vertical Scroll Only & No Car Icon */}
                  {showModelDropdown && isBrandSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        left: 0,
                        right: 0,
                        zIndex: 120,
                        background: 'var(--card, #FFFFFF)',
                        border: '1.5px solid var(--line, #CBD5E1)',
                        borderRadius: '14px',
                        boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.06)',
                        maxHeight: '210px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ padding: '6px 8px 4px', fontSize: '10px', fontWeight: 800, color: 'var(--muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isTypingModel && model.trim() ? `Matching Models (${modelSuggestions.length})` : `${brand} Models (${modelSuggestions.length})`}
                      </div>

                      {modelSuggestions.length > 0 ? (
                        modelSuggestions.map((m, idx) => {
                          const isSelected = model.toLowerCase() === m.toLowerCase();

                          return (
                            <div
                              key={`${m}-${idx}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectModel(m);
                              }}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: isSelected ? 'var(--field, #F1F5F9)' : 'transparent',
                                transition: 'background 0.12s ease',
                                boxSizing: 'border-box',
                                width: '100%',
                                minWidth: 0
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'var(--field, #F8FAFC)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 650, color: 'var(--ink, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m}
                              </span>
                              {isSelected && (
                                <Icon name="check" size={13} color="var(--ink, #0F172A)" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)', display: 'block', marginBottom: '6px' }}>
                            Model not in {brand} list
                          </span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectModel(model);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              background: 'var(--field, #F1F5F9)',
                              border: '1px solid var(--line, #CBD5E1)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: 'var(--ink, #0F172A)',
                              cursor: 'pointer'
                            }}
                          >
                            Use "{model}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Number - Standard Clean Filling Style Box */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 750, color: 'var(--muted, #64748B)', marginBottom: '5px' }}>
                  Registration Number
                </label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={e => setRegNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KL 07 CD 1234"
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--line, #CBD5E1)',
                    background: 'var(--card, #FFFFFF)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: 'var(--ink, #0F172A)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    textTransform: 'uppercase'
                  }}
                />
              </div>
            </div>

            {/* 2. Visual Camera Inspection Card (Photos & Video captured via Open Camera) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Camera Photos & Video
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 750,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: (photos.length > 0 || videoUrl) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0, 0, 0, 0.05)',
                    color: (photos.length > 0 || videoUrl) ? '#15803D' : 'var(--muted, #64748B)'
                  }}
                >
                  {photos.length > 0 || videoUrl
                    ? `✓ ${photos.length} Photo${photos.length !== 1 ? 's' : ''}${videoUrl ? ' + 1 Video' : ''}`
                    : 'Required'}
                </span>
              </div>

              {photos.length === 0 && !videoUrl ? (
                /* Ultra-clean Minimalist Camera Action Card */
                <div
                  onClick={() => handleOpenCustomCamera('photo')}
                  style={{
                    background: '#0B0F19',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div>
                    <b style={{ fontSize: '15px', fontWeight: 800, display: 'block', letterSpacing: '-0.01em' }}>
                      Take Vehicle Photos & Video
                    </b>
                    <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px', display: 'block' }}>
                      Snap exterior angles or record walkaround in camera
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{
                      padding: '8px 24px',
                      borderRadius: '999px',
                      background: '#FFFFFF',
                      color: '#000000',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Open Camera
                  </button>
                </div>
              ) : (
                /* Minimalist Filmstrip Gallery + Snap More button */
                <div
                  style={{
                    background: 'var(--field, #F8FAFC)',
                    border: '1.5px solid var(--line, #E2E8F0)',
                    borderRadius: '20px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 750, color: 'var(--ink, #0F172A)' }}>
                      Captured Media ({photos.length + (videoUrl ? 1 : 0)})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenCustomCamera('photo')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: '#000000',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: 750,
                        cursor: 'pointer'
                      }}
                    >
                      + Take More
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {photos.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '74px',
                          height: '74px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid var(--line, #CBD5E1)',
                          background: '#000000'
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Vehicle photo ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSavedPhoto(idx);
                          }}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.75)',
                            color: '#FFFFFF',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          aria-label="Remove photo"
                        >
                          <Icon name="x" size={10} color="#FFFFFF" />
                        </button>
                      </div>
                    ))}

                    {/* Recorded Video thumbnail item in filmstrip */}
                    {videoUrl && (
                      <div
                        style={{
                          position: 'relative',
                          width: '74px',
                          height: '74px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '2px solid #22C55E',
                          background: '#000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <video
                          src={videoUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.38)',
                            pointerEvents: 'none'
                          }}
                        >
                          <Icon name="video" size={20} color="#22C55E" />
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                            Video
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVideoUrl(null);
                            setSessionVideoUrl(null);
                            recordedBlobRef.current = null;
                          }}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: '#FFFFFF',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 2
                          }}
                          aria-label="Remove video"
                        >
                          <Icon name="x" size={10} color="#FFFFFF" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Minimal Notes Row */}
            <div
              style={{
                background: 'var(--field, #F8FAFC)',
                border: '1px solid var(--line, #E2E8F0)',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon name="edit" size={15} color="var(--muted, #64748B)" />
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Pre-existing scratch or note (optional)"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12.5px',
                  color: 'var(--ink, #0F172A)',
                  outline: 'none'
                }}
              />
            </div>

            {/* 4. Elegant Micro Security Tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted, #64748B)' }}>
              <Icon name="shield" size={13} color="#2563EB" />
              <span>Records auto-erased in 5 days · Protected for insurance & disputes</span>
            </div>
          </div>

          {/* Footer Sticky Start Trip Action */}
          <div
            style={{
              padding: '14px 20px max(20px, calc(env(safe-area-inset-bottom, 0px) + 14px))',
              borderTop: '1px solid var(--line, #F1F5F9)',
              background: 'var(--sheet, #FFFFFF)'
            }}
          >
            {(() => {
              const isReady = Boolean(brand.trim() && model.trim() && regNumber.trim() && photos.length > 0);
              let btnLabel = 'Complete Inspection & Start Trip';
              if (!brand.trim()) btnLabel = 'Enter Vehicle Brand';
              else if (!model.trim()) btnLabel = 'Enter Vehicle Model';
              else if (!regNumber.trim()) btnLabel = 'Enter Registration Number';
              else if (photos.length === 0) btnLabel = 'Capture Photos (Camera Required)';

              return (
                <>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isReady}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      background: isReady ? '#000000' : '#94A3B8',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 850,
                      border: 'none',
                      cursor: isReady ? 'pointer' : 'not-allowed',
                      boxShadow: isReady ? '0 4px 16px rgba(0, 0, 0, 0.25)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{btnLabel}</span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* =========================================================
          CUSTOM CAMERA UI (Real Camera Style with Minimal Shutter,
          Back-to-Back Side Bottom Previews, Cancel & Done Buttons)
          ========================================================= */}
      {isCustomCameraOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100005,
            background: '#000000',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Real Live Video Viewport */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              width: '100%',
              background: '#000000',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* Flash Overlay Effect on Snap */}
            {flashActive && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#FFFFFF',
                  opacity: 0.9,
                  zIndex: 10,
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Camera Viewfinder Guides / Frame */}
            <div
              style={{
                position: 'absolute',
                inset: '24px',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Center Crosshair Guide */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '1px dashed rgba(255, 255, 255, 0.4)',
                  borderRadius: '50%'
                }}
              />
            </div>

            {/* Top Camera Controls Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 'calc(env(safe-area-inset-top, 20px) + 12px) 16px 14px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}
            >
              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancelCamera}
                style={{
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.02em'
                }}
              >
                Cancel
              </button>

              {/* Status / Recording Timer Badge */}
              <div
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: isRecordingVideo ? '#EF4444' : 'rgba(0, 0, 0, 0.55)',
                  backdropFilter: 'blur(10px)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 750,
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isRecordingVideo ? (
                  <>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF', animation: 'pulse 1s infinite' }} />
                    <span>REC 00:{String(recordDuration).padStart(2, '0')}</span>
                  </>
                ) : (
                  <span>{sessionPhotos.length + (sessionVideoUrl ? 1 : 0)} Captured</span>
                )}
              </div>

              {/* Done Button: Saves all taken images & video */}
              <button
                type="button"
                onClick={handleDoneCamera}
                style={{
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  color: '#FFD60A',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.02em'
                }}
              >
                Done
              </button>
            </div>
          </div>

          {/* Quick Drawer for Collected Files (Opens when tapping the collected stack) */}
          {showGallerySheet && (
            <div
              style={{
                position: 'absolute',
                bottom: '150px',
                left: '16px',
                right: '16px',
                background: 'rgba(24, 24, 27, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '18px',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.75)',
                zIndex: 35
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                  Collected Files ({sessionPhotos.length + (sessionVideoUrl ? 1 : 0)})
                </span>
                <button
                  type="button"
                  onClick={() => setShowGallerySheet(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {sessionPhotos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.25)' }}>
                    <img src={url} alt={`Snap ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveSessionPhoto(i)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove"
                    >
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                ))}
                {sessionVideoUrl && (
                  <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1.5px solid #22C55E', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="video" size={24} color="#22C55E" />
                    <button
                      type="button"
                      onClick={() => setSessionVideoUrl(null)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove Video"
                    >
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Camera Controls Bar (Apple Style Layout: Mode Toggle + Left Stack + Center Shutter + Right Flip) */}
          <div
            style={{
              padding: '12px 24px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
              background: '#000000',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative'
            }}
          >
            {/* Apple Camera Mode Switch: PHOTO / VIDEO */}
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => { if (!isRecordingVideo) setCaptureMode('photo'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: captureMode === 'photo' ? '#FFD60A' : 'rgba(255, 255, 255, 0.55)',
                  fontSize: '13px',
                  fontWeight: captureMode === 'photo' ? 850 : 600,
                  letterSpacing: '0.08em',
                  cursor: isRecordingVideo ? 'not-allowed' : 'pointer',
                  padding: '2px 6px',
                  textShadow: captureMode === 'photo' ? '0 0 10px rgba(255, 214, 10, 0.4)' : 'none',
                  transition: 'color 0.2s ease'
                }}
              >
                PHOTO
              </button>
              <button
                type="button"
                onClick={() => { if (!isRecordingVideo) setCaptureMode('video'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: captureMode === 'video' ? '#FFD60A' : 'rgba(255, 255, 255, 0.55)',
                  fontSize: '13px',
                  fontWeight: captureMode === 'video' ? 850 : 600,
                  letterSpacing: '0.08em',
                  cursor: isRecordingVideo ? 'not-allowed' : 'pointer',
                  padding: '2px 6px',
                  textShadow: captureMode === 'video' ? '0 0 10px rgba(255, 214, 10, 0.4)' : 'none',
                  transition: 'color 0.2s ease'
                }}
              >
                VIDEO
              </button>
            </div>

            {/* Main Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              {/* LEFT: File Collected / Photo Stack Style Thumbnail Box */}
              <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  onClick={() => (sessionPhotos.length > 0 || sessionVideoUrl) && setShowGallerySheet(prev => !prev)}
                  style={{
                    position: 'relative',
                    width: '52px',
                    height: '52px',
                    cursor: (sessionPhotos.length > 0 || sessionVideoUrl) ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}
                  title={sessionPhotos.length > 0 ? 'View collected inspection files' : 'No files collected yet'}
                >
                  {sessionPhotos.length === 0 && !sessionVideoUrl ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px',
                        border: '1.5px dashed rgba(255, 255, 255, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: '10px',
                        fontWeight: 600
                      }}
                    >
                      Empty
                    </div>
                  ) : (
                    <>
                      {/* Stack effect layer 2 (behind) */}
                      {sessionPhotos.length > 2 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.25)',
                            transform: 'rotate(-6deg) scale(0.92)',
                            zIndex: 1
                          }}
                        />
                      )}
                      {/* Stack effect layer 1 (behind) */}
                      {sessionPhotos.length > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            transform: 'rotate(5deg) scale(0.95)',
                            zIndex: 2
                          }}
                        />
                      )}
                      {/* Main Top Thumbnail */}
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                          zIndex: 3,
                          background: '#000000'
                        }}
                      >
                        <img
                          src={sessionPhotos[sessionPhotos.length - 1] || ''}
                          alt="Collected Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {sessionVideoUrl && sessionPhotos.length === 0 && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                            <Icon name="video" size={16} color="#FFFFFF" />
                          </div>
                        )}
                      </div>
                      {/* Counter Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          background: '#22C55E',
                          color: '#FFFFFF',
                          borderRadius: '999px',
                          padding: '1px 6px',
                          fontSize: '10px',
                          fontWeight: 900,
                          border: '2px solid #000000',
                          zIndex: 5,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                      >
                        {sessionPhotos.length + (sessionVideoUrl ? 1 : 0)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CENTER: Shutter Button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={captureMode === 'photo' ? handleSnapPhoto : handleToggleVideoRecord}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'transparent',
                    border: '4px solid #FFFFFF',
                    padding: '4px',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.08s ease'
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  title={captureMode === 'photo' ? 'Tap to snap photo' : (isRecordingVideo ? 'Tap to stop recording' : 'Tap to start recording')}
                  aria-label={captureMode === 'photo' ? 'Capture photo' : (isRecordingVideo ? 'Stop video' : 'Record video')}
                >
                  {captureMode === 'photo' ? (
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: '#FFFFFF'
                      }}
                    />
                  ) : isRecordingVideo ? (
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: '#EF4444'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: '#EF4444'
                      }}
                    />
                  )}
                </button>
              </div>

              {/* RIGHT: Flip Camera Button (Symmetrical & Clean Apple Layout) */}
              <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleFlipFacingMode}
                  disabled={isRecordingVideo}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.18)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isRecordingVideo ? 'not-allowed' : 'pointer',
                    opacity: isRecordingVideo ? 0.4 : 1
                  }}
                  title="Flip camera"
                  aria-label="Flip camera front/back"
                >
                  <Icon name="flip" size={20} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>

          {/* Offscreen Canvas for Frame Snapping */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}
    </>
  );
}
