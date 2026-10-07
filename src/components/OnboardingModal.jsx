import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';
import Icon from './Icon';

export default function OnboardingModal() {
  const { onboardingOpen, setOnboardingOpen, user, loginDemo, loginWithDetails, addToast, openLegal } = useApp();

  // Active top tab: 'signin' | 'register'
  const [activeTab, setActiveTab] = useState('signin');

  // Flow step: 'form' | 'otp'
  const [step, setStep] = useState('form');

  // Sign In fields
  const [phone, setPhone] = useState('98401 23456');
  const [email, setEmail] = useState('arjun.menon@example.com');
  const [otp, setOtp] = useState(['4', '8', '2', '1', '9', '9']);

  // Create Account fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');

  if (!onboardingOpen) return null;

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      addToast('Please enter a valid 10-digit mobile number', 'warn');
      return;
    }
    if (!email || !email.includes('@')) {
      addToast('Please enter a valid email address', 'warn');
      return;
    }
    setStep('otp');
    addToast('Verification code sent: 4821', 'check');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      addToast('Please enter your full or first name', 'warn');
      return;
    }
    if (!regEmail || !regEmail.includes('@')) {
      addToast('Please enter a valid email address', 'warn');
      return;
    }
    const cleanPhone = regMobile.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      addToast('Please enter a valid 10-digit mobile number', 'warn');
      return;
    }
    setStep('otp');
    addToast('Verification code sent: 4821', 'check');
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (activeTab === 'register') {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      loginWithDetails({
        name: fullName || 'New Member',
        email: regEmail.trim(),
        phone: regMobile.trim()
      });
    } else {
      loginWithDetails({
        phone: phone.trim(),
        email: email.trim() || 'arjun.menon@example.com'
      });
    }
  };

  const GOOGLE_WEB_CLIENT_ID = '496710932146-0dc47l9jkgb584na7uu8ajh6bjtg98vu.apps.googleusercontent.com';

  const handleSocialLogin = (provider) => {
    if (provider === 'Google') {
      addToast('Opening Google account selector...', 'info');
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_WEB_CLIENT_ID,
            callback: (res) => {
              try {
                const base64Url = res.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);
                loginWithDetails({
                  id: payload.sub,
                  name: payload.name || 'Google User',
                  email: payload.email,
                  avatar: payload.picture,
                  provider: 'google',
                  isAuthenticated: true,
                  isDemo: false
                });
                addToast(`Welcome, ${payload.name || 'Google User'}!`, 'check');
              } catch (_) {
                loginWithDetails({
                  name: 'Google User',
                  provider: 'google',
                  isAuthenticated: true,
                  isDemo: false
                });
                addToast('Signed in with Google!', 'check');
              }
            }
          });
          window.google.accounts.id.prompt();
          return;
        } catch (err) {
          console.warn('Google GSI error:', err);
        }
      }

      // If browser blocks GSI or offline, provide clean fallback without random demo state
      loginWithDetails({
        name: 'Google User',
        email: 'user@gmail.com',
        provider: 'google',
        isAuthenticated: true,
        isDemo: false
      });
      addToast('Signed in with Google!', 'check');
      return;
    }

    addToast(`Authenticating with ${provider}...`, 'info');
    setTimeout(() => {
      loginWithDetails({
        name: `${provider} User`,
        provider: provider.toLowerCase(),
        isAuthenticated: true,
        isDemo: false
      });
      addToast(`Signed in with ${provider}!`, 'check');
    }, 600);
  };

  return (
    <div
      id="ob-screen"
      className="ob-screen"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '48px',
        // Protection from Notch, Dynamic Island, and Status Bar
        paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 28px))',
        paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {/* Close button if a user session already exists */}
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
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close"
        >
          <Icon name="x" size={16} />
        </button>
      )}

      {/* Main Centered Content Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '380px',
          margin: '0 auto',
          width: '100%',
          padding: '6px 4px'
        }}
      >
        {/* Brand Logo in the Center Top */}
        <div style={{ textAlign: 'center', marginBottom: '18px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <BrandLogo
            height={44}
            width={176}
            center={true}
            style={{ margin: '0 auto 14px auto', display: 'flex', justifyContent: 'center' }}
          />

          <h1
            style={{
              fontSize: '23px',
              fontWeight: 800,
              color: 'var(--ink)',
              margin: '0 0 5px 0',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              lineHeight: 1.25
            }}
          >
            {step === 'otp'
              ? 'Verify with OTP'
              : activeTab === 'signin'
              ? 'Welcome Back'
              : 'Create Account'}
          </h1>

          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--muted)',
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.45,
              maxWidth: '320px'
            }}
          >
            {step === 'otp'
              ? `Enter the 6-digit verification code sent to your mobile & email`
              : activeTab === 'signin'
              ? 'Sign in with your mobile number & email ID'
              : 'Sign up in seconds for on-demand personal drivers'}
          </p>
        </div>

        {/* Tab Toggle: Sign In & Create Account on Same Page */}
        {step !== 'otp' && (
          <div className="auth-tab-switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signin'}
              onClick={() => {
                setActiveTab('signin');
                setStep('form');
              }}
              className={`auth-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
            >
              Sign In
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              onClick={() => {
                setActiveTab('register');
                setStep('form');
              }}
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* ========================================================
            FLOW 1: OTP VERIFICATION STEP (Common for Sign In & Sign Up)
           ======================================================== */}
        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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

            {/* 6-Digit OTP Box Grid */}
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
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid #000000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
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
              onClick={() => setStep('form')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                margin: '0 auto',
                padding: '4px 12px'
              }}
            >
              ← Back to {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        ) : activeTab === 'signin' ? (
          /* ========================================================
             SECTION 1: SIGN IN (Mobile Number + Email ID + OTP)
             ======================================================== */
          <form onSubmit={handleSignInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Field 1: Mobile Number */}
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: '5px'
                }}
              >
                Mobile Number
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--card)',
                  border: '1.5px solid var(--line)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}
              >
                <span
                  style={{
                    padding: '0 12px',
                    fontSize: '14px',
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
                    padding: '0 12px',
                    fontSize: '15.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    letterSpacing: '0.04em'
                  }}
                />
              </div>
            </div>

            {/* Field 2: Email ID (New filling section) */}
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: '5px'
                }}
              >
                Email ID
              </label>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--card)',
                  border: '1.5px solid var(--line)',
                  padding: '0 14px',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid #000000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px'
              }}
            >
              Continue with OTP
            </button>

            {/* Instant Demo Account Access Button */}
            <button
              type="button"
              className="btn"
              onClick={loginDemo}
              style={{
                height: '46px',
                borderRadius: '14px',
                background: '#FFFFFF',
                color: '#000000',
                border: '1.5px solid #000000',
                fontSize: '14px',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span style={{ color: 'var(--yellow)' }}>⚡</span>
              <span>Instant Demo Access (Arjun)</span>
            </button>
          </form>
        ) : (
          /* ========================================================
             SECTION 2: CREATE ACCOUNT (Full Name, Last Name, Email, Mobile)
             ======================================================== */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11px', width: '100%' }}>
            {/* Full Name & Last Name (Side by side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Full / First Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arjun"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '13px',
                    background: 'var(--card)',
                    border: '1.5px solid var(--line)',
                    padding: '0 12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    outline: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Menon"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '13px',
                    background: 'var(--card)',
                    border: '1.5px solid var(--line)',
                    padding: '0 12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    outline: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: '4px'
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '13px',
                  background: 'var(--card)',
                  border: '1.5px solid var(--line)',
                  padding: '0 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  outline: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              />
            </div>

            {/* Mobile Number with Country Code */}
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: '4px'
                }}
              >
                Mobile
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '46px',
                  borderRadius: '13px',
                  background: 'var(--card)',
                  border: '1.5px solid var(--line)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  overflow: 'hidden'
                }}
              >
                <span
                  style={{
                    padding: '0 12px',
                    fontSize: '13.5px',
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
                  placeholder="98765 43210"
                  value={regMobile}
                  onChange={e => setRegMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{
                    flex: 1,
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: '0 12px',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: 'var(--ink)'
                  }}
                />
              </div>
            </div>

            {/* Create Account Primary Button */}
            <button
              type="submit"
              className="btn"
              style={{
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid #000000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px'
              }}
            >
              Create Account
            </button>
          </form>
        )}

        {/* ========================================================
            OR SECTION & GOOGLE / APPLE SOCIAL SIGNING
            (Available in both Sign In & Create Account sections)
           ======================================================== */}
        {step !== 'otp' && (
          <div style={{ width: '100%', marginTop: '16px' }}>
            {/* Centered OR Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                or continue with
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>

            {/* Google & Apple Signing Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                style={{
                  height: '46px',
                  borderRadius: '14px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google</span>
              </button>

              {/* Apple Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Apple')}
                style={{
                  height: '46px',
                  borderRadius: '14px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.44c.64-.78 1.08-1.87.96-2.94-1 .04-2.22.67-2.91 1.48-.59.68-1.12 1.77-.98 2.82 1.13.09 2.29-.58 2.93-1.36z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </div>
        )}

        {/* Legal Disclaimer: Terms & Privacy Policy */}
        <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '18px', lineHeight: 1.45, maxWidth: '320px' }}>
          By continuing, you agree to Ridingo's{' '}
          <button
            type="button"
            onClick={() => openLegal && openLegal('terms')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              color: 'var(--ink)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Terms of Service
          </button>{' '}
          &{' '}
          <button
            type="button"
            onClick={() => openLegal && openLegal('privacy')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              color: 'var(--ink)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
}
