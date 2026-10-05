import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function OnboardingModal() {
  const { onboardingOpen, setOnboardingOpen, loginDemo, addToast } = useApp();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('98401 23456');
  const [otp, setOtp] = useState(['4', '8', '2', '1', '', '']);

  if (!onboardingOpen) return null;

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
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
        padding: '24px 20px',
        overflowY: 'auto'
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--yellow)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--on-yellow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="2.3" />
              <path d="M3.2 11h6.5M14.3 11h6.5M12 14.3V21" />
            </svg>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Ridingo
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>
            On-demand professional chauffeurs for your car
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                MOBILE NUMBER
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '14px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', fontWeight: 600 }}>
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter 10-digit number"
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--ink)'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--solid)',
                color: 'var(--on-solid)',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Get Verification Code
            </button>

            {/* Fast Demo Login Button */}
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or for instant testing</span>
            </div>

            <button
              type="button"
              className="btn"
              onClick={loginDemo}
              style={{
                padding: '15px',
                borderRadius: '16px',
                background: 'var(--yellow)',
                color: 'var(--on-yellow)',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚡ Continue with Demo Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Enter the 6-digit code sent to +91 {phone}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={d}
                  onChange={e => {
                    const newOtp = [...otp];
                    newOtp[i] = e.target.value;
                    setOtp(newOtp);
                  }}
                  style={{
                    width: '44px',
                    height: '52px',
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)'
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--solid)',
                color: 'var(--on-solid)',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Verify & Proceed
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
