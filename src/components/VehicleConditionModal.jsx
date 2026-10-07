import React, { useState } from 'react';
import Icon from './Icon';

// Default realistic sample angle inspection previews
const SAMPLE_ANGLE_IMAGES = {
  front: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=500&auto=format&fit=crop&q=80',
  left: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80',
  back: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=80',
  top: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500&auto=format&fit=crop&q=80'
};

const ANGLES = [
  { id: 'front', label: 'Front Angle', desc: 'Bumper, Hood, Headlights', icon: 'camera' },
  { id: 'left', label: 'Left Angle', desc: 'Driver Doors, Fender, Wheels', icon: 'camera' },
  { id: 'back', label: 'Back Angle', desc: 'Boot, Taillights, Rear Bumper', icon: 'camera' },
  { id: 'top', label: 'Top / Right Angle', desc: 'Roof, Passenger Side, Windows', icon: 'camera' }
];

export default function VehicleConditionModal({ trip, onComplete, onCancel }) {
  const [photos, setPhotos] = useState({
    front: null,
    left: null,
    back: null,
    top: null
  });

  const [activeAngle, setActiveAngle] = useState(null);
  const [scratches, setScratches] = useState([]);
  const [notes, setNotes] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const allCaptured = photos.front && photos.left && photos.back && photos.top;

  const handleCaptureAngle = (angleId) => {
    setIsCapturing(true);
    setActiveAngle(angleId);
    setTimeout(() => {
      setPhotos(prev => ({
        ...prev,
        [angleId]: SAMPLE_ANGLE_IMAGES[angleId] || 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=500'
      }));
      setIsCapturing(false);
      setActiveAngle(null);
    }, 700);
  };

  const handleFileUpload = (angleId, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotos(prev => ({ ...prev, [angleId]: url }));
    }
  };

  const toggleScratch = (item) => {
    setScratches(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleConfirm = () => {
    if (!allCaptured) return;
    onComplete({
      photos,
      scratches,
      notes: notes.trim(),
      verifiedAt: Date.now()
    });
  };

  return (
    <div
      className="vehicle-cond-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
          background: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Grab bar */}
        <div style={{ width: '36px', height: '4px', background: '#E2E8F0', borderRadius: '999px', margin: '10px auto 4px' }} />

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#16A34A', letterSpacing: '0.06em' }}>
              STEP 2 OF 2 · MANDATORY
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
              Car Condition Check
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F1F5F9',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B'
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subtitle instructions */}
          <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
            📸 <b>Snap 4 car angles</b> before starting trip to record pre-existing scratches and protect both car owner and chauffeur.
          </div>

          {/* 4 Angles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {ANGLES.map(ang => {
              const photo = photos[ang.id];
              const isBusy = isCapturing && activeAngle === ang.id;

              return (
                <div
                  key={ang.id}
                  style={{
                    borderRadius: '16px',
                    border: photo ? '1.5px solid #16A34A' : '1.5px dashed #CBD5E1',
                    background: photo ? '#F0FDF4' : '#F8FAFC',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Photo area */}
                  <div
                    style={{
                      height: '110px',
                      background: '#E2E8F0',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
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
                      <div style={{ textAlign: 'center', padding: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                          <Icon name="camera" size={18} color="#0F172A" />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                          {isBusy ? 'Capturing...' : 'Tap to Snap'}
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
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '6px'
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}

                    {/* Hidden Native File Input fallback */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileUpload(ang.id, e)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                      title="Upload or snap photo"
                    />
                  </div>

                  {/* Label & Description */}
                  <div style={{ padding: '8px 10px' }}>
                    <b style={{ fontSize: '12.5px', color: '#0F172A', display: 'block' }}>
                      {ang.label}
                    </b>
                    <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginTop: '1px' }}>
                      {ang.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Scratch / Dent Checklist */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Common Pre-existing Scratches (Tap if any)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                'Front Bumper Scuff',
                'Left Door Minor Scratch',
                'Rear Bumper Dent',
                'Right Fender Mark',
                'Clean & Intact ✓'
              ].map(tag => {
                const on = scratches.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleScratch(tag)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: on ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                      background: on ? '#0F172A' : '#FFFFFF',
                      color: on ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inspection Notes */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
              Additional Inspection Notes (Optional)
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Dust on right door, small paint chip near boot..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                fontSize: '12.5px',
                color: '#0F172A',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Footer Action */}
        <div style={{ padding: '16px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))', borderTop: '1px solid #F1F5F9', background: '#FFFFFF' }}>
          <button
            type="button"
            disabled={!allCaptured}
            onClick={handleConfirm}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: allCaptured ? '#000000' : '#A1A1AA',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              border: allCaptured ? '1.5px solid #000000' : 'none',
              cursor: allCaptured ? 'pointer' : 'not-allowed',
              boxShadow: allCaptured ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>{allCaptured ? 'Verify Condition & Unlock Start Trip ▶' : 'Snap All 4 Angles to Proceed (4 Required)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
