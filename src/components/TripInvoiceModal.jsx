import React, { useState } from 'react';
import Icon from './Icon';
import { generateLivePhonePeQrUrl } from '../utils/phonepe';
import { generateTripInvoiceText } from '../utils/tripInvoiceSharing';

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

  // Dynamic Fare Calculations:
  // totalFare = baseFare + (extraKm * ratePerKm) + (billableWaitingMinutes * ratePerMinute);
  const extraKm = Number(trip?.extensionDistanceKm) || 0;
  const ratePerKm = Number(trip?.ratePerKm) || 18;
  const extensionFare = Number(trip?.extensionFare) || Math.round(extraKm * ratePerKm);

  const waitingSeconds = Number(trip?.waitingSeconds) || 0;
  const billableWaitingMinutes = Number(trip?.billableWaitingMinutes) || Math.max(0, Math.ceil((waitingSeconds - 3600) / 60));
  const waitingRatePerMin = Number(trip?.waitingRatePerMin) || 2;
  const waitingFare = Number(trip?.waitingFare) || (billableWaitingMinutes * waitingRatePerMin);

  const baseFare = Number(trip?.originalBaseFare) || (Number(trip?.fare) ? Math.max(0, Number(trip?.fare) - extensionFare - waitingFare) : 600);
  const totalTripFare = baseFare + extensionFare + waitingFare;
  const advancePaid = Number(trip?.advance) || 0;
  const balancePayable = Math.max(0, totalTripFare - advancePaid);

  // Platform commission 30% -> Driver receives 70% earnings
  const driverEarningsNet = Math.round(totalTripFare * 0.70);
  const tipAmount = customTip !== '' ? (Number(customTip) || 0) : selectedTip;
  const totalDriverPayout = driverEarningsNet + tipAmount;

  // Registered Customer & Driver Details
  const customerName = trip?.rider?.name || trip?.userName || 'Customer';
  const customerPhone = trip?.rider?.phone || trip?.userPhone || trip?.phone || '+91 98470 12345';
  const customerEmail = trip?.rider?.email || trip?.userEmail || trip?.email || 'customer@ridingo.app';
  const driverName = trip?.driver || trip?.car?.driverName || 'Verified Partner';
  const driverPhone = trip?.driverPhone || trip?.car?.driverPhone || '';

  const invoiceData = {
    trip,
    baseFare,
    extraKm,
    ratePerKm,
    extensionFare,
    waitingSeconds,
    billableWaitingMinutes,
    waitingRatePerMin,
    waitingFare,
    totalTripFare,
    advancePaid,
    balancePaid: balancePayable,
    driverName,
    driverPhone,
    riderName: customerName,
    riderPhone: customerPhone,
    riderEmail: customerEmail,
    paymentMethod: 'PhonePe Digital UPI'
  };

  const invoiceText = generateTripInvoiceText(invoiceData);

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
          fare: totalTripFare,
          baseFare: baseFare,
          extensionDistanceKm: extraKm,
          extensionFare: extensionFare,
          waitingMinutes: billableWaitingMinutes,
          waitingFare: waitingFare,
          driverEarnings: driverEarningsNet,
          tip: tipAmount,
          advancePaid: advancePaid,
          balancePaid: balancePayable,
          method: 'PhonePe QR',
          gateway: 'PhonePe Escrow',
          invoiceText: invoiceText,
          sharedToPhone: customerPhone,
          sharedToEmail: customerEmail
        });
      }
    }, 200);
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
          


          {/* Itemized Trip Bill Breakdown */}
          <div style={{ background: 'var(--field, #F8FAFC)', borderRadius: '16px', padding: '14px 16px', border: '1px solid var(--line, #F1F5F9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted, #64748B)', letterSpacing: '0.05em' }}>
                Invoice Fare Breakdown
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted, #64748B)' }}>
                Trip #{trip?.id || 'TRP'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted, #64748B)' }}>
                <span>Base Trip Fare</span>
                <b style={{ color: 'var(--ink, #0F172A)' }}>₹{baseFare}</b>
              </div>
              {extraKm > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                    <Icon name="route" size={13} color="#16A34A" />
                    <span>Additional Trip (+{extraKm.toFixed(2)} km @ ₹{ratePerKm}/km)</span>
                  </span>
                  <b style={{ color: '#16A34A', fontSize: '12.5px' }}>+₹{extensionFare}</b>
                </div>
              )}
              {waitingSeconds > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: '10px', background: waitingFare > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: waitingFare > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: waitingFare > 0 ? '#EF4444' : '#F59E0B', fontWeight: 600 }}>
                    <Icon name="clock" size={13} color={waitingFare > 0 ? '#EF4444' : '#F59E0B'} />
                    <span>
                      Waiting Time ({Math.floor(waitingSeconds / 60)}m{billableWaitingMinutes > 0 ? ` · ${billableWaitingMinutes}m billable @ ₹${waitingRatePerMin}/m` : ' · 60m Free'})
                    </span>
                  </span>
                  <b style={{ color: waitingFare > 0 ? '#EF4444' : '#16A34A', fontSize: '12.5px' }}>
                    {waitingFare > 0 ? `+₹${waitingFare}` : 'Free'}
                  </b>
                </div>
              )}
              <div style={{ height: '1px', background: 'var(--line, #E2E8F0)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--ink, #0F172A)', fontWeight: 600 }}>Gross Trip Total</span>
                <b style={{ color: 'var(--ink, #0F172A)', fontSize: '14.5px' }}>₹{totalTripFare}</b>
              </div>
              {advancePaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563EB', fontSize: '12.5px' }}>
                  <span>Advance Already Paid</span>
                  <b>-₹{advancePaid}</b>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '2px' }}>
                <b style={{ color: 'var(--ink, #0F172A)', fontSize: '14px' }}>Net Balance Settled</b>
                <b style={{ color: '#16A34A', fontSize: '16px', fontWeight: 850 }}>₹{balancePayable}</b>
              </div>
            </div>
          </div>


          {/* Driver Earnings Summary Card (Shows ONLY Driver's Earnings after 30% Commission) */}
          <div style={{ background: 'var(--card, #FFFFFF)', borderRadius: '16px', padding: '16px', border: '1px solid var(--line, #E2E8F0)', boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)' }}>
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
            onClick={() => {
              if (isProcessingPayment) return;
              handleSimulatePaymentSettlement();
            }}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              background: 'var(--solid, #000000)',
              color: 'var(--on-solid, #FFFFFF)',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              opacity: isProcessingPayment ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            title="Payment Received · Settle"
          >
            {isProcessingPayment ? (
              <span>Settling Payment...</span>
            ) : (
              <>
                <Icon name="check" size={18} color="var(--on-solid, #FFFFFF)" />
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
