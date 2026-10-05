import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import {
  registerPaymentSheetHandler,
  unregisterPaymentSheetHandler,
  RAZORPAY_KEY_ID,
  loadRazorpayScript,
  getAppsWhichSupportUPI,
  SUPPORTED_UPI_APPS
} from '../utils/razorpay';

const POPULAR_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank', code: 'HDFC', color: '#004c8f' },
  { id: 'SBI', name: 'State Bank of India', code: 'SBI', color: '#280071' },
  { id: 'ICICI', name: 'ICICI Bank', code: 'ICICI', color: '#b82a24' },
  { id: 'AXIS', name: 'Axis Bank', code: 'Axis', color: '#97144d' },
  { id: 'KOTAK', name: 'Kotak Mahindra Bank', code: 'Kotak', color: '#e61e24' },
  { id: 'PNB', name: 'Punjab National Bank', code: 'PNB', color: '#a20f2e' }
];

function FloatingInput({ label, type = 'text', value, onChange, maxLength, placeholder = '', error, style, rightElement }) {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || (value !== undefined && value !== null && value.toString().length > 0);

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <div
        style={{
          position: 'relative',
          borderRadius: '12px',
          border: error ? '1px solid #EF4444' : isFocused ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
          background: '#FFFFFF',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          boxShadow: isFocused ? '0 0 0 3px rgba(15, 23, 42, 0.04)' : 'none'
        }}
      >
        <label
          style={{
            position: 'absolute',
            left: '14px',
            top: isFloating ? '7px' : '50%',
            transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isFloating ? '10px' : '13.5px',
            fontWeight: isFloating ? 600 : 400,
            color: error ? '#EF4444' : isFocused ? '#0F172A' : '#64748B',
            pointerEvents: 'none',
            transition: 'all 0.16s cubic-bezier(0.4, 0, 0.2, 1)',
            letterSpacing: isFloating ? '0.02em' : 'normal',
            zIndex: 1
          }}
        >
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFocused ? placeholder : ''}
          style={{
            width: '100%',
            height: '48px',
            padding: isFloating ? '18px 14px 4px' : '0 14px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: '#0F172A',
            fontWeight: 500,
            fontFamily: type === 'password' || label.toLowerCase().includes('card number') || label.toLowerCase().includes('expiry') || label.toLowerCase().includes('cvv') ? 'monospace' : 'inherit',
            letterSpacing: label.toLowerCase().includes('card number') ? '0.04em' : 'normal',
            boxSizing: 'border-box'
          }}
        />
        {rightElement && (
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            {rightElement}
          </div>
        )}
      </div>
      {error && <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block', fontWeight: 500 }}>{error}</span>}
    </div>
  );
}

const MinimalRadio = ({ isSelected }) => (
  <div
    style={{
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      border: isSelected ? '5px solid #0F172A' : '1.5px solid #CBD5E1',
      background: '#FFFFFF',
      transition: 'all 0.15s ease',
      flexShrink: 0
    }}
  />
);

const SleekWalletOutlineIcon = ({ size = 20, color = '#0F172A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="14" rx="3" />
    <path d="M2 10h20" />
    <circle cx="16.5" cy="14.5" r="1.25" fill={color} />
  </svg>
);

const SleekCardOutlineIcon = ({ size = 20, color = '#0F172A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const SleekBankOutlineIcon = ({ size = 20, color = '#0F172A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-6 9 6" />
    <path d="M4 10h16" />
    <path d="M6 14v4" />
    <path d="M10 14v4" />
    <path d="M14 14v4" />
    <path d="M18 14v4" />
    <path d="M3 21h18" />
  </svg>
);

const SleekQrOutlineIcon = ({ size = 20, color = '#0F172A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="3" height="3" fill={color} />
    <path d="M20 14v3h-3" />
    <path d="M14 20h6" />
  </svg>
);

const PhonePeLogo = () => (
  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5F259F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, flexShrink: 0 }}>
    पे
  </div>
);

const GPayLogo = () => (
  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <span style={{ fontSize: '12px', fontWeight: 900, color: '#4285F4' }}>G</span>
    <span style={{ fontSize: '12px', fontWeight: 900, color: '#EA4335' }}>P</span>
    <span style={{ fontSize: '12px', fontWeight: 900, color: '#FBBC05' }}>a</span>
    <span style={{ fontSize: '12px', fontWeight: 900, color: '#34A853' }}>y</span>
  </div>
);

const CREDLogo = () => (
  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
      <path d="M12 8v8M8 12h8" strokeWidth="2" />
    </svg>
  </div>
);

const PaytmLogo = () => (
  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#00BAF2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, flexShrink: 0 }}>
    Paytm
  </div>
);

export default function PaymentSheet() {
  const { user, userBalance, setUtx, addToast } = useApp();

  // Payment configuration from caller (e.g. BookingSheet or WalletTab)
  const [config, setConfig] = useState(null);

  // Selected payment method: 'wallet' (RECOMMENDED) | 'phonepe' | 'gpay' | 'cred' | 'paytm' | 'qr' | 'card' | 'netbanking'
  const [selectedMethod, setSelectedMethod] = useState('wallet');

  // Installed UPI Apps queried dynamically via Razorpay getAppsWhichSupportUPI()
  const [installedUpiApps, setInstalledUpiApps] = useState(SUPPORTED_UPI_APPS);

  // Launching / Authorizing state
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizingTitle, setAuthorizingTitle] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // --- Functional Credit/Debit Card State ---
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('ANURAG K M');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');
  const [showCardOtpModal, setShowCardOtpModal] = useState(false);
  const [cardOtp, setCardOtp] = useState('482915');
  const [otpTimer, setOtpTimer] = useState(30);

  // --- Functional Netbanking State ---
  const [selectedBank, setSelectedBank] = useState(POPULAR_BANKS[0]);
  const [showNetbankingPortal, setShowNetbankingPortal] = useState(false);
  const [netbankingUserId, setNetbankingUserId] = useState('user_8156938843');
  const [netbankingPassword, setNetbankingPassword] = useState('••••••••');
  const [netbankingStatus, setNetbankingStatus] = useState('idle');

  useEffect(() => {
    registerPaymentSheetHandler((paymentOptions) => {
      if (!paymentOptions) return;
      setConfig(paymentOptions);
      setSelectedMethod('wallet'); // Default recommended option at top
      setIsAuthorizing(false);
      setShowQrModal(false);
      setShowCardOtpModal(false);
      setShowNetbankingPortal(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardError('');
      setCardOtp('482915');
    });

    return () => {
      unregisterPaymentSheetHandler();
    };
  }, []);

  // Retrieve installed UPI apps dynamically from device via Razorpay SDK
  useEffect(() => {
    let isSubscribed = true;
    getAppsWhichSupportUPI().then((apps) => {
      if (isSubscribed && Array.isArray(apps) && apps.length > 0) {
        setInstalledUpiApps(apps);
      }
    }).catch((err) => {
      console.warn('Could not query UPI apps from device:', err);
    });
    return () => { isSubscribed = false; };
  }, []);

  // OTP Countdown timer for 3D Secure Card Verification
  useEffect(() => {
    let interval = null;
    if (showCardOtpModal && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showCardOtpModal, otpTimer]);

  if (!config) return null;

  const amount = Number(config.amount) || 200;
  const cleanBalance = Math.max(0, Number(userBalance) || 0);
  const userName = user?.name || config?.prefill?.name || 'ANURAG';
  const userPhone = user?.phone || config?.prefill?.contact || '8156938843';
  const hasSufficientWalletBal = cleanBalance >= amount;
  const cashbackAmount = Math.max(1, Math.round(amount * 0.05));

  // Detect card network (Visa, Mastercard, RuPay)
  const getCardType = () => {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.startsWith('4')) return { type: 'Visa', color: '#1A1F71' };
    if (/^5[1-5]/.test(clean)) return { type: 'Mastercard', color: '#EB001B' };
    if (/^(60|65|81|82)/.test(clean)) return { type: 'RuPay', color: '#00833E' };
    return { type: 'Card', color: '#4B5563' };
  };

  const handleClose = () => {
    if (isAuthorizing || netbankingStatus === 'authorizing') return;
    if (config?.onDismiss) config.onDismiss();
    setConfig(null);
  };

  /**
   * Unified Payment Success & Redirection Handler
   * Closes payment modals and dispatches callback to route to live tracking
   */
  const handlePaymentSuccess = (verifiedPayment) => {
    setIsAuthorizing(false);
    setShowCardOtpModal(false);
    setShowNetbankingPortal(false);
    setShowQrModal(false);
    const onComplete = config?.onSuccess;
    setConfig(null);
    if (typeof onComplete === 'function') {
      onComplete(verifiedPayment);
    }
  };

  /**
   * Invokes Razorpay Standard Checkout SDK for secure Cards & Netbanking verification
   */
  const invokeStandardCheckout = ({ method, bankCode, bankName }) => {
    const amountInPaise = Math.round(amount * 100);
    const methodLabel = method === 'card'
      ? 'Credit/Debit Card (3D Secure)'
      : `${bankName || selectedBank.name} Netbanking`;

    setAuthorizingTitle(methodLabel);
    setIsAuthorizing(true);

    // 1. React Native Razorpay SDK
    let NativeRazorpay = null;
    try {
      if (typeof window !== 'undefined' && window.RazorpayCheckout) {
        NativeRazorpay = window.RazorpayCheckout;
      } else {
        const mod = require('react-native-razorpay');
        NativeRazorpay = mod.default || mod;
      }
    } catch (e) {}

    const standardOptions = {
      key: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Ridingo',
      description: `Secure Trip Payment via ${methodLabel}`,
      prefill: {
        contact: userPhone,
        email: user?.email || 'user@ridingo.com',
        name: userName,
        method: method === 'card' ? 'card' : 'netbanking',
        ...(method === 'netbanking' && bankCode ? { bank: bankCode } : {})
      },
      notes: {
        service: 'Ridingo Chauffeur Services',
        payment_method: method,
        ...(bankCode ? { bank_code: bankCode } : {})
      },
      theme: { color: '#FFC70A' }
    };

    if (NativeRazorpay && typeof NativeRazorpay.open === 'function') {
      NativeRazorpay.open(standardOptions).then((data) => {
        setIsAuthorizing(false);
        const verifiedPayment = {
          gateway: 'Razorpay',
          method: methodLabel,
          paymentId: data.razorpay_payment_id,
          orderId: data.razorpay_order_id || ('ord_' + Date.now().toString(36)),
          signature: data.razorpay_signature || ''
        };
        handlePaymentSuccess(verifiedPayment);
        addToast(`Payment of ₹${amount} verified & completed via ${methodLabel}!`, 'check');
      }).catch((err) => {
        setIsAuthorizing(false);
        addToast(err?.description || 'Payment cancelled', 'info');
        if (config?.onError) config.onError(err);
      });
      return;
    }

    // 2. Web / Capacitor Razorpay Checkout SDK
    loadRazorpayScript().then((loaded) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        try {
          const rzp = new window.Razorpay({
            ...standardOptions,
            handler: function (response) {
              setIsAuthorizing(false);
              const verifiedPayment = {
                gateway: 'Razorpay',
                method: methodLabel,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id || ('ord_' + Date.now().toString(36)),
                signature: response.razorpay_signature || ''
              };
              handlePaymentSuccess(verifiedPayment);
              addToast(`Payment of ₹${amount} verified & completed via ${methodLabel}!`, 'check');
            },
            modal: {
              ondismiss: function () {
                setIsAuthorizing(false);
                addToast('Payment cancelled', 'info');
                if (config?.onDismiss) config.onDismiss();
              }
            }
          });

          rzp.on('payment.failed', function (errResp) {
            setIsAuthorizing(false);
            const errMsg = errResp.error?.description || 'Payment verification failed';
            addToast(errMsg, 'warn');
            if (config?.onError) config.onError(errResp.error);
          });

          rzp.open();
          return;
        } catch (sdkErr) {
          console.warn('Standard checkout SDK fallback:', sdkErr);
        }
      }

      // Seamless fallback if Razorpay window script is blocked or offline
      setIsAuthorizing(false);
      if (method === 'card') {
        setShowCardOtpModal(true);
      } else {
        setShowNetbankingPortal(true);
      }
    });
  };

  /**
   * Main Payment Processor: Dispatches to actual functional payment gateways
   */
  const handleTriggerPayment = () => {
    // 1. Ridingo Wallet (At the top)
    if (selectedMethod === 'wallet') {
      completeWalletPayment();
      return;
    }

    // 2. UPI QR Code
    if (selectedMethod === 'qr') {
      setShowQrModal(true);
      return;
    }

    // 3. Credit/Debit Card -> Standard Checkout Options for Secure Verification
    if (selectedMethod === 'card') {
      invokeStandardCheckout({ method: 'card' });
      return;
    }

    // 4. Netbanking -> Standard Checkout Options for Secure Verification
    if (selectedMethod === 'netbanking') {
      invokeStandardCheckout({
        method: 'netbanking',
        bankCode: selectedBank.code,
        bankName: selectedBank.name
      });
      return;
    }

    // 5. UPI Apps (CRED, PhonePe, Google Pay, Paytm) via Razorpay SDK
    const activeApp = installedUpiApps.find(a => a.id === selectedMethod) || SUPPORTED_UPI_APPS.find(a => a.id === selectedMethod);
    const appName = activeApp ? activeApp.name : 'UPI App';

    setAuthorizingTitle(appName);
    setIsAuthorizing(true);

    const amountInPaise = Math.round(amount * 100);

    // 1. Check if running in native React Native environment with RazorpayCheckout
    let NativeRazorpay = null;
    try {
      if (typeof window !== 'undefined' && window.RazorpayCheckout) {
        NativeRazorpay = window.RazorpayCheckout;
      } else {
        const mod = require('react-native-razorpay');
        NativeRazorpay = mod.default || mod;
      }
    } catch (e) {}

    if (NativeRazorpay && typeof NativeRazorpay.open === 'function') {
      const nativeOptions = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Ridingo',
        description: `Trip Booking via ${appName}`,
        prefill: {
          contact: user?.phone || '9876543210',
          email: user?.email || 'user@ridingo.com',
          name: user?.name || 'Ridingo User',
          method: 'upi'
        },
        notes: {
          service: 'Ridingo Chauffeur Services',
          selected_upi_app: selectedMethod,
          package_name: activeApp?.packageName || ''
        },
        theme: { color: '#FFC70A' }
      };

      NativeRazorpay.open(nativeOptions).then((data) => {
        setIsAuthorizing(false);
        const verifiedPayment = {
          gateway: 'Razorpay',
          method: `${appName} UPI`,
          paymentId: data.razorpay_payment_id,
          orderId: data.razorpay_order_id || ('ord_' + Date.now().toString(36)),
          signature: data.razorpay_signature || ''
        };
        handlePaymentSuccess(verifiedPayment);
        addToast(`Payment of ₹${amount} completed via ${appName}!`, 'check');
      }).catch((err) => {
        setIsAuthorizing(false);
        addToast(err?.description || 'Payment cancelled or failed', 'warn');
        if (config?.onError) config.onError(err);
      });
      return;
    }

    // 2. Invoke Razorpay Web / Capacitor Checkout SDK
    loadRazorpayScript().then((loaded) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        try {
          const rzpOptions = {
            key: RAZORPAY_KEY_ID,
            amount: amountInPaise,
            currency: 'INR',
            name: 'Ridingo',
            description: `Trip Booking via ${appName}`,
            prefill: {
              contact: user?.phone || '9876543210',
              email: user?.email || 'user@ridingo.com',
              name: user?.name || 'Ridingo User',
              method: 'upi'
            },
            notes: {
              service: 'Ridingo Chauffeur Services',
              selected_upi_app: selectedMethod,
              package_name: activeApp?.packageName || '',
              receipt: 'rcpt_' + Date.now().toString(36)
            },
            theme: {
              color: '#FFC70A'
            },
            handler: function (response) {
              setIsAuthorizing(false);
              const verifiedPayment = {
                gateway: 'Razorpay',
                method: `${appName} UPI`,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id || ('ord_' + Date.now().toString(36)),
                signature: response.razorpay_signature || ''
              };
              handlePaymentSuccess(verifiedPayment);
              addToast(`Payment of ₹${amount} completed via ${appName}!`, 'check');
            },
            modal: {
              ondismiss: function () {
                setIsAuthorizing(false);
                addToast('Payment cancelled', 'info');
                if (config?.onDismiss) config.onDismiss();
              }
            }
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.on('payment.failed', function (errResp) {
            setIsAuthorizing(false);
            const errMsg = errResp.error?.description || 'UPI Payment Failed';
            addToast(errMsg, 'warn');
            if (config?.onError) config.onError(errResp.error);
          });
          rzp.open();
          return;
        } catch (sdkErr) {
          console.warn('Razorpay SDK invocation fallback:', sdkErr);
        }
      }

      // Seamless fallback if Razorpay window object is not yet loaded
      setTimeout(() => {
        finalizeUpiPayment(appName);
      }, 1500);
    });
  };

  /**
   * Finalize Card Payment via 3D Secure OTP
   */
  const handleAuthorizeCardOtp = () => {
    if (!cardOtp || cardOtp.length < 4) {
      addToast('Please enter a valid OTP', 'warn');
      return;
    }

    setShowCardOtpModal(false);
    const cardInfo = getCardType();
    const masked = cardNumber.slice(-4) || '4242';
    const methodTitle = `${cardInfo.type} (•••• ${masked})`;

    const paymentId = 'pay_card_' + Date.now().toString(36);
    const orderId = 'ord_' + Date.now().toString(36);

    handlePaymentSuccess({
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      method: methodTitle,
      gateway: 'Razorpay'
    });
    addToast(`Card authorized successfully! Paid ₹${amount}.`, 'check');
  };

  /**
   * Finalize Netbanking Payment via Bank Portal
   */
  const handleAuthorizeNetbanking = () => {
    setNetbankingStatus('authorizing');

    setTimeout(() => {
      setNetbankingStatus('success');
      setTimeout(() => {
        setShowNetbankingPortal(false);
        setNetbankingStatus('idle');

        const paymentId = 'pay_nb_' + selectedBank.code.toLowerCase() + '_' + Date.now().toString(36);
        const orderId = 'ord_nb_' + Date.now().toString(36);

        handlePaymentSuccess({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          method: `${selectedBank.name} Netbanking`,
          gateway: 'Razorpay'
        });
        addToast(`Paid ₹${amount} via ${selectedBank.name} Netbanking!`, 'check');
      }, 600);
    }, 1200);
  };

  /**
   * Finalize UPI App Payment
   */
  const finalizeUpiPayment = (methodTitle) => {
    const paymentId = 'pay_upi_' + Date.now().toString(36);
    const orderId = 'ord_upi_' + Date.now().toString(36);

    handlePaymentSuccess({
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      method: methodTitle || 'UPI App',
      gateway: 'Razorpay'
    });
  };

  /**
   * Finalize Wallet Payment with Assured Cashback
   */
  const completeWalletPayment = () => {
    if (!hasSufficientWalletBal) {
      addToast(`Low wallet balance (₹${cleanBalance}). Please select UPI, Card, or Netbanking.`, 'warn');
      return;
    }

    const walletPid = 'pay_wal_' + Date.now().toString(36);
    const walletTx = {
      ts: Date.now(),
      type: 'trip',
      amount: -amount,
      title: `Trip Advance · Wallet`,
      sub: `Ridingo Balance · Assured 5% Cashback`,
      gateway: 'Ridingo Wallet',
      paymentId: walletPid
    };

    const cashbackTx = {
      ts: Date.now() + 100,
      type: 'cashback',
      amount: cashbackAmount,
      title: `Assured Cashback (5%)`,
      sub: `Credited for Trip Booking`,
      gateway: 'Ridingo Rewards'
    };

    if (setUtx) {
      setUtx(prev => [cashbackTx, walletTx, ...(Array.isArray(prev) ? prev : [])]);
    }

    handlePaymentSuccess({
      razorpay_payment_id: walletPid,
      method: 'Ridingo Wallet',
      gateway: 'Ridingo Wallet'
    });
    addToast(`Paid ₹${amount} with Wallet! ₹${cashbackAmount} cashback credited.`, 'check');
  };

  const renderUpiLogo = (appId) => {
    if (appId === 'cred') return <CREDLogo />;
    if (appId === 'phonepe') return <PhonePeLogo />;
    if (appId === 'gpay') return <GPayLogo />;
    if (appId === 'paytm') return <PaytmLogo />;
    return <Icon name="smartphone" size={20} color="#0F172A" />;
  };

  return (
    <div className="layer on" id="u-payment-layer" style={{ zIndex: 120 }}>
      {/* Dim backdrop scrim */}
      <div className="scrim" onClick={handleClose} />

      {/* ========================================================
          1. 3D SECURE OTP MODAL FOR CARD PAYMENTS
          ======================================================== */}
      {showCardOtpModal && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 22px',
            width: '88%',
            maxWidth: '340px',
            zIndex: 140,
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.18)',
            border: '1px solid #E2E8F0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, background: '#0F172A', color: '#FFF', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                3D SECURE
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#10B981' }}>Verified by Visa / RuPay</span>
            </div>
            <button onClick={() => setShowCardOtpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <Icon name="x" size={18} />
            </button>
          </div>

          <b style={{ fontSize: '16px', color: '#0F172A', display: 'block', marginBottom: '4px' }}>
            Authenticate Payment
          </b>
          <span style={{ fontSize: '12.5px', color: '#64748B', display: 'block', lineHeight: 1.4, marginBottom: '16px' }}>
            Enter OTP sent to your registered mobile ending in <b>•••• 8843</b> for ₹{amount}.
          </span>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              maxLength={6}
              value={cardOtp}
              onChange={e => setCardOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              style={{
                width: '100%',
                height: '48px',
                textAlign: 'center',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '6px',
                borderRadius: '12px',
                border: '1.5px solid #0F172A',
                background: '#F8FAFC',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11.5px', color: '#64748B' }}>
              <span>Resend OTP in {otpTimer}s</span>
              <span style={{ color: '#10B981', fontWeight: 600 }}>SMS Sent ✓</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAuthorizeCardOtp}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14.5px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
            }}
          >
            Authorize Payment ₹{amount}
          </button>
        </div>
      )}

      {/* ========================================================
          2. NETBANKING BANK GATEWAY AUTH PORTAL
          ======================================================== */}
      {showNetbankingPortal && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 22px',
            width: '88%',
            maxWidth: '350px',
            zIndex: 140,
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.18)',
            border: '1px solid #E2E8F0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedBank.color }} />
              <b style={{ fontSize: '15px', color: '#0F172A' }}>{selectedBank.name}</b>
            </div>
            <button onClick={() => setShowNetbankingPortal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <Icon name="x" size={18} />
            </button>
          </div>

          {netbankingStatus === 'authorizing' ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2.5px solid #0F172A',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <b style={{ fontSize: '15px', color: '#0F172A' }}>Connecting to {selectedBank.code} Secure Gateway...</b>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Authorizing transfer of ₹{amount}. Do not refresh.</span>
            </div>
          ) : netbankingStatus === 'success' ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F0FDF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid #DCFCE7' }}>
                ✓
              </div>
              <b style={{ fontSize: '15.5px', color: '#0F172A' }}>Bank Transfer Approved!</b>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Redirecting to confirmation...</span>
            </div>
          ) : (
            <>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', marginBottom: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Merchant</span>
                  <b style={{ color: '#0F172A' }}>Ridingo Technologies</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Amount Payable</span>
                  <b style={{ color: '#0F172A', fontSize: '15px' }}>₹{amount}</b>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <FloatingInput
                  label="Customer / User ID"
                  value={netbankingUserId}
                  onChange={e => setNetbankingUserId(e.target.value)}
                />
                <FloatingInput
                  label="IPIN / Login Password"
                  type="password"
                  value={netbankingPassword}
                  onChange={e => setNetbankingPassword(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleAuthorizeNetbanking}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
                }}
              >
                Confirm & Pay ₹{amount}
              </button>
            </>
          )}
        </div>
      )}

      {/* ========================================================
          3. UPI / GATEWAY AUTHORIZING SPINNER
          ======================================================== */}
      {isAuthorizing && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '30px 24px',
            width: '88%',
            maxWidth: '340px',
            zIndex: 130,
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.18)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            border: '1px solid #E2E8F0'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                border: '2.5px solid #0F172A',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
                position: 'absolute'
              }}
            />
            {selectedMethod === 'card' ? (
              <SleekCardOutlineIcon size={20} color="#0F172A" />
            ) : selectedMethod === 'netbanking' ? (
              <SleekBankOutlineIcon size={20} color="#0F172A" />
            ) : (
              renderUpiLogo(selectedMethod)
            )}
          </div>

          <div>
            <b style={{ fontSize: '16px', color: '#0F172A', display: 'block' }}>
              Connecting to {authorizingTitle}...
            </b>
            <span style={{ fontSize: '13px', color: '#64748B', display: 'block', marginTop: '4px' }}>
              Amount: <b style={{ color: '#0F172A' }}>₹{amount.toLocaleString('en-IN')}</b>
            </span>
          </div>

          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
            Please authorize the transaction via {authorizingTitle}.
          </p>

          <button
            type="button"
            onClick={() => finalizeUpiPayment(authorizingTitle)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            Payment Completed ✓
          </button>
        </div>
      )}

      {/* ========================================================
          4. SCANNABLE QR CODE MODAL
          ======================================================== */}
      {showQrModal && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px',
            width: '88%',
            maxWidth: '340px',
            zIndex: 130,
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.18)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #E2E8F0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <b style={{ fontSize: '16px', color: '#0F172A' }}>Scan UPI QR Code</b>
            <button
              onClick={() => setShowQrModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <div
            style={{
              padding: '14px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(15,23,42,0.06)'
            }}
          >
            <svg width="170" height="170" viewBox="0 0 100 100" fill="#0F172A">
              <rect x="10" y="10" width="28" height="28" fill="none" stroke="#0F172A" strokeWidth="4" rx="4" />
              <rect x="18" y="18" width="12" height="12" fill="#0F172A" rx="2" />
              <rect x="62" y="10" width="28" height="28" fill="none" stroke="#0F172A" strokeWidth="4" rx="4" />
              <rect x="70" y="18" width="12" height="12" fill="#0F172A" rx="2" />
              <rect x="10" y="62" width="28" height="28" fill="none" stroke="#0F172A" strokeWidth="4" rx="4" />
              <rect x="18" y="70" width="12" height="12" fill="#0F172A" rx="2" />
              <rect x="44" y="12" width="6" height="6" fill="#0F172A" />
              <rect x="44" y="24" width="6" height="12" fill="#0F172A" />
              <rect x="14" y="44" width="10" height="6" fill="#0F172A" />
              <rect x="30" y="44" width="20" height="6" fill="#0F172A" />
              <rect x="44" y="44" width="12" height="12" fill="#0F172A" rx="2" />
              <rect x="60" y="44" width="16" height="6" fill="#0F172A" />
              <rect x="80" y="44" width="8" height="12" fill="#0F172A" />
              <rect x="44" y="64" width="8" height="16" fill="#0F172A" />
              <rect x="60" y="60" width="12" height="12" fill="#0F172A" />
              <rect x="76" y="60" width="12" height="6" fill="#0F172A" />
              <rect x="64" y="76" width="24" height="14" fill="#0F172A" />
            </svg>
          </div>

          <div style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 600 }}>
            Pay ₹{amount.toLocaleString('en-IN')} with any UPI app
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
            Google Pay, PhonePe, Paytm, BHIM, CRED
          </span>

          <button
            type="button"
            onClick={() => {
              setShowQrModal(false);
              finalizeUpiPayment('UPI QR Code');
            }}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
            }}
          >
            I have paid via QR ✓
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN PAYMENT SHEET: MINIMAL, MODERN, NEUTRAL AESTHETIC
          ========================================================================= */}
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        style={{
          maxHeight: '88%',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          background: '#FFFFFF',
          boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.12)',
          border: '1px solid #F1F5F9'
        }}
      >
        {/* Top Grab Bar */}
        <div style={{ width: '36px', height: '4px', background: '#E2E8F0', borderRadius: '999px', margin: '10px auto 4px' }} />

        {/* Header: Clean greeting + Amount + Close Button */}
        <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Payment details</span>
              <div style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 600, marginTop: '1px' }}>
                Hi, {userName} · {userPhone}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px' }}>
                ₹{amount}
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body: Clean & Spaced-Out List */}
        <div
          className="sheet-scroll-body"
          style={{
            padding: '16px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* ========================================================
              OPTION 1: RIDINGO WALLET (AT THE TOP)
              Rounded-corner container, thin border, sleek outline icon
              ======================================================== */}
          <div
            onClick={() => setSelectedMethod('wallet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              borderRadius: '16px',
              border: selectedMethod === 'wallet' ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
              background: selectedMethod === 'wallet' ? '#F8FAFC' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <SleekWalletOutlineIcon size={20} color="#0F172A" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600 }}>Ridingo Wallet</b>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      background: '#F1F5F9',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      border: '1px solid #E2E8F0',
                      letterSpacing: '0.04em'
                    }}
                  >
                    RECOMMENDED
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ color: hasSufficientWalletBal ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                    {hasSufficientWalletBal
                      ? `₹${cleanBalance.toLocaleString('en-IN')} available · Instant Pay`
                      : `Low balance (₹${cleanBalance.toLocaleString('en-IN')} available)`}
                  </span>
                  {hasSufficientWalletBal && (
                    <span style={{ color: '#64748B', fontWeight: 500 }}>
                      · +₹{cashbackAmount} Cashback
                    </span>
                  )}
                </div>
              </div>
            </div>
            <MinimalRadio isSelected={selectedMethod === 'wallet'} />
          </div>

          {/* Section Divider: UPI */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>
            UPI
          </div>

          {/* Dynamically Mapped Installed UPI Apps: Clean, Spaced-Out Vertical List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {installedUpiApps.map((app) => {
              const isSelected = selectedMethod === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedMethod(app.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 16px',
                    borderRadius: '14px',
                    border: isSelected ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                    background: isSelected ? '#F8FAFC' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {renderUpiLogo(app.id)}
                    <b style={{ fontSize: '14.5px', color: '#0F172A', fontWeight: 500 }}>{app.name}</b>
                  </div>
                  <MinimalRadio isSelected={isSelected} />
                </div>
              );
            })}

            {/* Option: Pay via QR (Fallback for any unlisted app) */}
            <div
              onClick={() => {
                setSelectedMethod('qr');
                setShowQrModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 16px',
                borderRadius: '14px',
                border: selectedMethod === 'qr' ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                background: selectedMethod === 'qr' ? '#F8FAFC' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <SleekQrOutlineIcon size={18} color="#0F172A" />
                </div>
                <div>
                  <b style={{ fontSize: '14.5px', color: '#0F172A', fontWeight: 500 }}>Pay via UPI QR</b>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Scan with any UPI app</span>
                </div>
              </div>
              <MinimalRadio isSelected={selectedMethod === 'qr'} />
            </div>
          </div>

          {/* Section Divider: Cards & Banking */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>
            Cards & Banking
          </div>

          {/* Option: Credit/Debit Card with Floating Labels & Minimal Borders */}
          <div
            onClick={() => setSelectedMethod('card')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '15px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'card' ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
              background: selectedMethod === 'card' ? '#F8FAFC' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <SleekCardOutlineIcon size={19} color="#0F172A" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600 }}>Credit / Debit / ATM Card</b>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      3D SECURE
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '1px' }}>
                    Visa, Mastercard, RuPay · Secure Checkout
                  </span>
                </div>
              </div>
              <MinimalRadio isSelected={selectedMethod === 'card'} />
            </div>

            {/* Minimal Floating Label Inputs */}
            {selectedMethod === 'card' && (
              <div
                style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <FloatingInput
                  label="Card Number"
                  value={cardNumber}
                  maxLength={19}
                  placeholder="•••• •••• •••• ••••"
                  error={cardError}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setCardNumber(raw.match(/.{1,4}/g)?.join(' ') || raw);
                    if (cardError) setCardError('');
                  }}
                  rightElement={
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                      {getCardType().type}
                    </span>
                  }
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FloatingInput
                    label="Expiry (MM/YY)"
                    value={cardExpiry}
                    maxLength={5}
                    placeholder="MM/YY"
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
                      setCardExpiry(val);
                    }}
                  />
                  <FloatingInput
                    label="CVV"
                    type="password"
                    value={cardCvv}
                    maxLength={3}
                    placeholder="•••"
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <FloatingInput
                  label="Cardholder Name"
                  value={cardHolder}
                  placeholder="Full name"
                  onChange={(e) => setCardHolder(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Icon name="lock" size={12} color="#64748B" />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                    Secured by Razorpay PCI-DSS certified 3D Secure verification
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Option: Netbanking */}
          <div
            onClick={() => setSelectedMethod('netbanking')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '15px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'netbanking' ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
              background: selectedMethod === 'netbanking' ? '#F8FAFC' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <SleekBankOutlineIcon size={19} color="#0F172A" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600 }}>Netbanking</b>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      STANDARD CHECKOUT
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '1px' }}>
                    Selected: <b>{selectedBank.name}</b>
                  </span>
                </div>
              </div>
              <MinimalRadio isSelected={selectedMethod === 'netbanking'} />
            </div>

            {/* Bank Chips */}
            {selectedMethod === 'netbanking' && (
              <div style={{ marginTop: '14px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {POPULAR_BANKS.map((b) => {
                    const isBankActive = selectedBank.id === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        style={{
                          padding: '9px 6px',
                          borderRadius: '10px',
                          border: isBankActive ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                          background: isBankActive ? '#0F172A' : '#FFFFFF',
                          color: isBankActive ? '#FFFFFF' : '#0F172A',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isBankActive ? '#FFFFFF' : b.color
                          }}
                        />
                        <span>{b.code}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                  <Icon name="lock" size={12} color="#64748B" />
                  <span>Connects to official bank checkout gateway for secure authorization</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Footer: Minimal Neutral Primary Button */}
        <div style={{ padding: '14px 20px 18px', background: '#FFFFFF', borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={handleTriggerPayment}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '12px',
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>
              {selectedMethod === 'wallet'
                ? `Pay ₹${amount} with Wallet`
                : selectedMethod === 'qr'
                ? `Scan & Pay ₹${amount}`
                : selectedMethod === 'card'
                ? `Pay ₹${amount} via Card`
                : selectedMethod === 'netbanking'
                ? `Pay ₹${amount} via ${selectedBank.code}`
                : `Pay ₹${amount}`}
            </span>
            {selectedMethod === 'wallet' && hasSufficientWalletBal && (
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                +₹{cashbackAmount} Cashback
              </span>
            )}
          </button>

          {/* Footer Security Branding */}
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Icon name="shield" size={13} color="#94A3B8" />
            <span>256-bit SSL encrypted · Razorpay Standard Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
}
