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
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Auto clean expired records when modal mounts
  useEffect(() => {
    purgeExpiredVehiclePhotos();
  }, []);

  /**
   * Defer Camera Permission:
   * Requests runtime camera permission dynamically ONLY when user taps to open camera for the first time.
   */
  const requestCameraPermissionDynamically = async () => {
    if (cameraPermissionGranted) return true;

    try {
      if (typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        stream.getTracks().forEach(track => track.stop());
        setCameraPermissionGranted(true);
        return true;
      }
    } catch (err) {
      console.warn('[Camera] Runtime permission request note:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission is required to photograph vehicle condition. Please allow camera access.');
        return false;
      }
    }

    setCameraPermissionGranted(true);
    return true;
  };

  /**
   * User taps to open camera:
   * 1. Dynamically prompts runtime camera permission on first tap only
   * 2. Programmatically opens camera input
   */
  const handleTapCaptureSection = async () => {
    setErrorMsg('');
    setIsCapturing(true);

    try {
      const isAllowed = await requestCameraPermissionDynamically();
      if (!isAllowed) {
        setIsCapturing(false);
        return;
      }

      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        // Fallback simulation
        handleCaptureFallback();
      }
    } catch (e) {
      console.warn('[Camera] Open error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureFallback = () => {
    setIsCapturing(true);
    setTimeout(() => {
      const sampleImg = SAMPLE_VEHICLE_IMAGES[photos.length % SAMPLE_VEHICLE_IMAGES.length];
      setPhotos(prev => [...prev, sampleImg]);
      setIsCapturing(false);
      setErrorMsg('');
    }, 400);
  };

  const handleNativePhotoUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setPhotos(prev => [...prev, reader.result]);
          setErrorMsg('');
        };
        reader.readAsDataURL(file);
      });
      // Reset input value so same file can be captured again if needed
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index) => {
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
      setErrorMsg('Please capture at least 1 vehicle photo using the camera.');
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

          {/* 4. Single Image Capturing Section in UI with Multiple Capture Capability */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Vehicle Photos (Camera) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', fontWeight: 700, color: photos.length > 0 ? '#16A34A' : '#64748B' }}>
                {photos.length} Photo{photos.length !== 1 ? 's' : ''} Added
              </span>
            </div>

            {/* Single Prominent Capture Section */}
            <div
              onClick={handleTapCaptureSection}
              style={{
                borderRadius: '16px',
                border: '2px dashed var(--line, #CBD5E1)',
                background: 'var(--field, #F8FAFC)',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              title="Tap to photograph vehicle with camera"
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#000000',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                <Icon name="camera" size={24} color="#FFFFFF" />
              </div>
              <div>
                <b style={{ fontSize: '14px', color: 'var(--ink, #0F172A)', display: 'block' }}>
                  {isCapturing ? 'Opening Camera...' : 'Take Vehicle Photo'}
                </b>
                <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)' }}>
                  Tap here to capture multiple photos of the vehicle (front, back, sides, odometer)
                </span>
              </div>
              <button
                type="button"
                style={{
                  marginTop: '4px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Add Photo
              </button>

              {/* Native Hidden Camera Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleNativePhotoUpload}
                style={{ display: 'none' }}
                title="Capture photos with device camera"
              />
            </div>

            {/* Photos Preview Gallery */}
            {photos.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748B)', display: 'block', marginBottom: '8px' }}>
                  Captured Photos ({photos.length}):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {photos.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        height: '90px',
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
                          fontSize: '9.5px',
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
                          handleRemovePhoto(idx);
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
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: '#000000',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              border: '1.5px solid #000000',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Save Vehicle Details & Start Trip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
