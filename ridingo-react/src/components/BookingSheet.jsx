import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import MapPickerModal from './MapPickerModal';
import { getDeviceLocation, getCachedDeviceLocation } from '../lib/deviceLocation';
import { openRazorpayCheckout } from '../utils/razorpay';

const CATS = {
  hourly: { name: 'Hourly', icon: 'clock', unit: 'hr', units: 'hours', min: 2, max: 12, def: 3, rate: 250 },
  daily: { name: 'Full day', icon: 'sun', unit: 'day', units: 'days', min: 1, max: 7, def: 1, rate: 1800 },
  airport: { name: 'Airport', icon: 'plane', flat: 900 },
  outstation: { name: 'Outstation', icon: 'route', unit: 'day', units: 'days', min: 1, max: 10, def: 2, rate: 2200 },
  event: { name: 'Night & events', icon: 'moon', unit: 'hr', units: 'hours', min: 4, max: 10, def: 4, rate: 350 }
};

const CAT_KEYS = ['hourly', 'daily', 'airport', 'outstation', 'event'];

export default function BookingSheet() {
  const {
    bookingOpen,
    setBookingOpen,
    bookingCategory,
    setBookingCategory,
    bookingDestination,
    user,
    userBalance,
    setUtx,
    bookRide,
    addToast
  } = useApp();

  const [cat, setCat] = useState('hourly');
  const [qty, setQty] = useState(3);
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [dateType, setDateType] = useState('today'); // 'today' | 'tomorrow'
  const [trans, setTrans] = useState('Automatic');
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedTrip, setConfirmedTrip] = useState(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState('drop');
  const [isDetectingCurrent, setIsDetectingCurrent] = useState(false);

  // Sync category with parent selection
  useEffect(() => {
    if (bookingCategory && CATS[bookingCategory]) {
      setCat(bookingCategory);
      setQty(CATS[bookingCategory].def || 1);
      if (bookingCategory === 'airport') {
        setDrop('Cochin International Airport (COK)');
      }
    }
  }, [bookingCategory, bookingOpen]);

  // Sync destination if selected from home search or landmark
  useEffect(() => {
    if (bookingDestination) {
      setDrop(bookingDestination);
    }
  }, [bookingDestination, bookingOpen]);

  // Auto-detect strict device location on booking sheet open if pickup is empty
  useEffect(() => {
    if (bookingOpen && !pickup) {
      const cached = getCachedDeviceLocation();
      if (cached?.address) {
        setPickup(cached.address);
      } else {
        getDeviceLocation(false).then(loc => {
          if (loc?.address) setPickup(loc.address);
        }).catch(() => {});
      }
    }
  }, [bookingOpen]);

  // Reset form states when booking sheet opens
  useEffect(() => {
    if (bookingOpen) {
      setIsSuccess(false);
      setConfirmedTrip(null);
    }
  }, [bookingOpen]);

  const handleUseCurrentLocation = async () => {
    setIsDetectingCurrent(true);
    addToast('Acquiring device GPS...', 'crosshair');

    try {
      const loc = await getDeviceLocation(true);
      if (loc && loc.address) {
        setPickup(loc.address);
        const short = loc.address.split(',')[0].trim();
        addToast(`Pickup set to device location: ${short}`, 'check');
      } else {
        addToast('Could not resolve device address', 'alert');
      }
    } catch (err) {
      console.warn('GPS location error:', err);
      addToast('GPS unavailable. Please check location permissions.', 'alert');
    } finally {
      setIsDetectingCurrent(false);
    }
  };

  const currentCat = CATS[cat] || CATS.hourly;
  const isFlat = !!currentCat.flat;

  // Fare & Advance calculation
  const fare = isFlat ? currentCat.flat : (currentCat.rate || 250) * qty;
  const adv = Math.ceil(fare * 0.3);
  const remaining = fare - adv;
  const cashbackAmount = Math.max(1, Math.round(adv * 0.05));
  const cleanBalance = Math.max(0, Number(userBalance) || 0);
  const hasSufficientWalletBal = cleanBalance >= adv;

  const handleQtyChange = (delta) => {
    setQty(prev => {
      const next = prev + delta;
      if (next < (currentCat.min || 1)) return prev;
      if (next > (currentCat.max || 12)) return prev;
      return next;
    });
  };

  const handleCategorySelect = (selectedKey) => {
    setCat(selectedKey);
    setBookingCategory(selectedKey);
    const c = CATS[selectedKey];
    setQty(c.def || 1);
    if (selectedKey === 'airport') {
      setDrop('Cochin International Airport (COK)');
    }
  };

  const handleMapSelect = (addr) => {
    if (mapPickerTarget === 'pickup') {
      setPickup(addr);
      addToast(`Pickup set: ${addr.split(',')[0]}`, 'check');
    } else {
      setDrop(addr);
      addToast(`Destination set: ${addr.split(',')[0]}`, 'check');
    }
    setMapPickerOpen(false);
  };

  const openMap = (target) => {
    setMapPickerTarget(target);
    setMapPickerOpen(true);
  };

  const handleSubmit = () => {
    try {
      const cached = getCachedDeviceLocation();
      const pickupLoc = (pickup && pickup.trim()) || cached?.address || 'Edappally Toll, Kochi';
      const dropLoc = (drop && drop.trim()) || (cat === 'airport' ? 'Cochin International Airport (COK)' : 'City Route');

      // Trigger the new payment options popup sheet
      openRazorpayCheckout({
        amount: adv,
        fare: fare,
        category: currentCat.name,
        qty: qty,
        unit: qty === 1 ? currentCat.unit : currentCat.units,
        pickup: pickupLoc,
        drop: dropLoc,
        prefill: {
          name: user?.name || 'ANURAG',
          contact: user?.phone || '8156938843'
        },
        onSuccess: (paymentRes) => {
          const pId = paymentRes?.razorpay_payment_id || ('pay_' + Date.now().toString(36));
          const methodLabel = paymentRes?.method || 'UPI';
          setBookingOpen(false);
          bookRide(cat, qty, pickupLoc, dropLoc, fare, adv, pId);
          addToast(`Paid ₹${adv} via ${methodLabel}! Chauffeur request dispatched.`, 'check');
        },
        onDismiss: () => {
          // User closed payment sheet
        }
      });
    } catch (err) {
      console.error('Ride checkout initiation error:', err);
      addToast('Unable to open payment sheet. Please try again.', 'alert');
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setConfirmedTrip(null);
    setBookingOpen(false);
  };

  const dateStr = dateType === 'today' ? '5 Oct 2026' : '6 Oct 2026';
  const timeStr = '6:00 PM';

  if (!bookingOpen) return null;

  return (
    <div className="layer on" id="u-layer">
      <div className="scrim" onClick={handleClose} />

      <div className="sheet" role="dialog" aria-modal="true">
        {isSuccess && confirmedTrip ? (
          /* ---------- Request Sent Confirmation View ---------- */
          <div className="sheet-scroll-body" style={{ padding: '20px 20px 36px' }}>
            <div className="grab" />
            <div className="ok">
              <span className="ok-ic">
                <Icon name="check" size={32} />
              </span>
              <h3>Request sent</h3>
              <p>We sent your request to drivers near you. You will get a notification when a driver accepts.</p>

              <div className="cbwin">
                <Icon name="gift" size={20} /> You got ₹{confirmedTrip.cashback} cashback
              </div>

              <div className="kv" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <div>
                  <span>Trip ID</span>
                  <b>{confirmedTrip?.id || 'TRP-1090'}</b>
                </div>
                <div>
                  <span>When</span>
                  <b>{dateStr} · {timeStr}</b>
                </div>
                <div>
                  <span>Advance paid</span>
                  <b>₹{confirmedTrip?.advance || adv}</b>
                </div>
                <div>
                  <span>Wallet balance</span>
                  <b>₹{(Number(userBalance) || 0).toLocaleString('en-IN')}</b>
                </div>
              </div>

              <button className="btn solid block" onClick={handleClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Booking Details Form (Matching User's Reference Screenshot) ---------- */
          <>
            {/* Sticky Header: Top Grab Bar + Title + Close Button */}
            <div className="sheet-sticky-top">
              <div className="grab" />
              <div className="sheet-h">
                <h3>Book a driver</h3>
                <button className="iconbtn" onClick={handleClose} aria-label="Close">
                  <Icon name="x" size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body: All details with smooth scroll animation */}
            <div className="sheet-scroll-body">

            {/* Category Chips - Horizontal Scrolling Style */}
            <div
              className="chips"
              id="bk-cats"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '4px'
              }}
            >
              {CAT_KEYS.map(k => (
                <button
                  key={k}
                  className={`chip ${cat === k ? 'on' : ''}`}
                  style={{
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => handleCategorySelect(k)}
                >
                  {CATS[k].name}
                </button>
              ))}
            </div>

            {/* Pickup Location with 1-tap Current Location */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', marginBottom: '4px' }}>
              <label className="lab" htmlFor="bk-pickup" style={{ margin: 0 }}>
                Pickup location
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--yellow)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Icon name="crosshair" size={13} />
                <span>{isDetectingCurrent ? 'Locating...' : 'Use current location'}</span>
              </button>
            </div>
            <div className="loc-input-wrap">
              <input
                className="inp"
                id="bk-pickup"
                placeholder="Where should the driver meet you?"
                value={pickup}
                onChange={e => setPickup(e.target.value)}
                autoComplete="off"
              />
              <button
                className="loc-map-btn"
                type="button"
                title="Choose on map"
                onClick={() => openMap('pickup')}
              >
                <Icon name="pin" size={16} />
              </button>
            </div>

            {/* Destination (optional) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', marginBottom: '4px' }}>
              <label className="lab" htmlFor="bk-drop" style={{ margin: 0 }}>
                Destination (optional)
              </label>
              <button
                type="button"
                onClick={() => openMap('drop')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Icon name="pin" size={13} />
                <span>Choose on map</span>
              </button>
            </div>
            <div className="loc-input-wrap">
              <input
                className="inp"
                id="bk-drop"
                placeholder="Add if you know it"
                value={drop}
                onChange={e => setDrop(e.target.value)}
                autoComplete="off"
              />
              <button
                className="loc-map-btn"
                type="button"
                title="Choose on map"
                onClick={() => openMap('drop')}
              >
                <Icon name="pin" size={16} />
              </button>
            </div>

            {/* Hours Stepper (Only for hourly/daily/event) */}
            {!isFlat && (
              <>
                <div className="lab" style={{ marginTop: '10px' }}>
                  {currentCat.units === 'hours' ? 'Hours' : 'Days'}
                </div>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(-1)}
                    disabled={qty <= (currentCat.min || 1)}
                    aria-label="Less"
                  >
                    <Icon name="minus" size={18} />
                  </button>
                  <b>
                    {qty} {qty === 1 ? currentCat.unit : currentCat.units}
                  </b>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={qty >= (currentCat.max || 12)}
                    aria-label="More"
                  >
                    <Icon name="plus" size={18} />
                  </button>
                </div>
              </>
            )}

            {/* Date and time */}
            <div className="lab" style={{ marginTop: '10px' }}>
              Date and time
            </div>
            <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className={`chip ${dateType === 'today' ? 'on' : ''}`}
                onClick={() => setDateType('today')}
              >
                Today
              </button>
              <button
                type="button"
                className={`chip ${dateType === 'tomorrow' ? 'on' : ''}`}
                onClick={() => setDateType('tomorrow')}
              >
                Tomorrow
              </button>
            </div>

            <div className="two" style={{ marginTop: '8px' }}>
              <input
                className="inp"
                type="text"
                value={dateStr}
                readOnly
                aria-label="Date"
                style={{ textAlign: 'center', fontWeight: 600 }}
              />
              <input
                className="inp"
                type="text"
                value={timeStr}
                readOnly
                aria-label="Time"
                style={{ textAlign: 'center', fontWeight: 600 }}
              />
            </div>

            {/* Vehicle Gearbox Segment */}
            <div className="lab" style={{ marginTop: '10px' }}>
              Vehicle gearbox
            </div>
            <div className="seg" id="bk-trans" style={{ marginTop: '6px' }}>
              {['Manual', 'Automatic', 'IMT'].map(x => (
                <button
                  key={x}
                  type="button"
                  className={trans === x ? 'on' : ''}
                  onClick={() => setTrans(x)}
                >
                  {x}
                </button>
              ))}
            </div>

            {/* Total Fare Card (.meter) */}
            <div className="meter" style={{ marginTop: '18px' }}>
              <div className="lab" style={{ letterSpacing: '0.5px' }}>
                TOTAL FARE
              </div>
              <div className="dig" style={{ color: 'var(--yellow)', fontSize: '34px', fontWeight: 800 }}>
                ₹{fare}
              </div>
              <div className="mrow">
                <span>Pay now (30%)</span>
                <b style={{ color: 'var(--yellow)' }}>₹{adv}</b>
              </div>
              <div className="mrow">
                <span>Pay driver after trip (70%)</span>
                <b style={{ color: 'var(--yellow)' }}>₹{remaining}</b>
              </div>
            </div>

            </div>

            {/* Sticky Bottom Action Footer (Always visible & accessible) */}
            <div className="sheet-sticky-foot">
              <button
                type="button"
                className="btn primary block"
                id="bk-submit-btn"
                style={{
                  width: '100%',
                  borderRadius: '20px',
                  padding: '16px',
                  fontWeight: 800,
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(255, 199, 10, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={handleSubmit}
              >
                Pay Now
              </button>
            </div>
          </>
        )}
      </div>

      <MapPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onSelect={handleMapSelect}
        targetField={mapPickerTarget}
      />
    </div>
  );
}
