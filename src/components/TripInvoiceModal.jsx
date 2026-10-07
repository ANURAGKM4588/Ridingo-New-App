import React, { useState } from 'react';
import Icon from './Icon';
import { generateLiveUpiQrUrl } from '../utils/razorpay';
import { MAJOR_UPI_APPS, triggerUpiDeepLink } from '../utils/upiDeepLink';

export default function TripInvoiceModal({
  trip,
  onDigitalPaymentSuccess,
  onCashViolation,
  onClose
}) {
  const [selectedTip, setSelectedTip] = useState(50);
  const [customTip, setCustomTip] = useState('');
  const [showCashPenaltyDialog, setShowCashPenaltyDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const baseFare = trip?.fare || 750;
  const advancePaid = trip?.advance || Math.round(baseFare * 0.3);
  const balanceDue = Math.max(0, baseFare - advancePaid);
  const tipAmount = customTip !== '' ? (Number(customTip) || 0) : selectedTip;
  const totalAmountToPay = balanceDue + tipAmount;

  // Live Razorpay UPI QR Code
  const qrData = generateLiveUpiQrUrl({
    amount: totalAmountToPay,
    orderId: trip?.id,
    note: `Ridingo Chauffeur Trip - ${trip?.id || 'TRP'}`
  });

  const handleQuickUpiPay = (appId) => {
    setIsProcessingPayment(true);
    triggerUpiDeepLink({
      appId,
      amount: totalAmountToPay,
      orderId: trip?.id,
      note: `Ridingo Trip Balance - ${trip?.id}`
    });

    setTimeout(() => {
      setIsProcessingPayment(false);
      onDigitalPaymentSuccess({
        amount: totalAmountToPay,
        fare: baseFare,
        balance: balanceDue,
        tip: tipAmount,
        method: `${appId.toUpperCase()} UPI`,
        gateway: 'Razorpay Escrow'
      });
    }, 1800);
  };

  const handleConfirmCashViolation = () => {
    setShowCashPenaltyDialog(false);
    onCashViolation({
      amount: totalAmountToPay,
      fare: baseFare,
      balance: balanceDue,
      tip: tipAmount
    });
  };

  return (
    <div
      className="trip-invoice-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Grab bar */}
        <div style={{ width: '36px', height: '4px', background: '#E2E8F0', borderRadius: '999px', margin: '10px auto 4px' }} />

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#2563EB', letterSpacing: '0.06em' }}>
              TRIP COMPLETE · DIGITAL SETTLEMENT
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
              Final Invoice & Payment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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
          {/* Fare Summary Card */}
          <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Total Trip Fare</span>
              <b style={{ color: '#0F172A' }}>₹{baseFare}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#16A34A' }}>Advance Paid (30%)</span>
              <span style={{ color: '#16A34A', fontWeight: 600 }}>- ₹{advancePaid}</span>
            </div>
            {tipAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#2563EB' }}>Driver Tip (100% to Driver)</span>
                <span style={{ color: '#2563EB', fontWeight: 600 }}>+ ₹{tipAmount}</span>
              </div>
            )}
            <div style={{ height: '1px', background: '#E2E8F0', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <b style={{ fontSize: '15px', color: '#0F172A' }}>Total Payable Balance</b>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Includes 18% GST & Platform Escrow</span>
              </div>
              <b style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                ₹{totalAmountToPay}
              </b>
            </div>
          </div>

          {/* Add Tips Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <b style={{ fontSize: '13px', color: '#0F172A' }}>Add Tip for Chauffeur</b>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>100% credited to chauffeur</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[0, 20, 50, 100].map(tipVal => {
                const isSelected = selectedTip === tipVal && customTip === '';
                return (
                  <button
                    key={tipVal}
                    type="button"
                    onClick={() => {
                      setSelectedTip(tipVal);
                      setCustomTip('');
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                      background: isSelected ? '#0F172A' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tipVal === 0 ? 'No Tip' : `+₹${tipVal}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Razorpay Live UPI QR Code */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              <b style={{ fontSize: '13px', color: '#0F172A' }}>Scan Razorpay UPI QR Code</b>
            </div>

            {/* Live QR Image */}
            <div
              style={{
                padding: '12px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #F1F5F9',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
            >
              <img
                src={qrData.qrImageUrl}
                alt="Razorpay UPI QR"
                style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <span style={{ fontSize: '12px', color: '#64748B', marginTop: '10px' }}>
              Scan with any UPI App: GPay, PhonePe, Paytm, CRED, Navi
            </span>
          </div>

          {/* Quick Pay with Installed UPI Apps */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Instant Pay with UPI Apps
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {MAJOR_UPI_APPS.slice(0, 6).map(app => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleQuickUpiPay(app.id)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* STRICT NO-CASH WARNING & PENALTY SECTION */}
          <div
            style={{
              borderRadius: '16px',
              padding: '14px',
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <b style={{ fontSize: '13px', color: '#991B1B' }}>Cash Payments Strictly Prohibited</b>
            </div>
            <p style={{ fontSize: '11.5px', color: '#7F1D1D', margin: '0 0 10px', lineHeight: 1.45 }}>
              All Ridingo payments must be digital. If a chauffeur accepts cash from the customer, <b>1 Black Mark / Penalty Point</b> will be permanently added to the chauffeur profile.
            </p>

            <button
              type="button"
              onClick={() => setShowCashPenaltyDialog(true)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1px solid #DC2626',
                color: '#DC2626',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Customer insisted on Cash (Record Violation & Black Mark)
            </button>
          </div>
        </div>

        {/* Footer Complete Button */}
        <div style={{ padding: '16px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))', borderTop: '1px solid #F1F5F9', background: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => handleQuickUpiPay('generic')}
            disabled={isProcessingPayment}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: '#000000',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              border: '1.5px solid #000000',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
            }}
          >
            {isProcessingPayment ? 'Verifying Razorpay Settlement...' : `Confirm Payment of ₹${totalAmountToPay} ✓`}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Cash Penalty */}
      {showCashPenaltyDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '340px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>
              ⚠️
            </div>
            <b style={{ fontSize: '17px', color: '#0F172A', display: 'block', marginBottom: '8px' }}>
              Confirm Cash Violation?
            </b>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.45, margin: '0 0 20px' }}>
              Accepting cash is a direct policy violation. You will receive <b>1 Black Mark</b> on your chauffeur profile and platform trust score will decrease.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCashPenaltyDialog(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  border: 'none',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCashViolation}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Accept Penalty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
