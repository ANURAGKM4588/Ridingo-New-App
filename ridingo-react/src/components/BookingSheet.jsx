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

// Dynamic date & time helpers
const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultTime = () => {
  const d = new Date();
  const m = d.getMinutes();
  const rem = m % 15;
  d.setMinutes(m + (rem === 0 ? 15 : (15 - rem)));
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
};

const formatTime12h = (time24) => {
  if (!time24) return '6:00 PM';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

const formatDateDisplay = (dateISO) => {
  if (!dateISO) return '';
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  const parts = dateISO.split('-').map(Number);
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
  const monthName = dateObj.toLocaleDateString('en-IN', { month: 'short' });
  const d = parts[2];
  const y = parts[0];

  if (dateISO === today) {
    return `Today (${dayName}, ${d} ${monthName})`;
  } else if (dateISO === tomorrow) {
    return `Tomorrow (${dayName}, ${d} ${monthName})`;
  } else {
    return `${dayName}, ${d} ${monthName} ${y}`;
  }
};

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
  const [selectedDate, setSelectedDate] = useState(getTodayISO);
  const [selectedTime, setSelectedTime] = useState(getDefaultTime);
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
      setSelectedDate(prev => {
        const today = getTodayISO();
        return prev < today ? today : prev;
      });
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

  const todayISO = getTodayISO();
  const tomorrowISO = getTomorrowISO();
  const isToday = selectedDate === todayISO;
  const isTomorrow = selectedDate === tomorrowISO;
  const isCustomDate = !isToday && !isTomorrow;

  const dateStr = formatDateDisplay(selectedDate);
  const timeStr = formatTime12h(selectedTime);

  const addMinutesToTime = (minutes) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    setSelectedTime(`${h}:${m}`);
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
        notes: {
          scheduled_date: dateStr,
          scheduled_time: timeStr
        },
        onSuccess: (paymentRes) => {
          const pId = paymentRes?.razorpay_payment_id || ('pay_' + Date.now().toString(36));
          const methodLabel = paymentRes?.method || 'UPI';
          setBookingOpen(false);
          bookRide(cat, qty, pickupLoc, dropLoc, fare, adv, pId, { date: dateStr, time: timeStr });
          addToast(`Paid ₹${adv} via ${methodLabel}! Chauffeur scheduled for ${dateStr} · ${timeStr}.`, 'check');
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', marginBottom: '6px' }}>
              <div className="lab" style={{ margin: 0 }}>
                Pickup date & time
              </div>
              <span style={{ fontSize: '11.5px', color: 'var(--yellow)', fontWeight: 700 }}>
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 'Scheduled'} · {timeStr}
              </span>
            </div>

            {/* Quick Date Chips */}
            <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className={`chip ${isToday ? 'on' : ''}`}
                onClick={() => setSelectedDate(todayISO)}
              >
                Today
              </button>
              <button
                type="button"
                className={`chip ${isTomorrow ? 'on' : ''}`}
                onClick={() => setSelectedDate(tomorrowISO)}
              >
                Tomorrow
              </button>
              <button
                type="button"
                className={`chip ${isCustomDate ? 'on' : ''}`}
                onClick={() => {
                  const el = document.getElementById('bk-date-input');
                  if (el) {
                    if (typeof el.showPicker === 'function') {
                      try { el.showPicker(); } catch (e) { el.focus(); }
                    } else {
                      el.focus();
                    }
                  }
                }}
              >
                {isCustomDate ? dateStr : 'Choose date...'}
              </button>
            </div>

            {/* Two-Column Interactive Inputs: Date & Time */}
            <div className="two" style={{ marginTop: '8px', gap: '10px' }}>
              {/* Date Field Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  background: 'var(--field)',
                  borderRadius: '14px',
                  border: isCustomDate ? '1.5px solid var(--yellow)' : '1px solid #E2E8F0',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '52px',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const el = document.getElementById('bk-date-input');
                  if (el && typeof el.showPicker === 'function') {
                    try { el.showPicker(); } catch (e) { el.focus(); }
                  }
                }}
              >
                <div style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Icon name="calendar" size={17} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    DATE
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dateStr}
                  </span>
                </div>
                <input
                  id="bk-date-input"
                  type="date"
                  min={todayISO}
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  aria-label="Select Pickup Date"
                />
              </div>

              {/* Time Field Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  background: 'var(--field)',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '52px',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const el = document.getElementById('bk-time-input');
                  if (el && typeof el.showPicker === 'function') {
                    try { el.showPicker(); } catch (e) { el.focus(); }
                  }
                }}
              >
                <div style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Icon name="clock" size={17} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TIME
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {timeStr}
                  </span>
                </div>
                <input
                  id="bk-time-input"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => {
                    if (e.target.value) setSelectedTime(e.target.value);
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  aria-label="Select Pickup Time"
                />
              </div>
            </div>

            {/* Quick Time Presets */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '2px'
              }}
            >
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0, fontWeight: 600 }}
                onClick={() => addMinutesToTime(10)}
              >
                ⚡ Now
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0 }}
                onClick={() => addMinutesToTime(30)}
              >
                +30m
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0 }}
                onClick={() => addMinutesToTime(60)}
              >
                +1 hour
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0 }}
                onClick={() => setSelectedTime('09:00')}
              >
                9:00 AM
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0 }}
                onClick={() => setSelectedTime('18:00')}
              >
                6:00 PM
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0 }}
                onClick={() => setSelectedTime('21:00')}
              >
                9:00 PM
              </button>
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
