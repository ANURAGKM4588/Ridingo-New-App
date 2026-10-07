import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import { sendOtp, verifyOtp, formatIndianPhone } from '../services/authOtpService';
import { performNativeGoogleSignIn } from '../services/nativeGoogleAuth';

const GOOGLE_WEB_CLIENT_ID = '496710932146-0dc47l9jkgb584na7uu8ajh6bjtg98vu.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '496710932146-dff905ju49pr9j04ph4ii6u5c9moktge.apps.googleusercontent.com';

const isIOSDevice = typeof window !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  window.Capacitor?.getPlatform?.() === 'ios'
);
const activeGoogleClientId = isIOSDevice ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;

export default function DriverOnboardingModal() {
  const {
    driverOnboardingOpen,
    setDriverOnboardingOpen,
    driverPartner,
    loginDriverDemo,
    loginDriverWithDetails,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('signin');
  const [step, setStep] = useState('form');

  // Delivery channel: 'phone' | 'email'
  const [otpMethod, setOtpMethod] = useState('phone');

  // Loading & timer states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);

  // Sign In fields
  const [phone, setPhone] = useState('98765 43210');
  const [email, setEmail] = useState('driver@example.com');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [expYears, setExpYears] = useState('');
  const [transmissions, setTransmissions] = useState({ manual: false, automatic: false, imt: false, luxury: false });

  // Refs for 6-box OTP inputs
  const otpInputRefs = useRef([]);

  // Resend countdown timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown(c => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCountdown]);

  if (!driverOnboardingOpen) return null;

  const toggleTransmission = (key) => setTransmissions(prev => ({ ...prev, [key]: !prev[key] }));

  const getTargetIdentifier = (method, tab) => {
    if (tab === 'register') {
      return method === 'phone' ? regMobile : regEmail;
    }
    return method === 'phone' ? phone : email;
  };

  const handleSendOtp = async (methodToUse = otpMethod) => {
    const rawId = getTargetIdentifier(methodToUse, activeTab);
    if (!rawId || (methodToUse === 'phone' && rawId.replace(/\D/g, '').length < 10)) {
      addToast(methodToUse === 'phone' ? 'Please enter a valid 10-digit mobile number' : 'Please enter a valid email address', 'warn');
      return;
    }
    if (methodToUse === 'email' && !rawId.includes('@')) {
      addToast('Please enter a valid email address', 'warn');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await sendOtp({
        method: methodToUse,
        identifier: rawId
      });
      setSendingOtp(false);
      setOtpMethod(methodToUse);
      setStep('otp');
      setResendCountdown(30);
      setOtp(['', '', '', '', '', '']);

      if (res.isDevFallback && res.devCode) {
        setDevOtpCode(res.devCode);
        addToast(`Test Code: ${res.devCode} (Tap auto-fill to enter)`, 'info');
      } else {
        setDevOtpCode(null);
        addToast(res.message || `Verification code sent to ${rawId}`, 'check');
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setSendingOtp(false);
      setOtpError(err.message || 'Failed to send OTP. Please try again.');
      addToast(err.message || 'Failed to send OTP. Please try again.', 'warn');
    }
  };

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    handleSendOtp(otpMethod);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim()) { addToast('Please enter your full name', 'warn'); return; }
    if (!regEmail || !regEmail.includes('@')) { addToast('Please enter a valid email address', 'warn'); return; }
    if (regMobile.replace(/\D/g, '').length < 10) { addToast('Please enter a valid 10-digit mobile number', 'warn'); return; }
    if (!dlNumber.trim()) { addToast('Please enter your Driving License number', 'warn'); return; }
    handleSendOtp(otpMethod);
  };

  const handleOtpChange = (index, value) => {
    const digitsOnly = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digitsOnly.slice(-1);
    setOtp(newOtp);

    if (digitsOnly && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const targetIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[targetIdx]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const token = otp.join('');
    if (token.length !== 6) {
      addToast('Please enter all 6 digits of the OTP code', 'warn');
      return;
    }

    const currentId = getTargetIdentifier(otpMethod, activeTab);
    setVerifyingOtp(true);

    try {
      const res = await verifyOtp({
        method: otpMethod,
        identifier: currentId,
        token
      });
      setVerifyingOtp(false);

      if (activeTab === 'register') {
        loginDriverWithDetails({
          name: `${firstName.trim()} ${lastName.trim()}`.trim() || 'Driver Partner',
          email: regEmail.trim(),
          phone: regMobile.trim(),
          dlNumber: dlNumber.trim(),
          experienceYears: parseInt(expYears) || 1,
          authMethod: otpMethod,
          supabaseUser: res.user,
          isAuthenticated: true
        });
      } else {
        loginDriverWithDetails({
          name: res.user?.user_metadata?.full_name || 'Ravi Kumar',
          phone: phone.trim(),
          email: email.trim() || (otpMethod === 'email' ? currentId : 'driver@example.com'),
          authMethod: otpMethod,
          supabaseUser: res.user,
          isAuthenticated: true
        });
      }
      addToast('Verified successfully! Welcome to Chauffeur Portal.', 'check');
    } catch (err) {
      setVerifyingOtp(false);
      addToast(err.message || 'Invalid verification code. Please check and retry.', 'warn');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const gUser = await performNativeGoogleSignIn();
      if (gUser && gUser.email) {
        loginDriverWithDetails({
          name: gUser.name || `${gUser.firstName || ''} ${gUser.lastName || ''}`.trim() || 'Driver Partner',
          email: gUser.email,
          avatar: gUser.avatar || null,
          googleId: gUser.id || null,
          idToken: gUser.idToken || null,
          authMethod: 'google',
          isAuthenticated: true
        });
        addToast(`Welcome to Chauffeur Portal, ${gUser.name || 'Partner'}!`, 'check');
      }
    } catch (err) {
      console.warn('Google Sign-In error:', err);
      const isCancelled = err?.message?.toLowerCase()?.includes('cancel') ||
                          err?.message?.toLowerCase()?.includes('abort') ||
                          err?.code === '12501' || err?.code === 12501;
      if (!isCancelled) {
        addToast(err?.message || 'Google Sign-In failed. Please try again.', 'warn');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const fieldStyle = { width: '100%', height: '46px', borderRadius: '13px', background: 'var(--card)', border: '1.5px solid var(--line)', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' };
  const labelStyle = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' };

  return (
    <div
      id="d-ob-screen"
      className="ob-screen"
      style={{
        position: 'absolute', inset: 0, zIndex: 100, background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', borderRadius: '48px',
        paddingTop: 'max(40px, calc(env(safe-area-inset-top, 0px) + 28px))',
        paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}
    >
      {driverPartner && (
        <button
          type="button"
          onClick={() => setDriverOnboardingOpen(false)}
          style={{
            position: 'absolute', top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))', right: '18px', zIndex: 10,
            background: 'var(--card)', border: '1px solid var(--line)', width: '36px', height: '36px',
            borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          aria-label="Close"
        >
          <Icon name="x" size={16} />
        </button>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', maxWidth: '380px', margin: '0 auto', width: '100%', padding: '6px 4px' }}>

        {/* Brand + Partner Badge */}
        <div style={{ textAlign: 'center', marginBottom: '18px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <BrandLogo height={44} width={176} center={true} style={{ margin: '0 auto 12px auto', display: 'flex', justifyContent: 'center' }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,199,10,0.14)', border: '1px solid rgba(255,199,10,0.3)', borderRadius: '999px', padding: '4px 12px', marginBottom: '12px', fontSize: '11.5px', fontWeight: 700, color: 'var(--ink)' }}>
            <span>🚗</span>
            <span>Driver Partner Portal</span>
          </div>

          <h1 style={{ fontSize: '23px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 5px 0', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {step === 'otp' ? 'Verify with OTP' : activeTab === 'signin' ? 'Welcome Back, Chauffeur' : 'Register as Partner'}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, textAlign: 'center', lineHeight: 1.45, maxWidth: '300px' }}>
            {step === 'otp' ? 'Enter the 6-digit code sent to your mobile & email' : activeTab === 'signin' ? 'Sign in with your registered mobile & email' : 'Join the Ridingo chauffeur partner network'}
          </p>
        </div>

        {/* Tabs */}
        {step !== 'otp' && (
          <div className="auth-tab-switch" role="tablist">
            <button type="button" role="tab" aria-selected={activeTab === 'signin'} onClick={() => { setActiveTab('signin'); setStep('form'); }} className={'auth-tab-btn ' + (activeTab === 'signin' ? 'active' : '')}>Sign In</button>
            <button type="button" role="tab" aria-selected={activeTab === 'register'} onClick={() => { setActiveTab('register'); setStep('form'); }} className={'auth-tab-btn ' + (activeTab === 'register' ? 'active' : '')}>Register</button>
          </div>
        )}

        {/* OTP Step */}
        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {/* Target Channel Destination Indicator */}
            <div
              style={{
                background: 'var(--field)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{otpMethod === 'phone' ? '📱' : '✉️'}</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {otpMethod === 'phone' ? 'SMS Code Sent To' : 'Email Code Sent To'}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)' }}>
                    {otpMethod === 'phone'
                      ? formatIndianPhone(getTargetIdentifier('phone', activeTab))
                      : getTargetIdentifier('email', activeTab)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep('form')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                Edit
              </button>
            </div>



            {/* 6-Digit OTP Box Grid */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '4px 0' }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={'d-otp-box-' + i}
                  ref={el => (otpInputRefs.current[i] = el)}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
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
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.15s ease'
                  }}
                />
              ))}
            </div>

            {/* Verify & Enter Dashboard Button */}
            <button
              type="submit"
              disabled={verifyingOtp}
              className="btn"
              style={{
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid #000000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: verifyingOtp ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                opacity: verifyingOtp ? 0.7 : 1
              }}
            >
              {verifyingOtp ? 'Verifying Code...' : 'Verify & Enter Dashboard'}
            </button>

            {/* Resend OTP Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              {resendCountdown > 0 ? (
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                  Resend code in <strong style={{ color: 'var(--ink)' }}>{resendCountdown}s</strong>
                </span>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSendOtp(otpMethod)}
                    disabled={sendingOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    {sendingOtp ? 'Sending...' : 'Resend OTP'}
                  </button>
                  <span style={{ color: 'var(--line)' }}>•</span>
                  <button
                    type="button"
                    onClick={() => handleSendOtp(otpMethod === 'phone' ? 'email' : 'phone')}
                    disabled={sendingOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Try {otpMethod === 'phone' ? 'Email' : 'Mobile'} instead
                  </button>
                </div>
              )}
            </div>

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
              &larr; Back to {activeTab === 'signin' ? 'Sign In' : 'Register'}
            </button>
          </form>

        ) : activeTab === 'signin' ? (
          /* Sign In Form */
          <form onSubmit={handleSignInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Delivery Channel Selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                background: 'var(--field)',
                padding: '4px',
                borderRadius: '14px',
                border: '1px solid var(--line)',
                marginBottom: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setOtpMethod('phone')}
                style={{
                  height: '36px',
                  borderRadius: '10px',
                  border: 'none',
                  background: otpMethod === 'phone' ? '#000000' : 'transparent',
                  color: otpMethod === 'phone' ? '#FFFFFF' : 'var(--muted)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: otpMethod === 'phone' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>📱</span> Mobile
              </button>
              <button
                type="button"
                onClick={() => setOtpMethod('email')}
                style={{
                  height: '36px',
                  borderRadius: '10px',
                  border: 'none',
                  background: otpMethod === 'email' ? '#000000' : 'transparent',
                  color: otpMethod === 'email' ? '#FFFFFF' : 'var(--muted)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: otpMethod === 'email' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>✉️</span> Email
              </button>
            </div>

            {otpMethod === 'phone' ? (
              <div>
                <label style={labelStyle}>Registered Mobile</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '48px', borderRadius: '14px', background: 'var(--card)', border: '1.5px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <span style={{ padding: '0 12px', fontSize: '14px', fontWeight: 700, color: 'var(--ink)', borderRight: '1px solid var(--line)', height: '100%', display: 'flex', alignItems: 'center', background: 'var(--field)', flexShrink: 0 }}>🇮🇳 +91</span>
                  <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" style={{ flex: 1, height: '100%', border: 'none', outline: 'none', background: 'transparent', padding: '0 12px', fontSize: '15.5px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.04em' }} />
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                  We'll send a 6-digit verification code to your phone.
                </div>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Registered Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="driver@example.com" style={{ ...fieldStyle, height: '48px', borderRadius: '14px' }} />
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                  We'll send a 6-digit verification code to your email inbox (Free).
                </div>
              </div>
            )}

            {otpError && (
              <div
                style={{
                  background: 'rgba(234, 67, 53, 0.1)',
                  border: '1px solid rgba(234, 67, 53, 0.35)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  color: '#d93025',
                  lineHeight: 1.45,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠️</span>
                <span>{otpError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={sendingOtp}
              className="btn"
              style={{
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid #000000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: sendingOtp ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                opacity: sendingOtp ? 0.7 : 1
              }}
            >
              {sendingOtp ? 'Sending OTP Code...' : `Send OTP via ${otpMethod === 'phone' ? 'SMS' : 'Email'}`}
            </button>

            <button type="button" className="btn" onClick={loginDriverDemo} style={{ height: '46px', borderRadius: '14px', background: '#FFFFFF', color: '#000000', border: '1.5px solid #000000', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--yellow)' }}>⚡</span>
              <span>Instant Demo Access (Ravi)</span>
            </button>
          </form>

        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input type="text" placeholder="Ravi" value={firstName} onChange={e => setFirstName(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input type="text" placeholder="Kumar" value={lastName} onChange={e => setLastName(e.target.value)} style={fieldStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="driver@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mobile</label>
              <div style={{ display: 'flex', alignItems: 'center', height: '46px', borderRadius: '13px', background: 'var(--card)', border: '1.5px solid var(--line)', overflow: 'hidden' }}>
                <span style={{ padding: '0 12px', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)', borderRight: '1px solid var(--line)', height: '100%', display: 'flex', alignItems: 'center', background: 'var(--field)', flexShrink: 0 }}>🇮🇳 +91</span>
                <input type="tel" inputMode="numeric" maxLength={10} placeholder="98765 43210" value={regMobile} onChange={e => setRegMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ flex: 1, height: '100%', border: 'none', outline: 'none', background: 'transparent', padding: '0 12px', fontSize: '14.5px', fontWeight: 600, color: 'var(--ink)' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Driving License No.</label>
              <input type="text" placeholder="KL-07-20160049281" value={dlNumber} onChange={e => setDlNumber(e.target.value.toUpperCase())} style={{ ...fieldStyle, letterSpacing: '0.04em' }} />
            </div>
            <div>
              <label style={labelStyle}>Driving Experience (Years)</label>
              <input type="number" inputMode="numeric" placeholder="e.g. 5" min="1" max="50" value={expYears} onChange={e => setExpYears(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: '8px' }}>Transmission Expertise</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                {[['manual','Manual / H-Shift','🔧'],['automatic','Automatic / CVT','⚙️'],['imt','IMT & Hybrid','🔋'],['luxury','Luxury / EV','✨']].map(([key, label, emoji]) => (
                  <button key={key} type="button" onClick={() => toggleTransmission(key)} style={{ height: '40px', borderRadius: '12px', background: transmissions[key] ? 'rgba(255,199,10,0.15)' : 'var(--card)', border: transmissions[key] ? '1.5px solid var(--yellow)' : '1.5px solid var(--line)', color: transmissions[key] ? 'var(--ink)' : 'var(--muted)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s ease' }}>
                    <span>{emoji}</span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* OTP Verification Method Selector for Registration */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                Receive OTP on:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setOtpMethod('phone')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: otpMethod === 'phone' ? '1.5px solid #000' : '1px solid var(--line)',
                    background: otpMethod === 'phone' ? '#000' : 'var(--card)',
                    color: otpMethod === 'phone' ? '#FFF' : 'var(--muted)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📱 Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setOtpMethod('email')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: otpMethod === 'email' ? '1.5px solid #000' : '1px solid var(--line)',
                    background: otpMethod === 'email' ? '#000' : 'var(--card)',
                    color: otpMethod === 'email' ? '#FFF' : 'var(--muted)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✉️ Email
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingOtp}
              className="btn"
              style={{
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid #000000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: sendingOtp ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                opacity: sendingOtp ? 0.7 : 1
              }}
            >
              {sendingOtp ? 'Sending OTP Code...' : 'Create Partner Account & Verify OTP'}
            </button>
          </form>
        )}

        {/* Social login */}
        {step !== 'otp' && (
          <div style={{ width: '100%', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: 'var(--card)',
                border: '1.5px solid var(--line)',
                color: 'var(--ink)',
                fontSize: '14.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '18px', lineHeight: 1.45, maxWidth: '300px' }}>
          By continuing, you agree to Ridingo's{' '}
          <span style={{ textDecoration: 'underline', color: 'var(--ink)', cursor: 'pointer' }}>Partner Terms</span> &amp;{' '}
          <span style={{ textDecoration: 'underline', color: 'var(--ink)', cursor: 'pointer' }}>Privacy Policy</span>
        </p>
      </div>

  </div>
);
}
