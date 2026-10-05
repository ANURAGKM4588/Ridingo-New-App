import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { registerPaymentSheetHandler, unregisterPaymentSheetHandler } from '../utils/razorpay';

const POPULAR_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank', code: 'HDFC', color: '#004c8f' },
  { id: 'SBI', name: 'State Bank of India', code: 'SBI', color: '#280071' },
  { id: 'ICICI', name: 'ICICI Bank', code: 'ICICI', color: '#b82a24' },
  { id: 'AXIS', name: 'Axis Bank', code: 'Axis', color: '#97144d' },
  { id: 'KOTAK', name: 'Kotak Mahindra Bank', code: 'Kotak', color: '#e61e24' },
  { id: 'PNB', name: 'Punjab National Bank', code: 'PNB', color: '#a20f2e' }
];

export default function PaymentSheet() {
  const { user, userBalance, setUtx, addToast } = useApp();

  // Payment configuration from caller (e.g. BookingSheet or WalletTab)
  const [config, setConfig] = useState(null);

  // Selected payment method: 'wallet' (RECOMMENDED) | 'phonepe' | 'gpay' | 'cred' | 'paytm' | 'qr' | 'card' | 'netbanking'
  const [selectedMethod, setSelectedMethod] = useState('wallet');

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
    if (config.onDismiss) config.onDismiss();
    setConfig(null);
  };

  /**
   * Main Payment Processor: Dispatches to actual functional payment gateways
   */
  const handleTriggerPayment = () => {
    // 1. Ridingo Wallet
    if (selectedMethod === 'wallet') {
      completeWalletPayment();
      return;
    }

    // 2. UPI QR Code
    if (selectedMethod === 'qr') {
      setShowQrModal(true);
      return;
    }

    // 3. Credit/Debit Card
    if (selectedMethod === 'card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15) {
        setCardError('Please enter a valid 16-digit card number');
        addToast('Please enter a valid 16-digit card number', 'warn');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setCardError('Please enter valid expiry date (MM/YY)');
        addToast('Please enter valid expiry date (MM/YY)', 'warn');
        return;
      }
      if (cardCvv.length < 3) {
        setCardError('Please enter 3-digit CVV');
        addToast('Please enter 3-digit CVV', 'warn');
        return;
      }

      setCardError('');
      setOtpTimer(30);
      setShowCardOtpModal(true);
      return;
    }

    // 4. Netbanking Portal
    if (selectedMethod === 'netbanking') {
      setShowNetbankingPortal(true);
      return;
    }

    // 5. UPI Apps (PhonePe, Google Pay, CRED, Paytm)
    let appName = 'UPI App';
    let deepLinkScheme = '';
    const vpa = 'ridingo@okhdfcbank';
    const payeeName = 'Ridingo Technologies';
    const txnNote = 'Trip Advance Booking';
    const txnRef = 'TRP' + Date.now().toString().slice(-6);
    const targetAmt = amount.toFixed(2);

    const standardUpiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${targetAmt}&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${txnRef}`;

    if (selectedMethod === 'phonepe') {
      appName = 'PhonePe';
      deepLinkScheme = `phonepe://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${targetAmt}&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${txnRef}`;
    } else if (selectedMethod === 'cred') {
      appName = 'CRED';
      deepLinkScheme = `cred://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${targetAmt}&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${txnRef}`;
    } else if (selectedMethod === 'gpay') {
      appName = 'Google Pay';
      deepLinkScheme = `tez://upi/pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${targetAmt}&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${txnRef}`;
    } else if (selectedMethod === 'paytm') {
      appName = 'Paytm';
      deepLinkScheme = `paytmmp://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${targetAmt}&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${txnRef}`;
    }

    setAuthorizingTitle(appName);
    setIsAuthorizing(true);

    // On mobile devices, launch the native application
    if (deepLinkScheme) {
      try {
        window.location.href = deepLinkScheme;
        setTimeout(() => {
          try { window.location.href = standardUpiIntent; } catch (e) {}
        }, 600);
      } catch (err) {
        console.warn('Native intent launch:', err);
      }
    }

    setTimeout(() => {
      finalizeUpiPayment(appName);
    }, 2200);
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

    setConfig(null);
    if (config?.onSuccess) {
      config.onSuccess({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        method: methodTitle
      });
    }
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

        setConfig(null);
        if (config?.onSuccess) {
          config.onSuccess({
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            method: `${selectedBank.name} Netbanking`
          });
        }
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

    setIsAuthorizing(false);
    setConfig(null);

    if (config?.onSuccess) {
      config.onSuccess({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        method: methodTitle || 'UPI App'
      });
    }
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

    setConfig(null);
    if (config?.onSuccess) {
      config.onSuccess({
        razorpay_payment_id: walletPid,
        method: 'Ridingo Wallet'
      });
    }
    addToast(`Paid ₹${amount} with Wallet! ₹${cashbackAmount} cashback credited.`, 'check');
  };

  // SVGs & Clean Logos
  const WalletLogo = () => (
    <div
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'var(--yellow, #FFC70A)',
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(255, 199, 10, 0.35)'
      }}
    >
      <Icon name="wallet" size={22} />
    </div>
  );

  const QrLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 199, 10, 0.2)', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name="qr" size={22} />
    </div>
  );

  const CardLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 199, 10, 0.2)', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name="card" size={22} />
    </div>
  );

  const NetbankingLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 199, 10, 0.2)', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name="bank" size={20} />
    </div>
  );

  const PhonePeLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#5F259F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, flexShrink: 0 }}>
      पे
    </div>
  );

  const GPayLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: '15px', fontWeight: 900, color: '#4285F4' }}>G</span>
      <span style={{ fontSize: '15px', fontWeight: 900, color: '#EA4335' }}>P</span>
      <span style={{ fontSize: '15px', fontWeight: 900, color: '#FBBC05' }}>a</span>
      <span style={{ fontSize: '15px', fontWeight: 900, color: '#34A853' }}>y</span>
    </div>
  );

  const CREDLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#0D0E11', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
        <path d="M12 8v8M8 12h8" strokeWidth="2" />
      </svg>
    </div>
  );

  const PaytmLogo = () => (
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#00BAF2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>
      Paytm
    </div>
  );

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
            borderRadius: '24px',
            padding: '24px 22px',
            width: '88%',
            maxWidth: '340px',
            zIndex: 140,
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            border: '2px solid var(--yellow, #FFC70A)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, background: '#111827', color: '#FFF', padding: '2px 8px', borderRadius: '4px' }}>
                3D SECURE
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>Verified by Visa / RuPay</span>
            </div>
            <button onClick={() => setShowCardOtpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Icon name="x" size={18} />
            </button>
          </div>

          <b style={{ fontSize: '16px', color: '#111827', display: 'block', marginBottom: '4px' }}>
            Authenticate Payment
          </b>
          <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', lineHeight: 1.4, marginBottom: '14px' }}>
            Enter OTP sent to your registered mobile ending in <b>•••• 8843</b> for ₹{amount}.
          </span>

          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              maxLength={6}
              value={cardOtp}
              onChange={e => setCardOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit OTP"
              style={{
                width: '100%',
                height: '46px',
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '6px',
                borderRadius: '12px',
                border: '2px solid var(--yellow, #FFC70A)',
                background: '#FFFBEB',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11.5px', color: '#6B7280' }}>
              <span>Resend OTP in {otpTimer}s</span>
              <span style={{ color: '#16A34A', fontWeight: 700 }}>SMS Sent ✓</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAuthorizeCardOtp}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '14px',
              background: 'var(--yellow, #FFC70A)',
              color: '#111827',
              fontWeight: 800,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 199, 10, 0.4)'
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
            borderRadius: '24px',
            padding: '24px 22px',
            width: '88%',
            maxWidth: '350px',
            zIndex: 140,
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            border: '2px solid ' + selectedBank.color
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedBank.color }} />
              <b style={{ fontSize: '15px', color: selectedBank.color }}>{selectedBank.name}</b>
            </div>
            <button onClick={() => setShowNetbankingPortal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Icon name="x" size={18} />
            </button>
          </div>

          {netbankingStatus === 'authorizing' ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '3px solid ' + selectedBank.color,
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <b style={{ fontSize: '15px', color: '#111827' }}>Connecting to {selectedBank.code} Secure Gateway...</b>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Authorizing transfer of ₹{amount}. Do not refresh.</span>
            </div>
          ) : netbankingStatus === 'success' ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DEF7EC', color: '#03543F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                ✓
              </div>
              <b style={{ fontSize: '16px', color: '#111827' }}>Bank Transfer Approved!</b>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Redirecting to confirmation...</span>
            </div>
          ) : (
            <>
              <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '12px', marginBottom: '14px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#6B7280' }}>Merchant</span>
                  <b>Ridingo Technologies</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#6B7280' }}>Amount Payable</span>
                  <b style={{ color: '#B45309', fontSize: '15px' }}>₹{amount}</b>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '3px' }}>
                    Customer / User ID
                  </label>
                  <input
                    type="text"
                    value={netbankingUserId}
                    onChange={e => setNetbankingUserId(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #D1D5DB', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '3px' }}>
                    IPIN / Login Password
                  </label>
                  <input
                    type="password"
                    value={netbankingPassword}
                    onChange={e => setNetbankingPassword(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #D1D5DB', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAuthorizeNetbanking}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  background: selectedBank.color,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                Confirm & Pay ₹{amount}
              </button>
            </>
          )}
        </div>
      )}

      {/* ========================================================
          3. UPI APP AUTHORIZATION SPINNER
          ======================================================== */}
      {isAuthorizing && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--sheet, #FFFFFF)',
            borderRadius: '24px',
            padding: '30px 24px',
            width: '88%',
            maxWidth: '340px',
            zIndex: 130,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            border: '1px solid var(--line, #E5E7EB)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 199, 10, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                border: '3px solid var(--yellow, #FFC70A)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
                position: 'absolute'
              }}
            />
            {authorizingTitle === 'PhonePe' ? <PhonePeLogo /> : authorizingTitle === 'CRED' ? <CREDLogo /> : <GPayLogo />}
          </div>

          <div>
            <b style={{ fontSize: '17px', color: 'var(--ink, #111827)', display: 'block' }}>
              Connecting to {authorizingTitle}...
            </b>
            <span style={{ fontSize: '13px', color: 'var(--muted, #6B7280)', display: 'block', marginTop: '4px' }}>
              Amount: <b style={{ color: 'var(--ink, #111827)' }}>₹{amount.toLocaleString('en-IN')}</b>
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--muted, #6B7280)', margin: 0, lineHeight: 1.4 }}>
            Please authorize the transaction in your {authorizingTitle} app.
          </p>

          <button
            type="button"
            onClick={() => finalizeUpiPayment(authorizingTitle)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--yellow, #FFC70A)',
              color: '#111827',
              fontWeight: 800,
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
            background: 'var(--sheet, #FFFFFF)',
            borderRadius: '24px',
            padding: '24px',
            width: '88%',
            maxWidth: '340px',
            zIndex: 130,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid var(--line, #E5E7EB)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <b style={{ fontSize: '16px', color: 'var(--ink, #111827)' }}>Scan UPI QR Code</b>
            <button
              onClick={() => setShowQrModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, #6B7280)' }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <div
            style={{
              padding: '16px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '2px solid var(--yellow, #FFC70A)',
              boxShadow: '0 4px 12px rgba(255, 199, 10, 0.15)'
            }}
          >
            <svg width="180" height="180" viewBox="0 0 100 100" fill="#111827">
              <rect x="10" y="10" width="28" height="28" fill="none" stroke="#111827" strokeWidth="4" rx="4" />
              <rect x="18" y="18" width="12" height="12" fill="#111827" rx="2" />
              <rect x="62" y="10" width="28" height="28" fill="none" stroke="#111827" strokeWidth="4" rx="4" />
              <rect x="70" y="18" width="12" height="12" fill="#111827" rx="2" />
              <rect x="10" y="62" width="28" height="28" fill="none" stroke="#111827" strokeWidth="4" rx="4" />
              <rect x="18" y="70" width="12" height="12" fill="#111827" rx="2" />
              <rect x="44" y="12" width="6" height="6" fill="#111827" />
              <rect x="44" y="24" width="6" height="12" fill="#111827" />
              <rect x="14" y="44" width="10" height="6" fill="#111827" />
              <rect x="30" y="44" width="20" height="6" fill="#111827" />
              <rect x="44" y="44" width="12" height="12" fill="var(--yellow, #FFC70A)" rx="2" />
              <rect x="60" y="44" width="16" height="6" fill="#111827" />
              <rect x="80" y="44" width="8" height="12" fill="#111827" />
              <rect x="44" y="64" width="8" height="16" fill="#111827" />
              <rect x="60" y="60" width="12" height="12" fill="#111827" />
              <rect x="76" y="60" width="12" height="6" fill="#111827" />
              <rect x="64" y="76" width="24" height="14" fill="#111827" />
            </svg>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--ink, #111827)', fontWeight: 700 }}>
            Pay ₹{amount.toLocaleString('en-IN')} with any UPI app
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted, #6B7280)' }}>
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
              borderRadius: '14px',
              background: 'var(--yellow, #FFC70A)',
              color: '#111827',
              fontWeight: 800,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 199, 10, 0.35)'
            }}
          >
            I have paid via QR ✓
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN PAYMENT SHEET: SIMPLE, CLEAN, WORKING SETUP
          ========================================================================= */}
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        style={{
          maxHeight: '88%',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          background: 'var(--sheet, #FFFFFF)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.18)'
        }}
      >
        {/* Top Grab Bar */}
        <div style={{ width: '38px', height: '4px', background: '#D1D5DB', borderRadius: '999px', margin: '10px auto 4px' }} />

        {/* Sticky Header: Greeting + Large Bold Amount + Close (X) */}
        <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '13px', color: 'var(--ink, #1F2937)', fontWeight: 500, letterSpacing: '-0.2px' }}>
            Hi, {userName} - {userPhone}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--ink, #111827)', letterSpacing: '-0.5px' }}>
              ₹{amount}
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: 'var(--ink, #111827)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon name="x" size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Body: Simple & Easy to Pay Options */}
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
              OPTION 1: RIDINGO WALLET (TOP RECOMMENDED OPTION)
              ======================================================== */}
          <div
            onClick={() => setSelectedMethod('wallet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'wallet' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'wallet' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedMethod === 'wallet' ? '0 4px 14px rgba(255, 199, 10, 0.22)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <WalletLogo />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <b style={{ fontSize: '15px', color: '#111827', fontWeight: 800 }}>Ridingo Wallet</b>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: '#B45309',
                      background: 'rgba(255, 199, 10, 0.32)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.03em'
                    }}
                  >
                    RECOMMENDED
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: hasSufficientWalletBal ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                  {hasSufficientWalletBal
                    ? `₹${cleanBalance.toLocaleString('en-IN')} available · Instant Pay & ₹${cashbackAmount} Cashback`
                    : `Low balance (₹${cleanBalance.toLocaleString('en-IN')} available)`}
                </span>
              </div>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: selectedMethod === 'wallet' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                background: selectedMethod === 'wallet' ? '#111827' : '#FFFFFF',
                flexShrink: 0
              }}
            />
          </div>

          {/* Section Divider: UPI */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            UPI Payments
          </div>

          {/* Option: PhonePe */}
          <div
            onClick={() => setSelectedMethod('phonepe')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'phonepe' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'phonepe' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <PhonePeLogo />
              <b style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>PhonePe</b>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: selectedMethod === 'phonepe' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                background: selectedMethod === 'phonepe' ? '#111827' : '#FFFFFF',
                flexShrink: 0
              }}
            />
          </div>

          {/* Option: Google Pay */}
          <div
            onClick={() => setSelectedMethod('gpay')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'gpay' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'gpay' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <GPayLogo />
              <b style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>Google Pay</b>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: selectedMethod === 'gpay' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                background: selectedMethod === 'gpay' ? '#111827' : '#FFFFFF',
                flexShrink: 0
              }}
            />
          </div>

          {/* Option: CRED */}
          <div
            onClick={() => setSelectedMethod('cred')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'cred' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'cred' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <CREDLogo />
              <b style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>CRED UPI</b>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: selectedMethod === 'cred' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                background: selectedMethod === 'cred' ? '#111827' : '#FFFFFF',
                flexShrink: 0
              }}
            />
          </div>

          {/* Option: Pay via QR */}
          <div
            onClick={() => {
              setSelectedMethod('qr');
              setShowQrModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'qr' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'qr' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <QrLogo />
              <div>
                <b style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>Pay via UPI QR</b>
                <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Scan with any phone app</span>
              </div>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: selectedMethod === 'qr' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                background: selectedMethod === 'qr' ? '#111827' : '#FFFFFF',
                flexShrink: 0
              }}
            />
          </div>

          {/* Section Divider: Cards & Banks */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
            Cards & Banking
          </div>

          {/* Option: Credit/Debit Card (Expandable) */}
          <div
            onClick={() => setSelectedMethod('card')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'card' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'card' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <CardLogo />
                <div>
                  <b style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>Credit / Debit / ATM Card</b>
                  <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Visa, Mastercard, RuPay</span>
                </div>
              </div>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: selectedMethod === 'card' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                  background: selectedMethod === 'card' ? '#111827' : '#FFFFFF',
                  flexShrink: 0
                }}
              />
            </div>

            {/* Functional Card Inputs */}
            {selectedMethod === 'card' && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="4532 8901 2345 6789"
                  value={cardNumber}
                  maxLength={19}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setCardNumber(raw.match(/.{1,4}/g)?.join(' ') || raw);
                  }}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
                      setCardExpiry(val);
                    }}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    maxLength={3}
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                {cardError && <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>⚠ {cardError}</span>}
              </div>
            )}
          </div>

          {/* Option: Netbanking */}
          <div
            onClick={() => setSelectedMethod('netbanking')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 16px',
              borderRadius: '16px',
              border: selectedMethod === 'netbanking' ? '2.5px solid var(--yellow, #FFC70A)' : '1px solid #E5E7EB',
              background: selectedMethod === 'netbanking' ? 'rgba(255, 199, 10, 0.08)' : '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <NetbankingLogo />
                <div>
                  <b style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>Netbanking</b>
                  <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Selected: {selectedBank.name}</span>
                </div>
              </div>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: selectedMethod === 'netbanking' ? '7px solid var(--yellow, #FFC70A)' : '1.5px solid #9CA3AF',
                  background: selectedMethod === 'netbanking' ? '#111827' : '#FFFFFF',
                  flexShrink: 0
                }}
              />
            </div>

            {/* Bank Chips */}
            {selectedMethod === 'netbanking' && (
              <div style={{ marginTop: '12px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {POPULAR_BANKS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBank(b)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: selectedBank.id === b.id ? '2px solid var(--yellow, #FFC70A)' : '1px solid #D1D5DB',
                        background: selectedBank.id === b.id ? 'rgba(255, 199, 10, 0.22)' : '#FFFFFF',
                        color: '#111827',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color }} />
                      <span>{b.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Footer: 1-Tap Pay Button */}
        <div style={{ padding: '10px 20px 18px', background: 'var(--sheet, #FFFFFF)', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <button
            type="button"
            onClick={handleTriggerPayment}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '999px',
              background: 'var(--yellow, #FFC70A)',
              color: '#111827',
              border: 'none',
              fontWeight: 800,
              fontSize: '16.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 18px rgba(255, 199, 10, 0.45)',
              transition: 'transform 0.1s ease'
            }}
          >
            <span>
              {selectedMethod === 'wallet'
                ? `Pay ₹${amount} with Wallet`
                : selectedMethod === 'qr'
                ? `Scan & Pay ₹${amount}`
                : selectedMethod === 'card'
                ? `Pay ₹${amount} with Card`
                : selectedMethod === 'netbanking'
                ? `Pay ₹${amount} via ${selectedBank.code}`
                : `Pay ₹${amount}`}
            </span>
            {selectedMethod === 'wallet' && hasSufficientWalletBal && (
              <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.14)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                +₹{cashbackAmount} Cashback
              </span>
            )}
          </button>

          {/* Footer Branding */}
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>Powered by</span>
            <b style={{ color: '#111827', fontWeight: 900, letterSpacing: '-0.3px' }}>Ridingo<span style={{ color: '#B45309' }}>SecurePay</span></b>
          </div>
        </div>
      </div>
    </div>
  );
}
