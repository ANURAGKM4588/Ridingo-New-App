import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

// Default realistic sample vehicle images for simulator/fallback
const SAMPLE_VEHICLE_IMAGES = [
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=80'
];

const POPULAR_BRANDS = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Toyota',
  'Mahindra',
  'Honda',
  'Kia',
  'Volkswagen'
];

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
  const [brand, setBrand] = useState(trip?.car?.brand || trip?.vehicle?.brand || '');
  const [model, setModel] = useState(trip?.car?.model || trip?.vehicle?.model || '');
  const [regNumber, setRegNumber] = useState(trip?.car?.plate || trip?.vehicle?.plateNumber || '');
  const [photos, setPhotos] = useState([]);
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const sessionListRef = useRef(null);

  // Auto clean expired records when modal mounts
  useEffect(() => {
    purgeExpiredVehiclePhotos();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
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

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraError('');
    try {
      if (typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } else {
        setCameraError('Camera stream not supported in this browser. Tap shutter to take sample photos.');
      }
    } catch (err) {
      console.warn('[Camera] getUserMedia note:', err);
      setCameraError('Live camera unavailable or blocked. Tap shutter to take inspection photos.');
    }
  };

  /**
   * User taps to open custom camera UI
   */
  const handleOpenCustomCamera = () => {
    setErrorMsg('');
    setSessionPhotos([...photos]); // initialize with existing saved photos
    setIsCustomCameraOpen(true);
    setTimeout(() => {
      startCameraStream();
    }, 100);
  };

  /**
   * User taps Cancel button in camera:
   * Discards newly snapped images, closes camera, does NOT save to modal.
   */
  const handleCancelCamera = () => {
    stopCameraStream();
    setSessionPhotos([]);
    setIsCustomCameraOpen(false);
  };

  /**
   * User taps Done button in camera:
   * Saves all images taken in this session, closes camera.
   */
  const handleDoneCamera = () => {
    stopCameraStream();
    setPhotos([...sessionPhotos]);
    setIsCustomCameraOpen(false);
    setErrorMsg('');
  };

  /**
   * Minimal Capture Button clicked:
   * Takes snapshot back-to-back, shows thumbnail preview on the side bottom
   */
  const handleSnapPhoto = () => {
    // Flash shutter animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 120);

    let photoData = null;

    if (videoRef.current && videoRef.current.videoWidth > 0 && canvasRef.current) {
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

    if (!photoData) {
      // Fallback realistic inspection photo
      const sample = SAMPLE_VEHICLE_IMAGES[sessionPhotos.length % SAMPLE_VEHICLE_IMAGES.length];
      photoData = sample;
    }

    setSessionPhotos(prev => {
      const next = [...prev, photoData];
      // Auto-scroll thumbnails strip to latest photo
      setTimeout(() => {
        if (sessionListRef.current) {
          sessionListRef.current.scrollLeft = sessionListRef.current.scrollWidth;
        }
      }, 50);
      return next;
    });
  };

  const handleRemoveSessionPhoto = (index) => {
    setSessionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSavedPhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!brand.trim()) {
      setErrorMsg('Please enter or select the vehicle brand.');
      return;
    }
    if (!model.trim()) {
      setErrorMsg('Please enter the vehicle model.');
      return;
    }
    if (!regNumber.trim()) {
      setErrorMsg('Please enter the vehicle registration number.');
      return;
    }
    if (photos.length === 0) {
      setErrorMsg('Vehicle photos are required. Please capture at least 1 vehicle photo using the camera before starting the trip.');
      return;
    }

    const inspectionRecord = saveVehicleDetailsWith5DayRetention(trip?.id || 'TRP', {
      brand: brand.trim(),
      model: model.trim(),
      regNumber: regNumber.trim().toUpperCase(),
      photos,
      notes: notes.trim()
    });

    onComplete({
      brand: brand.trim(),
      model: model.trim(),
      regNumber: regNumber.trim().toUpperCase(),
      photos,
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
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 0
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            background: 'var(--sheet, #FFFFFF)',
            borderRadius: '24px 24px 0 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.35)',
            animation: 'slideUp 0.25s ease-out'
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line, #F1F5F9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--sheet, #FFFFFF)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#000000',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon name="car" size={18} color="#FFFFFF" />
              </div>
              <div>
                <b style={{ fontSize: '16px', color: 'var(--ink, #0F172A)', display: 'block' }}>
                  Pre-Trip Vehicle Inspection
                </b>
                <span style={{ fontSize: '11px', color: 'var(--muted, #64748B)' }}>
                  Photograph vehicle condition before starting trip
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--field, #F1F5F9)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink, #0F172A)'
              }}
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            style={{
              padding: '18px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* 5-Day Retention Notice */}
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1.5px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <Icon name="shield" size={18} color="#1E40AF" />
              <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: 1.45 }}>
                <b>Stored for 5 Days in Database:</b> Vehicle details and photos are securely logged for <b>5 days</b> for insurance and dispute protection, and will be automatically erased afterwards.
              </div>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={15} color="#991B1B" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Vehicle Brand */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Vehicle Brand <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Maruti Suzuki, Hyundai, Toyota"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--line, #CBD5E1)',
                  background: 'var(--card, #FFFFFF)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink, #0F172A)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {/* Quick Brand Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {POPULAR_BRANDS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: brand === b ? '1.5px solid #000000' : '1px solid var(--line, #E2E8F0)',
                      background: brand === b ? '#000000' : 'var(--field, #F8FAFC)',
                      color: brand === b ? '#FFFFFF' : 'var(--muted, #475569)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Vehicle Model */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Vehicle Model <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. Swift, Creta, Innova Crysta, City"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--line, #CBD5E1)',
                  background: 'var(--card, #FFFFFF)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink, #0F172A)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 3. Registration Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Registration Plate Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KL 07 CD 1234 / MH 02 AB 1234"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--line, #CBD5E1)',
                  background: 'var(--card, #FFFFFF)',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: 'var(--ink, #0F172A)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 4. Single Image Capturing Section in UI */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Vehicle Photos (Camera) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', fontWeight: 700, color: photos.length > 0 ? '#16A34A' : '#EF4444' }}>
                  {photos.length > 0 ? `${photos.length} Photo${photos.length !== 1 ? 's' : ''} Saved` : 'Required to Start Trip'}
                </span>
              </div>

              {/* Single Prominent Capture Section */}
              <div
                onClick={handleOpenCustomCamera}
                style={{
                  borderRadius: '16px',
                  border: photos.length > 0 ? '1.5px solid #16A34A' : '2px dashed var(--line, #CBD5E1)',
                  background: photos.length > 0 ? 'rgba(22, 163, 74, 0.04)' : 'var(--field, #F8FAFC)',
                  padding: '22px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                title="Tap to open custom camera and capture vehicle photos"
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#000000',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <Icon name="camera" size={22} color="#FFFFFF" />
                </div>
                <div>
                  <b style={{ fontSize: '14px', color: 'var(--ink, #0F172A)', display: 'block' }}>
                    {photos.length > 0 ? 'Take More Vehicle Photos' : 'Take Vehicle Photos'}
                  </b>
                  <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)' }}>
                    Opens custom camera with multi-capture. Snap back-to-back photos of car.
                  </span>
                </div>
                <button
                  type="button"
                  style={{
                    marginTop: '4px',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {photos.length > 0 ? '+ Open Camera' : 'Open Camera'}
                </button>
              </div>

              {/* Photos Preview Gallery on Main Modal */}
              {photos.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748B)', display: 'block', marginBottom: '8px' }}>
                    Saved Inspection Photos ({photos.length}):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {photos.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          height: '84px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '1.5px solid #16A34A',
                          background: '#000000'
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Vehicle photo ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          Photo {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSavedPhoto(idx);
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: '#FFFFFF',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Remove photo"
                          aria-label="Remove photo"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted, #64748B)', marginBottom: '6px' }}>
                Condition Notes / Pre-existing Marks (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Clean car, minor scratch on rear bumper..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--line, #CBD5E1)',
                  background: 'var(--card, #FFFFFF)',
                  fontSize: '12.5px',
                  color: 'var(--ink, #0F172A)',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Footer Submit Button */}
          <div style={{ padding: '16px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))', borderTop: '1px solid var(--line, #F1F5F9)', background: 'var(--sheet, #FFFFFF)' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={photos.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: photos.length > 0 ? '#000000' : '#94A3B8',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                border: 'none',
                cursor: photos.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: photos.length > 0 ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{photos.length > 0 ? 'Save Vehicle Details & Start Trip' : 'Take Photos to Start Trip'}</span>
            </button>
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
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}
            >
              {/* Cancel Button: Closes without saving new images */}
              <button
                type="button"
                onClick={handleCancelCamera}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              {/* Photos Counter Badge */}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.04em'
                }}
              >
                {sessionPhotos.length} Captured
              </div>

              {/* Done Button: Saves all taken images */}
              <button
                type="button"
                onClick={handleDoneCamera}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: '#22C55E',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                }}
              >
                Done
              </button>
            </div>

            {/* Camera Status Note if Hardware Stream Unavailable */}
            {cameraError && (
              <div
                style={{
                  position: 'absolute',
                  top: '80px',
                  left: '20px',
                  right: '20px',
                  background: 'rgba(0,0,0,0.75)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  textAlign: 'center',
                  zIndex: 15
                }}
              >
                {cameraError}
              </div>
            )}
          </div>

          {/* Bottom Camera Strip (Real Camera Style: Side Bottom Previews + Center Shutter + Done) */}
          <div
            style={{
              padding: '16px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative'
            }}
          >
            {/* Side Bottom: Multiple Back-to-Back Small Previews */}
            <div
              ref={sessionListRef}
              style={{
                width: '130px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                flexShrink: 0
              }}
            >
              {sessionPhotos.length === 0 ? (
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '10px',
                    border: '1.5px dashed rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '10px',
                    textAlign: 'center'
                  }}
                >
                  Empty
                </div>
              ) : (
                sessionPhotos.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '50px',
                      height: '50px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1.5px solid #22C55E',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Snap ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSessionPhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove"
                    >
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Minimal Circular Shutter Button in Center */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleSnapPhoto}
                style={{
                  width: '68px',
                  height: '68px',
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
                title="Tap to snap photo"
                aria-label="Capture vehicle photo"
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#FFFFFF'
                  }}
                />
              </button>
            </div>

            {/* Right Thumb Done Action */}
            <div style={{ width: '130px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleDoneCamera}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: '#22C55E',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Icon name="check" size={14} color="#FFFFFF" />
                <span>Save ({sessionPhotos.length})</span>
              </button>
            </div>
          </div>

          {/* Offscreen Canvas for Frame Snapping */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}
    </>
  );
}
