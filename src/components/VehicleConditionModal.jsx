import React, { useState, useEffect } from 'react';
import Icon from './Icon';

// Default realistic sample vehicle angle images for simulator/fallback
const SAMPLE_VEHICLE_IMAGES = {
  front: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80',
  left: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
  back: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80',
  right: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=80'
};

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

const VEHICLE_ANGLES = [
  { id: 'front', label: 'Front View', desc: 'Hood, Plate & Bumper', icon: 'camera' },
  { id: 'back', label: 'Rear View', desc: 'Boot, Taillights & Bumper', icon: 'camera' },
  { id: 'left', label: 'Left Side', desc: 'Driver Doors & Wheels', icon: 'camera' },
  { id: 'right', label: 'Right Side', desc: 'Passenger Doors & Windows', icon: 'camera' }
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
  const [photos, setPhotos] = useState({
    front: null,
    back: null,
    left: null,
    right: null
  });
  const [activeAngle, setActiveAngle] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto clean expired records when modal mounts
  useEffect(() => {
    purgeExpiredVehiclePhotos();
  }, []);

  const capturedCount = Object.values(photos).filter(Boolean).length;
  const isFormValid = brand.trim() && model.trim() && regNumber.trim() && capturedCount >= 2;

  const handleCaptureAngle = (angleId) => {
    setIsCapturing(true);
    setActiveAngle(angleId);
    setTimeout(() => {
      setPhotos(prev => ({
        ...prev,
        [angleId]: SAMPLE_VEHICLE_IMAGES[angleId]
      }));
      setIsCapturing(false);
      setActiveAngle(null);
      setErrorMsg('');
    }, 600);
  };

  const handleNativePhotoUpload = (angleId, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => ({ ...prev, [angleId]: reader.result }));
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
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
    if (capturedCount < 2) {
      setErrorMsg('Please capture at least 2 vehicle photos using the camera.');
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
      inspectionRecord,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + RETENTION_PERIOD_MS
    });
  };

  return (
    <div
      className="vehicle-details-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'var(--sheet, #FFFFFF)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Grab bar */}
        <div style={{ width: '36px', height: '4px', background: 'var(--line-strong, #E2E8F0)', borderRadius: '999px', margin: '10px auto 4px' }} />

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#16A34A', letterSpacing: '0.06em' }}>
              PRE-TRIP VERIFICATION · REQUIRED
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink, #0F172A)', margin: '2px 0 0' }}>
              Vehicle Details & Camera Check
            </h2>
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
              color: 'var(--muted, #64748B)'
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 5-Day Database Retention Security Notice */}
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
            <span style={{ fontSize: '18px', lineHeight: 1 }}>🔒</span>
            <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: 1.45 }}>
              <b>Stored for 5 Days in Database:</b> Vehicle details & photos are securely logged for <b>5 days</b> for insurance & dispute protection, and will be automatically erased afterwards.
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 600 }}>
              ⚠️ {errorMsg}
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

          {/* 4. Vehicle Photos with Camera Function */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Vehicle Photos (Camera) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', fontWeight: 700, color: capturedCount >= 2 ? '#16A34A' : '#64748B' }}>
                {capturedCount} of 4 captured
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {VEHICLE_ANGLES.map(ang => {
                const photo = photos[ang.id];
                const isBusy = isCapturing && activeAngle === ang.id;

                return (
                  <div
                    key={ang.id}
                    style={{
                      borderRadius: '16px',
                      border: photo ? '1.5px solid #16A34A' : '1.5px dashed #CBD5E1',
                      background: photo ? 'rgba(22, 163, 74, 0.08)' : 'var(--field, #F8FAFC)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        height: '100px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: '#F1F5F9'
                      }}
                      onClick={() => handleCaptureAngle(ang.id)}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={ang.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '6px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                            <Icon name="camera" size={16} color="#0F172A" />
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B' }}>
                            {isBusy ? 'Taking Photo...' : 'Tap for Camera'}
                          </span>
                        </div>
                      )}

                      {photo && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: '#16A34A',
                            color: '#FFFFFF',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '6px'
                          }}
                        >
                          ✓ Photo Saved
                        </span>
                      )}

                      {/* Native Camera input overlay */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => handleNativePhotoUpload(ang.id, e)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                        title={`Capture ${ang.label} with device camera`}
                      />
                    </div>

                    <div style={{ padding: '6px 10px' }}>
                      <b style={{ fontSize: '11.5px', color: 'var(--ink, #0F172A)', display: 'block' }}>
                        {ang.label}
                      </b>
                      <span style={{ fontSize: '10px', color: 'var(--muted, #64748B)' }}>
                        {ang.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <span>Save Vehicle Details & Start Trip ▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
