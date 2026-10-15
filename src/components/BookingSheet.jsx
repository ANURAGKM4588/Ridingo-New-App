import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import MapPickerModal from './MapPickerModal';
import { getDeviceLocation, getCachedDeviceLocation } from '../lib/deviceLocation';
import { searchPlaces } from '../lib/locationService';
import { searchGooglePlaces, calculateTripRouteAndETA } from '../services/googleMapsService';
import { openPhonePeCheckout } from '../utils/phonepe';

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
  const [trans, setTrans] = useState('Manual');
  const [airportType, setAirportType] = useState('pickup'); // 'pickup' | 'drop'
  const [flightNo, setFlightNo] = useState('');
  const [driverEarlyBuffer, setDriverEarlyBuffer] = useState('30m'); // '15m' | '30m' | '45m' | 'exact'
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedTrip, setConfirmedTrip] = useState(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState('drop');
  const [isDetectingCurrent, setIsDetectingCurrent] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [activeSuggestField, setActiveSuggestField] = useState(null); // 'pickup' | 'drop' | null
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [tripTelemetry, setTripTelemetry] = useState({
    distanceKm: 12.4,
    distanceText: '12.4 km',
    durationMins: 28,
    durationText: '28 mins',
    etaText: '30 mins away'
  });

  // Dynamically calculate Google Maps real trip distance and estimated time (ETA)
  useEffect(() => {
    let isCancelled = false;
    const calculateRoute = async () => {
      const pText = pickup?.trim() || 'Kochi City';
      const dText = drop?.trim() || (cat === 'airport' ? 'Cochin International Airport' : 'Kochi City Center');
      try {
        const res = await calculateTripRouteAndETA({
          origin: pText,
          destination: dText,
          originCoords: pickupCoords,
          destCoords: dropCoords
        });
        if (!isCancelled && res) {
          setTripTelemetry(res);
        }
      } catch (e) {
        console.warn('Route telemetry error:', e);
      }
    };

    const timer = setTimeout(calculateRoute, 350);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pickup, drop, pickupCoords, dropCoords, cat]);

  const handlePickupChange = (val) => {
    setPickup(val);
    if (val.trim()) {
      searchGooglePlaces(val, (results) => {
        setPickupSuggestions(results || []);
        setActiveSuggestField('pickup');
      });
    } else {
      setPickupSuggestions([]);
      setActiveSuggestField(null);
      setPickupCoords(null);
    }
  };

  const handleDropChange = (val) => {
    setDrop(val);
    if (val.trim()) {
      searchGooglePlaces(val, (results) => {
        setDropSuggestions(results || []);
        setActiveSuggestField('drop');
      });
    } else {
      setDropSuggestions([]);
      setActiveSuggestField(null);
      setDropCoords(null);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.loc-input-wrap') && !e.target.closest('.location-suggest-dropdown')) {
        setActiveSuggestField(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Sync category with parent selection
  useEffect(() => {
    if (bookingCategory && CATS[bookingCategory]) {
      setCat(bookingCategory);
      setQty(CATS[bookingCategory].def || 1);
    }
  }, [bookingCategory, bookingOpen]);

  // Sync destination only if explicitly selected from home search or landmark
  useEffect(() => {
    if (bookingDestination) {
      setDrop(bookingDestination);
    }
  }, [bookingDestination, bookingOpen]);

  // Reset form states when booking sheet opens - starts completely clean without preset locations
  useEffect(() => {
    if (bookingOpen) {
      setIsSuccess(false);
      setConfirmedTrip(null);
      // Clean inputs (no preset locations)
      if (!bookingDestination) {
        setDrop('');
      }
      setPickup('');
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

  // Minimal Invoice Breakdown (No tax, needful info only)
  const platformFee = 40;
  const otherFee = 30; // Safety & dispatch fee
  const tripBaseFare = Math.max(0, fare - platformFee - otherFee);
  const rateDesc = isFlat
    ? 'Fixed route rate'
    : `₹${currentCat.rate || 250}/${currentCat.unit || 'hr'}`;

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
      const cleanPickup = pickup?.trim();
      if (!cleanPickup) {
        if (addToast) addToast('Please enter pickup location or choose on map', 'alert');
        return;
      }
      const pickupLoc = cleanPickup;
      const dropLoc = (drop && drop.trim()) || (cat === 'airport' ? 'Airport Terminal' : 'As directed by passenger');

      // Trigger the new PhonePe payment options popup sheet
      openPhonePeCheckout({
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
          const pId = paymentRes?.phonepe_payment_id || paymentRes?.phonepe_transaction_id || paymentRes?.razorpay_payment_id || ('pay_ppe_' + Date.now().toString(36));
          const methodLabel = paymentRes?.method || 'PhonePe';
          setBookingOpen(false);
          bookRide(cat, qty, pickupLoc, dropLoc, fare, adv, pId, {
            date: dateStr,
            time: timeStr,
            trans,
            pickupCoords,
            dropCoords,
            flightNo: cat === 'airport' ? flightNo : null,
            airportType: cat === 'airport' ? airportType : null,
            driverEarlyBuffer: cat === 'airport' ? driverEarlyBuffer : null,
            distanceKm: tripTelemetry.distanceKm,
            distanceText: tripTelemetry.distanceText,
            durationMins: tripTelemetry.durationMins,
            durationText: tripTelemetry.durationText,
            eta: tripTelemetry.etaText
          });
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

            {/* Airport Transfer Mode, Flight Number & Early Arrival */}
            {cat === 'airport' && (
              <div
                style={{
                  background: 'var(--field)',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid var(--line)',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div>
                  <div className="lab" style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Airport Transfer Direction
                  </div>
                  <div className="seg" style={{ marginTop: '0' }}>
                    <button
                      type="button"
                      className={airportType === 'pickup' ? 'on' : ''}
                      onClick={() => {
                        setAirportType('pickup');
                        if (!pickup || !pickup.toLowerCase().includes('airport')) {
                          setPickup('Cochin International Airport (COK), Arrival Gate');
                        }
                      }}
                    >
                      Airport Pickup (Arrival)
                    </button>
                    <button
                      type="button"
                      className={airportType === 'drop' ? 'on' : ''}
                      onClick={() => {
                        setAirportType('drop');
                        setDrop('Cochin International Airport (COK), Departure Gate');
                      }}
                    >
                      Airport Drop (Departure)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="lab" style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Flight Number {airportType === 'pickup' ? '(for live flight arrival tracking)' : '(optional)'}
                  </label>
                  <input
                    className="inp"
                    placeholder="e.g. AI-504, 6E-201, IX-412"
                    value={flightNo}
                    onChange={e => setFlightNo(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--card)' }}
                  />
                </div>

                {airportType === 'pickup' && (
                  <div>
                    <label className="lab" style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Driver Arrival at Airport (Avoid waiting after flight landing)
                    </label>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {[
                        { id: '30m', label: '30m early (Recommended)' },
                        { id: '45m', label: '45m early' },
                        { id: '15m', label: '15m early' },
                        { id: 'exact', label: 'At landing' }
                      ].map(buf => (
                        <button
                          key={buf.id}
                          type="button"
                          className={`chip ${driverEarlyBuffer === buf.id ? 'on' : ''}`}
                          style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px', flexShrink: 0, whiteSpace: 'nowrap' }}
                          onClick={() => setDriverEarlyBuffer(buf.id)}
                        >
                          {buf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  color: 'var(--ink)',
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
            <div className="loc-input-wrap" style={{ position: 'relative' }}>
              <input
                className="inp"
                id="bk-pickup"
                placeholder="Where should the driver meet you?"
                value={pickup}
                onChange={e => handlePickupChange(e.target.value)}
                onFocus={() => {
                  if (pickup.trim() && pickupSuggestions.length > 0) setActiveSuggestField('pickup');
                }}
                autoComplete="off"
              />
              <button
                className="loc-map-btn"
                type="button"
                title="Choose on map"
                onClick={() => {
                  setActiveSuggestField(null);
                  openMap('pickup');
                }}
              >
                <Icon name="pin" size={16} />
              </button>

              {/* Minimal Location Dropdown with filled pin icon */}
              {activeSuggestField === 'pickup' && pickupSuggestions.length > 0 && (
                <div className="location-suggest-dropdown">
                  {pickupSuggestions.slice(0, 5).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="loc-suggest-item"
                      onClick={() => {
                        const fullLoc = item.title + (item.sub ? `, ${item.sub}` : '');
                        setPickup(fullLoc);
                        if (item.lat && item.lng) {
                          setPickupCoords({ lat: item.lat, lng: item.lng, name: item.title });
                        }
                        setActiveSuggestField(null);
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--field)',
                          color: 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 34" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.63-5.37-12-12-12z" />
                          <circle cx="12" cy="11.5" r="4.2" fill="var(--surface, #FFFFFF)" />
                        </svg>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </b>
                        {item.sub && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.sub}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination (optional) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', marginBottom: '4px' }}>
              <label className="lab" htmlFor="bk-drop" style={{ margin: 0 }}>
                Destination (optional)
              </label>
              <button
                type="button"
                onClick={() => {
                  setActiveSuggestField(null);
                  openMap('drop');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink)',
                  opacity: 0.9,
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
            <div className="loc-input-wrap" style={{ position: 'relative' }}>
              <input
                className="inp"
                id="bk-drop"
                placeholder="Add if you know it"
                value={drop}
                onChange={e => handleDropChange(e.target.value)}
                onFocus={() => {
                  if (drop.trim() && dropSuggestions.length > 0) setActiveSuggestField('drop');
                }}
                autoComplete="off"
              />
              <button
                className="loc-map-btn"
                type="button"
                title="Choose on map"
                onClick={() => {
                  setActiveSuggestField(null);
                  openMap('drop');
                }}
              >
                <Icon name="pin" size={16} />
              </button>

              {/* Minimal Location Dropdown with filled pin icon */}
              {activeSuggestField === 'drop' && dropSuggestions.length > 0 && (
                <div className="location-suggest-dropdown">
                  {dropSuggestions.slice(0, 5).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="loc-suggest-item"
                      onClick={() => {
                        const fullLoc = item.title + (item.sub ? `, ${item.sub}` : '');
                        setDrop(fullLoc);
                        if (item.lat && item.lng) {
                          setDropCoords({ lat: item.lat, lng: item.lng, name: item.title });
                        }
                        setActiveSuggestField(null);
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--field)',
                          color: 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 34" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.63-5.37-12-12-12z" />
                          <circle cx="12" cy="11.5" r="4.2" fill="var(--surface, #FFFFFF)" />
                        </svg>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </b>
                        {item.sub && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.sub}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Real Google Maps Total Distance & Estimated Travel Time (ETA) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--field)',
                borderRadius: '16px',
                padding: '10px 14px',
                marginTop: '12px',
                marginBottom: '10px',
                border: '1px solid var(--line)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📍</span>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 750, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Total Distance
                  </span>
                  <b style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                    {tripTelemetry.distanceText}
                  </b>
                </div>
              </div>

              <div style={{ width: '1px', height: '28px', background: 'var(--line)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⏱️</span>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 750, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Estimated Time (ETA)
                  </span>
                  <b style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>
                    ~{tripTelemetry.durationText}
                  </b>
                </div>
              </div>
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
                    style={{
                      background: 'var(--field)',
                      color: 'var(--ink)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      cursor: qty <= (currentCat.min || 1) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                      opacity: qty <= (currentCat.min || 1) ? 0.4 : 1,
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <Icon name="minus" size={18} />
                  </button>
                  <b style={{ color: 'var(--ink)' }}>
                    {qty} {qty === 1 ? currentCat.unit : currentCat.units}
                  </b>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={qty >= (currentCat.max || 12)}
                    aria-label="More"
                    style={{
                      background: 'var(--field)',
                      color: 'var(--ink)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      cursor: qty >= (currentCat.max || 12) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                      opacity: qty >= (currentCat.max || 12) ? 0.4 : 1,
                      display: 'grid',
                      placeItems: 'center'
                    }}
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
              <span style={{ fontSize: '11.5px', color: 'var(--ink)', fontWeight: 700 }}>
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 'Scheduled'} · {timeStr}
              </span>
            </div>

            {/* Quick Date & Time Presets Inline */}
            <div
              className="chips"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '2px'
              }}
            >
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
                className="chip"
                style={{ fontSize: '12px', padding: '5px 12px', flexShrink: 0 }}
                onClick={() => addMinutesToTime(10)}
              >
                Now
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '12px', padding: '5px 12px', flexShrink: 0 }}
                onClick={() => addMinutesToTime(30)}
              >
                +30m
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '12px', padding: '5px 12px', flexShrink: 0 }}
                onClick={() => addMinutesToTime(60)}
              >
                +1h
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '12px', padding: '5px 12px', flexShrink: 0 }}
                onClick={() => addMinutesToTime(120)}
              >
                +2h
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
                  border: isCustomDate ? '1.5px solid var(--ink)' : '1px solid var(--line)',
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
                <div style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
                  border: '1px solid var(--line)',
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
                <div style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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

            {/* Minimal Trip Invoice (Needful info only, no tax) */}
            <div
              style={{
                marginTop: '18px',
                background: 'var(--field, #F8FAFC)',
                border: '1px solid var(--line, #E2E8F0)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted, #64748B)' }}>
                  Fare Breakdown
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--ink, #000000)',
                    background: 'var(--card, #FFFFFF)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line, #E2E8F0)'
                  }}
                >
                  {isFlat ? 'Flat route' : `${qty} ${qty > 1 ? currentCat.units : currentCat.unit}`}
                </span>
              </div>

              {/* Chauffeur Trip Fare */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--ink, #0F172A)', fontWeight: 600 }}>
                    Chauffeur trip fare
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted, #64748B)', marginTop: '1px' }}>
                    Rate: {rateDesc}
                  </span>
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                  ₹{tripBaseFare}
                </span>
              </div>

              {/* Platform Fee */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--ink, #0F172A)', fontWeight: 600 }}>
                    Platform fee
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted, #64748B)', marginTop: '1px' }}>
                    App service & 24/7 matching
                  </span>
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                  ₹{platformFee}
                </span>
              </div>

              {/* Other Fee (Not tax) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--ink, #0F172A)', fontWeight: 600 }}>
                    Safety & dispatch fee
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted, #64748B)', marginTop: '1px' }}>
                    Ride safety & operational dispatch
                  </span>
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0F172A)', fontFamily: 'var(--font-mono, monospace)' }}>
                  ₹{otherFee}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--line, #E2E8F0)', margin: '2px 0 0' }} />

              {/* Total Fare */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink, #000000)' }}>
                    Total Trip Fare
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted, #64748B)', marginTop: '1px' }}>
                    Driver gets ₹{remaining} after trip
                  </span>
                </div>
                <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink, #000000)', fontFamily: 'var(--font-mono, monospace)' }}>
                  ₹{fare}
                </span>
              </div>
            </div>

            </div>

            {/* Sticky Bottom Action Footer (Always visible & accessible) */}
            <div
              className="sheet-sticky-foot"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              {/* Left Side: Now paying amount (prominent and big) + Total fare */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--muted, #64748B)',
                    display: 'block'
                  }}
                >
                  Pay now (30%)
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '1px' }}>
                  <span
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      color: 'var(--ink, #000000)',
                      letterSpacing: '-0.03em',
                      fontFamily: 'var(--font-mono, monospace)',
                      lineHeight: 1
                    }}
                  >
                    ₹{adv}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted, #64748B)',
                    fontWeight: 600,
                    marginTop: '3px'
                  }}
                >
                  Total: <b style={{ color: 'var(--ink, #000000)', fontWeight: 750 }}>₹{fare}</b>
                </span>
              </div>

              {/* Right Side: Action Button */}
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn primary"
                  id="bk-submit-btn"
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    padding: '0 22px',
                    fontWeight: 800,
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    background: 'var(--solid, #000000)',
                    color: 'var(--on-solid, #FFFFFF)',
                    border: '1.5px solid var(--solid, #000000)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={handleSubmit}
                >
                  <span>Pay Advance</span>
                  <span style={{ color: 'var(--on-solid, #FFFFFF)', fontSize: '15px' }}>➔</span>
                </button>
              </div>
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
