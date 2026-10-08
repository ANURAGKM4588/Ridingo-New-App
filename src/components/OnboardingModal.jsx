import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import { sendOtp, verifyOtp, formatIndianPhone } from '../services/authOtpService';
import { performNativeGoogleSignIn } from '../services/nativeGoogleAuth';
import { supabase } from '../lib/supabase';

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
  const [otpError, setOtpError] = useState(null);
  const [verifiedUserObj, setVerifiedUserObj] = useState(null);

  // OTP Verification state & visual feedback
  const [otpStatus, setOtpStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [isShaking, setIsShaking] = useState(false);

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

  // Refs for OTP inputs
  const otpInputRefs = useRef([]);

  // Keyboard open/close frame responsiveness
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const isKb = window.visualViewport.height < (window.innerHeight - 130);
        setIsKeyboardVisible(isKb);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, []);

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
    setOtpError(null);
    setOtpStatus('idle');
    setIsShaking(false);
    const rawId = getTargetIdentifier(methodToUse, activeTab);
    if (!rawId || (methodToUse === 'phone' && rawId.replace(/\D/g, '').length < 10)) {
      const msg = methodToUse === 'phone' ? 'Please enter a valid 10-digit mobile number' : 'Please enter a valid email address';
      setOtpError(msg);
      addToast(msg, 'warn');
      return;
    }
    if (methodToUse === 'email' && !rawId.includes('@')) {
      const msg = 'Please enter a valid email address';
      setOtpError(msg);
      addToast(msg, 'warn');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await sendOtp({
        method: methodToUse,
        identifier: rawId
      });
      setSendingOtp(false);
      setOtpError(null);
      setOtpStatus('idle');
      setIsShaking(false);
      setOtpMethod(methodToUse);
      setStep('otp');
      setResendCountdown(30);
      setOtp(['', '', '', '', '', '']);

      addToast(res.message || `Verification code sent to ${rawId}`, 'check');

      // Auto-focus first OTP input box
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 120);
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
    handleSendOtp(otpMethod);
  };

  const handleOtpChange = (index, value) => {
    if (otpStatus !== 'idle') {
      setOtpStatus('idle');
      setOtpError(null);
    }

    const cleanChars = value.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (cleanChars.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < cleanChars.length && (index + i) < 6; i++) {
        newOtp[index + i] = cleanChars[i];
      }
      setOtp(newOtp);
      const nextIdx = Math.min(index + cleanChars.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const char = cleanChars.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto-advance to next input
    if (char && index < 5) {
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
    const raw = e.clipboardData.getData('text');
    if (!raw) return;
    const cleaned = raw.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    if (!cleaned) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < cleaned.length; i++) {
      newOtp[i] = cleaned[i];
    }
    setOtp(newOtp);
    setOtpStatus('idle');
    setOtpError(null);

    const targetIdx = Math.min(cleaned.length, 5);
    setTimeout(() => {
      otpInputRefs.current[targetIdx]?.focus();
    }, 20);
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const token = otp.join('');
    if (token.length !== 6) {
      setOtpStatus('error');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
      const channelLabel = otpMethod === 'phone' ? 'mobile' : 'email';
      const msg = `Please enter the complete 6-digit verification code sent to your ${channelLabel}`;
      setOtpError(msg);
      addToast(msg, 'warn');
      return;
    }

    const currentId = getTargetIdentifier(otpMethod, activeTab);
    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await verifyOtp({
        method: otpMethod,
        identifier: currentId,
        token
      });
      setVerifyingOtp(false);
      setOtpStatus('success');
      setVerifiedUserObj(res.user);

      addToast('Verification successful!', 'check');

      // Smooth delay to showcase the green glow feedback before transitioning
      setTimeout(() => {
        setStep('profile');
        setOtpStatus('idle');
      }, 650);
    } catch (err) {
      setVerifyingOtp(false);
      setOtpStatus('error');
      setIsShaking(true);
      // Clear entered numbers on wrong OTP
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        setIsShaking(false);
        otpInputRefs.current[0]?.focus();
      }, 450);

      const channelLabel = otpMethod === 'phone' ? 'mobile' : 'email';
      const errorMsg = `Please enter the correct verification code sent to your ${channelLabel}`;
      setOtpError(errorMsg);
      addToast(errorMsg, 'warn');
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

  const handleGoogleSignIn = async () => {
    // 1. In native mobile iOS / Android app:
    // Triggers Apple ASWebAuthenticationSession:
    // "Ridingo" Wants to Use "accounts.google.com" to Sign In -> accounts.google.com
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      try {
        addToast('Opening Google Sign-In...', 'info');
        const gUser = await performNativeGoogleSignIn();
        if (gUser && gUser.email) {
          setFirstName(gUser.firstName);
          setLastName(gUser.lastName);
          setEmail(gUser.email);
          setVerifiedUserObj({
            id: gUser.id,
            email: gUser.email,
            avatar: gUser.avatar,
            provider: 'google'
          });
          setStep('profile');
          addToast(`Signed in as ${gUser.name}! Please confirm your profile.`, 'check');
          return;
        }
      } catch (err) {
        console.warn('Native Google Auth result:', err);
        if (err.message && !err.message.includes('cancel')) {
          addToast(err.message || 'Google sign-in was cancelled.', 'warn');
        }
        return;
      }
    }

    // 2. Browser preview fallback
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
        paddingTop: isKeyboardVisible && step === 'otp'
          ? 'max(14px, env(safe-area-inset-top, 0px))'
          : 'max(40px, calc(env(safe-area-inset-top, 0px) + 28px))',
        paddingBottom: isKeyboardVisible && step === 'otp'
          ? '10px'
          : 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        transition: 'padding 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
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

      {/* Main Content Container (Vertically centered when keyboard closed, snug frame when keyboard open) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isKeyboardVisible && step === 'otp' ? 'flex-start' : 'center',
          alignItems: 'center',
          maxWidth: '380px',
          margin: '0 auto',
          width: '100%',
          padding: isKeyboardVisible && step === 'otp' ? '0 4px' : '6px 4px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Brand Logo & Heading Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: isKeyboardVisible && step === 'otp' ? '10px' : '18px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'margin-bottom 0.2s ease'
        }}>
          <BrandLogo
            height={isKeyboardVisible && step === 'otp' ? 34 : 44}
            width={isKeyboardVisible && step === 'otp' ? 136 : 176}
            center={true}
            style={{
              margin: isKeyboardVisible && step === 'otp' ? '0 auto 8px auto' : '0 auto 14px auto',
              display: 'flex',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          />

          <h1
            style={{
              fontSize: isKeyboardVisible && step === 'otp' ? '20px' : '23px',
              fontWeight: 800,
              color: 'var(--ink)',
              margin: isKeyboardVisible && step === 'otp' ? '0 0 3px 0' : '0 0 5px 0',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              transition: 'all 0.2s ease'
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
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: isKeyboardVisible ? '10px' : '16px', width: '100%', transition: 'gap 0.2s ease' }}>
            {/* Target Destination Indicator */}
            <div
              style={{
                background: 'var(--field)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                padding: isKeyboardVisible ? '8px 12px' : '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'padding 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: isKeyboardVisible ? '18px' : '20px' }}>{otpMethod === 'phone' ? '📱' : '✉️'}</span>
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

            {/* 6-Digit OTP Box Grid with Paste, Glow & Shake */}
            <div className={`otp-grid-wrap ${isShaking ? 'shake' : ''}`}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`otp-box-${i}`}
                  ref={el => (otpInputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  onFocus={() => setIsKeyboardVisible(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!document.activeElement?.classList?.contains('otp-digit-box')) {
                        setIsKeyboardVisible(false);
                      }
                    }, 150);
                  }}
                  className={`otp-digit-box ${d ? 'filled' : ''} ${otpStatus === 'success' ? 'success' : otpStatus === 'error' ? 'error' : ''}`}
                />
              ))}
            </div>

            {/* Error Message with Correct English */}
            {otpError && (
              <div className="otp-error-banner">
                <span>⚠️</span>
                <span>{otpError}</span>
              </div>
            )}

            {/* Verify & Proceed Button */}
            <button
              type="submit"
              disabled={verifyingOtp}
              className="btn"
              style={{
                height: isKeyboardVisible ? '44px' : '48px',
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
                marginTop: isKeyboardVisible ? '2px' : '4px',
                opacity: verifyingOtp ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {verifyingOtp ? 'Verifying Code...' : 'Verify & Proceed'}
            </button>

            {/* Resend OTP & Channel Switch Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: isKeyboardVisible ? '4px' : '6px', alignItems: 'center' }}>
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

            {/* Inline error feedback if sending fails */}
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
    </div>
  );
}
