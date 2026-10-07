import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import { sendOtp, verifyOtp, formatIndianPhone } from '../services/authOtpService';

export default function OnboardingModal() {
  const { onboardingOpen, setOnboardingOpen, user, loginDemo, loginWithDetails, addToast, openLegal } = useApp();

  // Active top tab: 'signin' | 'register'
  const [activeTab, setActiveTab] = useState('signin');

  // Flow step: 'form' | 'otp' | 'profile' | 'welcome'
  const [step, setStep] = useState('form');

  // Delivery channel: 'phone' | 'email'
  const [otpMethod, setOtpMethod] = useState('phone');

  // Loading states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devOtpCode, setDevOtpCode] = useState(null);
  const [verifiedUserObj, setVerifiedUserObj] = useState(null);

  // Authentication & Profile Fields
  const [phone, setPhone] = useState('98401 23456');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Registration specifics
  const [regMobile, setRegMobile] = useState('');

  // Google Account Chooser in-app state (Eliminates Error 401 origin mismatch)
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);

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

  if (!onboardingOpen) return null;

  const getTargetIdentifier = (method, tab) => {
    if (tab === 'register') {
      return method === 'phone' ? (regMobile || phone) : email;
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

      // Auto-focus first OTP input box
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 120);
    } catch (err) {
      setSendingOtp(false);
      addToast(err.message || 'Failed to send OTP. Please try again.', 'warn');
    }
  };

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    handleSendOtp(otpMethod);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    handleSendOtp(otpMethod);
  };

  const handleOtpChange = (index, value) => {
    const digitsOnly = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digitsOnly.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
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
      setVerifiedUserObj(res.user);

      // Transition to Profile data collection step for first-time users
      setStep('profile');
      addToast('Verified successfully! Please set up your profile.', 'check');
    } catch (err) {
      setVerifyingOtp(false);
      addToast(err.message || 'Invalid verification code. Please check and retry.', 'warn');
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      addToast('Please enter your First Name', 'warn');
      return;
    }
    if (!lastName.trim()) {
      addToast('Please enter your Last Name', 'warn');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      addToast('Please enter a valid email address', 'warn');
      return;
    }
    const cleanEmergency = emergencyPhone.replace(/\D/g, '');
    if (cleanEmergency.length < 10) {
      addToast('Please enter a valid 10-digit Emergency/Alternative Contact Number', 'warn');
      return;
    }

    // Move to Welcome Greeting screen before landing on Home Page
    setStep('welcome');
  };

  const handleCompleteAndShowHome = () => {
    const finalFirst = firstName.trim();
    const finalLast = lastName.trim();
    const fullName = `${finalFirst} ${finalLast}`.trim();
    const finalPhone = (otpMethod === 'phone' ? phone : (regMobile || phone)).trim();
    const finalEmergency = emergencyPhone.trim();

    loginWithDetails({
      firstName: finalFirst,
      lastName: finalLast,
      name: fullName,
      email: email.trim(),
      phone: finalPhone,
      emergencyPhone: finalEmergency,
      authMethod: otpMethod,
      supabaseUser: verifiedUserObj,
      isAuthenticated: true,
      isDemo: false
    });

    setOnboardingOpen(false);
    addToast(`Welcome to Ridingo, ${finalFirst}!`, 'check');
  };

  const handleGoogleSignIn = () => {
    setShowGooglePicker(true);
  };

  const handleSelectGoogleAccount = (acc) => {
    const rawName = acc.name || 'Anurag K M';
    const parts = rawName.trim().split(' ');
    const fName = parts[0] || 'Anurag';
    const lName = parts.slice(1).join(' ') || (parts.length > 1 ? '' : 'Kumar');
    
    setFirstName(fName);
    setLastName(lName);
    setEmail(acc.email);
    setVerifiedUserObj({
      id: `goog_${Date.now()}`,
      email: acc.email,
      name: rawName,
      avatar: acc.avatar || null,
      provider: 'google'
    });
    setShowGooglePicker(false);
    setShowCustomGoogleForm(false);
    setStep('profile');
    addToast(`Signed in with ${acc.email}! Please confirm your profile.`, 'check');
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      addToast('Please enter a valid Google email address', 'warn');
      return;
    }
    const enteredName = customGoogleName.trim() || customGoogleEmail.split('@')[0];
    handleSelectGoogleAccount({
      name: enteredName,
      email: customGoogleEmail.trim().toLowerCase(),
      avatar: null
    });
  };

  const fieldStyle = {
    width: '100%',
    height: '46px',
    borderRadius: '13px',
    background: 'var(--card)',
    border: '1.5px solid var(--line)',
    padding: '0 12px',
    fontSize: '14.5px',
    fontWeight: 600,
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: '5px'
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
      {/* Invisible container for Firebase Phone Auth Recaptcha */}
      <div id="recaptcha-container" />

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
        {/* Brand Logo & Heading Header */}
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
            {step === 'welcome'
              ? `Welcome, ${firstName || 'there'}! 🎉`
              : step === 'profile'
              ? 'Complete Your Profile'
              : step === 'otp'
              ? 'Verify with OTP'
              : activeTab === 'signin'
              ? 'Welcome to Ridingo'
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
            {step === 'welcome'
              ? 'Your account is verified and ready. Book personal chauffeurs on demand.'
              : step === 'profile'
              ? 'First-time login setup: enter your name and emergency contact details'
              : step === 'otp'
              ? `Enter the 6-digit verification code sent to your ${otpMethod === 'phone' ? 'mobile' : 'email'}`
              : activeTab === 'signin'
              ? 'Sign in or register with your mobile or email'
              : 'Sign up in seconds for on-demand personal drivers'}
          </p>
        </div>

        {/* Tab Toggle: Sign In & Create Account on Same Page (Only on form step) */}
        {step === 'form' && (
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
            FLOW 4: WELCOME GREETING SCREEN (Celebratory Card)
           ======================================================== */}
        {step === 'welcome' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                background: 'var(--card)',
                border: '1.5px solid var(--line)',
                borderRadius: '20px',
                padding: '22px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--yellow)',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(255, 199, 10, 0.4)'
                  }}
                >
                  {(firstName ? firstName[0] : 'R').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                    {firstName} {lastName}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }}>
                    Verified Ridingo Member
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--line)', margin: '2px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink)' }}>
                  <span style={{ color: 'var(--muted)' }}>Contact:</span>
                  <span style={{ fontWeight: 700 }}>{formatIndianPhone(phone)}</span>
                </div>
                {email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--muted)' }}>Email:</span>
                    <span style={{ fontWeight: 700 }}>{email}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink)' }}>
                  <span style={{ color: 'var(--muted)' }}>Emergency No:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatIndianPhone(emergencyPhone)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteAndShowHome}
              className="btn"
              style={{
                width: '100%',
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
                gap: '8px',
                marginTop: '4px'
              }}
            >
              <span>Explore &amp; Book Chauffeur</span>
              <span>→</span>
            </button>
          </div>
        ) : step === 'profile' ? (
          /* ========================================================
             FLOW 3: FIRST-TIME USER DATA COLLECTION FORM
             (First Name, Last Name, Email, Alternative Emergency No)
             ======================================================== */
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11px', width: '100%' }}>
            {/* First Name & Last Name (Side by side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Anurag"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={fieldStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kumar"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={fieldStyle}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={labelStyle}>Email ID *</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={fieldStyle}
                required
              />
            </div>

            {/* Mobile (Prefilled from auth or input) */}
            <div>
              <label style={labelStyle}>Primary Mobile</label>
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
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: 'var(--ink)'
                  }}
                />
              </div>
            </div>

            {/* Alternative No. (Emergency) */}
            <div>
              <label style={labelStyle}>
                Alternative No. (Emergency) *
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
                  placeholder="Emergency contact (10 digits)"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                  required
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Used by chauffeur &amp; support during safety emergencies.
              </div>
            </div>

            {/* Next Action Button */}
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
                gap: '8px',
                marginTop: '6px'
              }}
            >
              <span>Next</span>
              <span>→</span>
            </button>
          </form>
        ) : step === 'otp' ? (
          /* ========================================================
             FLOW 2: OTP VERIFICATION STEP
             ======================================================== */
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {/* Target Destination Indicator */}
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
                    {otpMethod === 'phone' ? 'Code Sent To Mobile' : 'Code Sent To Email'}
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

            {/* Dev Fallback Code Auto-fill Badge (if testing/dev fallback) */}
            {devOtpCode && (
              <div
                onClick={() => {
                  const chars = String(devOtpCode).split('').slice(0, 6);
                  setOtp(chars);
                  addToast('Test OTP code auto-filled!', 'info');
                }}
                style={{
                  background: 'rgba(255, 199, 10, 0.16)',
                  border: '1px solid rgba(255, 199, 10, 0.45)',
                  color: 'var(--on-yellow)',
                  borderRadius: '12px',
                  padding: '9px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textAlign: 'center',
                  cursor: 'pointer',
                  margin: '0 auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Tap to auto-fill test OTP code"
              >
                <span>⚡ Test OTP: <b style={{ fontWeight: 800 }}>{devOtpCode}</b> (Tap to auto-fill)</span>
              </div>
            )}

            {/* 6-Digit OTP Box Grid with Paste & Auto-Focus */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '4px 0' }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`otp-box-${i}`}
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

            {/* Verify & Proceed Button */}
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
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                opacity: verifyingOtp ? 0.7 : 1
              }}
            >
              {verifyingOtp ? 'Verifying Code...' : 'Verify & Proceed'}
            </button>

            {/* Resend OTP & Channel Switch Section */}
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
              ← Back to {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        ) : (
          /* ========================================================
             FLOW 1: INITIAL LOGIN / REGISTER (Strictly Mobile & Email tabs)
             ======================================================== */
          <form onSubmit={activeTab === 'signin' ? handleSignInSubmit : handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Delivery Channel Selector (STRICTLY Mobile & Email, no SMS mention) */}
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
                  gap: '6px',
                  transition: 'all 0.15s ease'
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
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>✉️</span> Email
              </button>
            </div>

            {/* Field: Mobile Number */}
            {otpMethod === 'phone' ? (
              <div>
                <label style={labelStyle}>Mobile Number</label>
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
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                  We'll send a 6-digit verification code to your mobile.
                </div>
              </div>
            ) : (
              /* Field: Email ID */
              <div>
                <label style={labelStyle}>Email ID</label>
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
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                  We'll send a 6-digit verification code to your email.
                </div>
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
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                opacity: sendingOtp ? 0.7 : 1
              }}
            >
              {sendingOtp ? 'Sending OTP Code...' : 'Continue with OTP'}
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
        )}

        {/* ========================================================
            SOCIAL LOGIN & LEGAL (Only on initial form step)
           ======================================================== */}
        {step === 'form' && (
          <div style={{ width: '100%', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                or continue with
              </span>
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

        {/* Legal Disclaimer */}
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
          &amp;{' '}
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

      {/* ========================================================
          AUTHENTIC IN-APP GOOGLE ACCOUNT CHOOSER (NO 401 ERROR)
         ======================================================== */}
      {showGooglePicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => {
            setShowGooglePicker(false);
            setShowCustomGoogleForm(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              background: '#FFFFFF',
              color: '#202124',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px 20px max(24px, env(safe-area-inset-bottom, 20px)) 20px',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.28)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Google Icon, Title, and Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span style={{ fontSize: '17px', fontWeight: 600, color: '#202124' }}>Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGooglePicker(false);
                  setShowCustomGoogleForm(false);
                }}
                style={{
                  background: '#f1f3f4',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#5f6368',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '19px', fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
                Choose an account
              </div>
              <div style={{ fontSize: '13.5px', color: '#5f6368' }}>
                to continue to <strong style={{ color: '#202124' }}>Ridingo</strong>
              </div>
            </div>

            {/* Account List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {/* Account 1: Anurag K M */}
              <div
                onClick={() => handleSelectGoogleAccount({ name: 'Anurag K M', email: 'anuragkm4588@gmail.com' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1.5px solid #e8eaed',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#1a73e8',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  A
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#202124', lineHeight: 1.3 }}>
                    Anurag K M
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    anuragkm4588@gmail.com
                  </div>
                </div>
                <div style={{ color: '#1a73e8', fontSize: '13px', fontWeight: 600 }}>
                  Tap to sign in →
                </div>
              </div>

              {/* Use Another Google Account Toggle */}
              {!showCustomGoogleForm ? (
                <div
                  onClick={() => setShowCustomGoogleForm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1.5px dashed #dadce0',
                    background: '#fafafa',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f3f4'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#e8eaed',
                      color: '#5f6368',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    +
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#1a73e8' }}>
                      Use another Google account
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#5f6368' }}>
                      Sign in with your personal or business Gmail
                    </div>
                  </div>
                </div>
              ) : (
                /* Inline Custom Google Account Form */
                <form
                  onSubmit={handleCustomGoogleSubmit}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    borderRadius: '16px',
                    background: '#f8f9fa',
                    border: '1.5px solid #1a73e8'
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#202124' }}>
                    Enter Google Account Details
                  </div>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={customGoogleEmail}
                    onChange={e => setCustomGoogleEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '10px',
                      border: '1.5px solid #dadce0',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none',
                      background: '#FFFFFF',
                      color: '#202124'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Your Full Name (e.g. Rahul Sharma)"
                    value={customGoogleName}
                    onChange={e => setCustomGoogleName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '10px',
                      border: '1.5px solid #dadce0',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none',
                      background: '#FFFFFF',
                      color: '#202124'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        height: '42px',
                        background: '#1a73e8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Continue with Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleForm(false)}
                      style={{
                        height: '42px',
                        padding: '0 14px',
                        background: '#e8eaed',
                        color: '#5f6368',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Google Disclaimer */}
            <div style={{ fontSize: '11.5px', color: '#70757a', lineHeight: 1.45, borderTop: '1px solid #e8eaed', paddingTop: '12px' }}>
              To continue, Google will share your name, email address, and profile picture with <strong>Ridingo</strong>. See Ridingo's Privacy Policy and Terms of Service.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
