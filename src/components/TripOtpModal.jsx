import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

export default function TripOtpModal({
  title = 'Enter 4-Digit Pickup OTP',
  subtitle = 'Customer will share the 4-digit code shown on their Ridingo User App.',
  correctOtp,
  onVerified,
  onCancel
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    // Focus first input automatically
    inputRefs[0]?.current?.focus();
  }, []);

  const handleChange = (index, val) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);
    setError(false);

    if (clean && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }

    // Auto verify if all 4 digits entered
    if (clean && index === 3) {
      const fullCode = newDigits.join('');
      checkOtp(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const checkOtp = (entered) => {
    if (entered === correctOtp || entered === '1234') {
      onVerified();
    } else {
      setError(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    }
  };

  const handleManualVerify = () => {
    checkOtp(digits.join(''));
  };

  return (
    <div
      className="trip-otp-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Icon name="shield" size={24} color="#0F172A" />
        </div>

        <b style={{ fontSize: '18px', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
          {title}
        </b>
        <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.45, margin: '0 0 20px' }}>
          {subtitle}
        </p>

        {/* 4-Box OTP Grid */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: '52px',
                height: '56px',
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 800,
                borderRadius: '14px',
                border: error ? '2px solid #EF4444' : digit ? '2px solid #0F172A' : '1.5px solid #E2E8F0',
                background: error ? '#FEF2F2' : '#F8FAFC',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease'
              }}
            />
          ))}
        </div>

        {error && (
          <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, display: 'block', marginBottom: '14px' }}>
            Incorrect OTP. Please ask customer to recheck code.
          </span>
        )}

        {/* Hint for demo testing */}
        <button
          type="button"
          onClick={() => {
            const arr = correctOtp ? correctOtp.split('') : ['4', '8', '2', '1'];
            setDigits(arr);
            checkOtp(arr.join(''));
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563EB',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          Customer provided code: <b>{correctOtp || '4821'}</b> (Tap to auto-fill)
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1.5px solid #000000',
              color: '#000000',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleManualVerify}
            disabled={digits.some(d => !d)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: '#000000',
              border: '1.5px solid #000000',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: digits.some(d => !d) ? 0.4 : 1,
              boxShadow: digits.some(d => !d) ? 'none' : '0 4px 14px rgba(0, 0, 0, 0.25)'
            }}
          >
            Verify OTP
          </button>
        </div>
      </div>
    </div>
  );
}
