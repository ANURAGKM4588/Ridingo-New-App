import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';
import Icon from './Icon';

export default function OnboardingModal() {
  const { onboardingOpen, setOnboardingOpen, user, loginDemo, addToast } = useApp();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('98401 23456');
  const [otp, setOtp] = useState(['4', '8', '2', '1', '9', '9']);

  if (!onboardingOpen) return null;

  const handleSendOtp = (e) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      addToast('Please enter a valid 10-digit mobile number', 'warn');
      return;
    }
    setStep('otp');
    addToast('Verification code sent: 4821', 'check');
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    loginDemo();
  };

  return (
    <div
      id="ob-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        // Notch, Dynamic Island and Status Bar protection: safe-area inset top
        paddingTop: 'max(42px, calc(env(safe-area-inset-top, 0px) + 36px))',
        paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Subtle Close button if user already logged in */}
      {user && (
        <button
          type="button"
          onClick={() => setOnboardingOpen(false)}
          className="iconbtn"
          style={{
            position: 'absolute',
            top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))',
            right: '18px',
            zIndex: 10,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
          aria-label="Close"
        >
          <Icon name="x" size={16} />
        </button>
      )}

      {/* Centered Main Content Wrapper */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '380px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        {/* Centered Top Brand Logo & Centered Headings */}
        <div style={{ textAlign: 'center', marginBottom: '30px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <BrandLogo
            height={46}
            width={184}
            center={true}
            style={{ margin: '0 auto 18px auto', display: 'flex', justifyContent: 'center' }}
          />

          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--ink)',
              margin: '0 0 8px 0',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              lineHeight: 1.25
            }}
          >
            {step === 'phone' ? 'Enter your mobile number' : 'Verify with OTP'}
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--muted)',
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.45,
              maxWidth: '310px'
            }}
          >
            {step === 'phone'
              ? 'On-demand professional chauffeurs for your personal car'
              : `Enter the 6-digit code sent to +91 ${phone}`}
          </p>
        </div>

        {/* Form Content: Clean, centered and perfectly aligned */}
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div>
              <label
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  textAlign: 'center',
                  marginBottom: '8px'
                }}
              >
                Mobile Number
              </label>

              {/* Phone Field Box with Flag + Country Code */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'var(--card)',
                  border: '1.5px solid var(--line)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}
              >
                <span
                  style={{
                    padding: '0 14px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    borderRight: '1px solid var(--line)',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--field)',
                    flexShrink: 0
                  }}
                >
                  🇮🇳 +91
                </span>

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  style={{
                    flex: 1,
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: '0 14px',
                    fontSize: '16.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    letterSpacing: '0.04em'
                  }}
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              className="btn"
              style={{
                height: '50px',
                borderRadius: '16px',
                background: 'var(--solid)',
                color: 'var(--on-solid)',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px'
              }}
            >
              Get Verification Code
            </button>

            {/* Clean Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                or
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>

            {/* Instant Demo Account Access Button */}
            <button
              type="button"
              className="btn"
              onClick={loginDemo}
              style={{
                height: '50px',
                borderRadius: '16px',
                background: 'var(--yellow)',
                color: '#111827',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 199, 10, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>⚡ Continue with Demo Account</span>
            </button>

            {/* Legal Disclaimer */}
            <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '14px', lineHeight: 1.45 }}>
              By continuing, you agree to Ridingo's{' '}
              <span style={{ textDecoration: 'underline', color: 'var(--ink)', cursor: 'pointer' }}>Terms of Service</span> &{' '}
              <span style={{ textDecoration: 'underline', color: 'var(--ink)', cursor: 'pointer' }}>Privacy Policy</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
            {/* Auto-fill Hint Badge */}
            <div
              onClick={() => setOtp(['4', '8', '2', '1', '9', '9'])}
              style={{
                background: 'rgba(255, 199, 10, 0.15)',
                border: '1px solid rgba(255, 199, 10, 0.4)',
                color: 'var(--on-yellow)',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                textAlign: 'center',
                cursor: 'pointer',
                margin: '0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Tap to auto-fill OTP code"
            >
              <span>Demo Code: <b style={{ fontWeight: 800 }}>4821</b> (Tap to auto-fill)</span>
            </div>

            {/* 6-Digit OTP Boxes */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '4px 0' }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`otp-box-${i}`}
                  type="tel"
                  maxLength={1}
                  value={d}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newOtp = [...otp];
                    newOtp[i] = val;
                    setOtp(newOtp);
                    if (val && i < 5) {
                      document.getElementById(`otp-box-${i + 1}`)?.focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      document.getElementById(`otp-box-${i - 1}`)?.focus();
                    }
                  }}
                  style={{
                    width: '46px',
                    height: '56px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    borderRadius: '14px',
                    background: 'var(--card)',
                    border: d ? '2px solid var(--yellow)' : '1.5px solid var(--line)',
                    color: 'var(--ink)',
                    outline: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                height: '50px',
                borderRadius: '16px',
                background: 'var(--yellow)',
                color: '#111827',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 199, 10, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px'
              }}
            >
              Verify & Proceed
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                margin: '0 auto',
                padding: '6px 12px'
              }}
            >
              ← Change mobile number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
