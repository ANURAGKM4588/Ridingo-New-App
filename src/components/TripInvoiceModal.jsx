import React, { useState } from 'react';
import Icon from './Icon';
import { generateLivePhonePeQrUrl } from '../utils/phonepe';

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

  // Fare calculations: 30% Platform commission deducted -> Driver receives 70% earnings
  const baseFare = Number(trip?.fare) || 750;
  const driverEarningsNet = Math.round(baseFare * 0.70);
  const tipAmount = customTip !== '' ? (Number(customTip) || 0) : selectedTip;
  const totalDriverPayout = driverEarningsNet + tipAmount;

  // Live PhonePe UPI QR Code for settlement
  const qrData = generateLivePhonePeQrUrl({
    amount: totalDriverPayout,
    transactionId: trip?.id,
    note: `Ridingo Driver Settlement - ${trip?.id || 'TRP'}`
  });

  const handleSimulatePaymentSettlement = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      if (onDigitalPaymentSuccess) {
        onDigitalPaymentSuccess({
          amount: totalDriverPayout,
          fare: baseFare,
          driverEarnings: driverEarningsNet,
          tip: tipAmount,
          method: 'PhonePe QR',
          gateway: 'PhonePe Escrow'
        });
      }
    }, 1000);
  };

  const handleConfirmCashViolation = () => {
    setShowCashPenaltyDialog(false);
    onCashViolation({
      amount: totalDriverPayout,
      fare: baseFare,
      driverEarnings: driverEarningsNet,
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
          background: 'var(--sheet, #FFFFFF)',
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
        <div style={{ width: '36px', height: '4px', background: 'var(--line-strong, #E2E8F0)', borderRadius: '999px', margin: '10px auto 4px' }} />

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#16A34A', letterSpacing: '0.06em' }}>
              TRIP COMPLETE · DRIVER SETTLEMENT
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink, #0F172A)', margin: '2px 0 0' }}>
              Payment Receipt & Earnings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--field, #F1F5F9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted, #64748B)'
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          


          {/* Driver Earnings Summary Card (Shows ONLY Driver's Earnings after 30% Commission) */}
          <div style={{ background: 'var(--card, #F8FAFC)', borderRadius: '16px', padding: '16px', border: '1px solid var(--line, #E2E8F0)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13.5px' }}>
              <span style={{ color: 'var(--muted, #64748B)', fontWeight: 600 }}>Driver Net Earnings (70%)</span>
              <b style={{ color: '#16A34A', fontSize: '16px' }}>₹{driverEarningsNet}</b>
            </div>
            {tipAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#2563EB', fontWeight: 600 }}>Driver Tip (100% to Driver)</span>
                <span style={{ color: '#2563EB', fontWeight: 700 }}>+ ₹{tipAmount}</span>
              </div>
            )}
            <div style={{ height: '1px', background: 'var(--line, #E2E8F0)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <b style={{ fontSize: '15px', color: 'var(--ink, #0F172A)' }}>Driver Payout</b>
                <span style={{ fontSize: '11px', color: 'var(--muted, #64748B)', display: 'block' }}>30% platform commission deducted</span>
              </div>
              <b style={{ fontSize: '26px', fontWeight: 850, color: '#16A34A' }}>
                ₹{totalDriverPayout}
              </b>
            </div>
          </div>

          {/* Add Tips Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <b style={{ fontSize: '13px', color: 'var(--ink, #0F172A)' }}>Driver Tip</b>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>100% credited to driver</span>
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
                      border: isSelected ? '1.5px solid var(--ink, #0F172A)' : '1px solid var(--line, #E2E8F0)',
                      background: isSelected ? 'var(--solid, #0F172A)' : 'var(--card, #FFFFFF)',
                      color: isSelected ? 'var(--on-solid, #FFFFFF)' : 'var(--muted, #475569)',
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

          {/* Live PhonePe QR Code for Settlement */}
          <div
            style={{
              background: 'var(--card, #FFFFFF)',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid var(--line, #E2E8F0)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              <b style={{ fontSize: '13px', color: 'var(--ink, #0F172A)' }}>Scan PhonePe UPI QR Code</b>
            </div>

            {/* Live QR Image */}
            <div
              style={{
                padding: '12px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--line, #F1F5F9)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                cursor: 'pointer'
              }}
              onClick={handleSimulatePaymentSettlement}
              title="Tap to verify/simulate PhonePe settlement"
            >
              <img
                src={qrData.qrImageUrl}
                alt="PhonePe UPI QR"
                style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)', marginTop: '10px' }}>
              Scan with GPay, PhonePe, Paytm, CRED or Navi
            </span>
          </div>
        </div>

        {/* Footer Payment Settlement & Dismiss Buttons */}
        <div style={{ padding: '16px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))', borderTop: '1px solid var(--line, #F1F5F9)', background: 'var(--sheet, #FFFFFF)' }}>
          <button
            type="button"
            disabled={isProcessingPayment}
            onClick={handleSimulatePaymentSettlement}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              background: '#000000',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: isProcessingPayment ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              opacity: isProcessingPayment ? 0.7 : 1
            }}
          >
            {isProcessingPayment ? (
              <span>Settling Payment...</span>
            ) : (
              <>
                <Icon name="check" size={18} color="#FFFFFF" />
                <span>Payment Received · Settle ₹{totalDriverPayout}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '10px',
              borderRadius: '12px',
              background: 'transparent',
              color: 'var(--muted, #64748B)',
              fontSize: '13px',
              fontWeight: 650,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            Dismiss for now
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
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'var(--card, #FFFFFF)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '340px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '1px solid var(--line, rgba(255,255,255,0.1))'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bad-soft, #FEE2E2)', color: 'var(--bad, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Icon name="alert" size={24} color="var(--bad, #DC2626)" />
            </div>
            <b style={{ fontSize: '17px', color: 'var(--ink, #0F172A)', display: 'block', marginBottom: '8px' }}>
              Confirm Cash Violation?
            </b>
            <p style={{ fontSize: '13px', color: 'var(--muted, #64748B)', lineHeight: 1.45, margin: '0 0 20px' }}>
              Accepting cash is a direct policy violation. You will receive <b>1 Black Mark</b> on your driver profile.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCashPenaltyDialog(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--field, #F1F5F9)',
                  border: 'none',
                  color: 'var(--muted, #475569)',
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
                  background: 'var(--bad, #DC2626)',
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
