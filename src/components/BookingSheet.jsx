import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import MapPickerModal from './MapPickerModal';
import { getDeviceLocation, getCachedDeviceLocation } from '../lib/deviceLocation';
import { searchPlaces } from '../lib/locationService';
import { searchGooglePlaces, calculateTripRouteAndETA, geocodeAddress, fetchPlaceDetails, initGooglePlacesAutocomplete, formatDurationMeasurement } from '../services/googleMapsService';
import { openPhonePeCheckout } from '../utils/phonepe';

const highlightMatchGoogleStock = (text, query) => {
  if (!text) return '';
  if (!query) return <span style={{ fontWeight: 400, color: 'inherit' }}>{text}</span>;
  const q = query.trim().toLowerCase();
  if (!q) return <span style={{ fontWeight: 400, color: 'inherit' }}>{text}</span>;

  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    return <span style={{ fontWeight: 400, color: 'inherit' }}>{text}</span>;
  }

  return (
    <>
      {idx > 0 && <span style={{ fontWeight: 400, color: 'inherit' }}>{text.substring(0, idx)}</span>}
      <span style={{ fontWeight: 700, color: 'var(--ink, #202124)' }}>{text.substring(idx, idx + q.length)}</span>
      <span style={{ fontWeight: 400, color: 'inherit' }}>{text.substring(idx + q.length)}</span>
    </>
  );
};

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
    addToast,
    trips,
    isUserTrip,
    setActiveTrackingTripId,
    setLiveTrackingOpen
  } = useApp();

  const activeOngoingTrip = (trips || []).find(t =>
    isUserTrip(t, user) &&
    ['requested', 'accepted', 'pickup_arrived', 'ready_to_start', 'inprogress', 'ending_otp', 'invoice_pending'].includes(t.status)
  );

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
  const [pickupDetails, setPickupDetails] = useState(null);
  const [dropDetails, setDropDetails] = useState(null);
  const pickupInputRef = useRef(null);
  const dropInputRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const [tripTelemetry, setTripTelemetry] = useState({
    distanceKm: null,
    distanceText: '--',
    durationMins: null,
    durationText: '--',
    etaText: '--',
    isCalculated: false
  });

  // Dynamically calculate Google Maps real trip distance and estimated time (ETA)
  // ONLY calculates when BOTH pickup and destination are selected with coordinates (from list, GPS, or map).
  // If user only types arbitrary text (e.g. 'kallachi') without picking from suggestions, it will NOT calculate (shows '--').
  useEffect(() => {
    let isCancelled = false;
    const pText = pickup?.trim();
    const dText = drop?.trim();

    if (!pText || !dText || !pickupCoords || !dropCoords) {
      setTripTelemetry({
        distanceKm: null,
        distanceText: '--',
        durationMins: null,
        durationText: '--',
        etaText: '--',
        isCalculated: false
      });
      return;
    }

    const calculateRoute = async () => {
      try {
        const res = await calculateTripRouteAndETA({
          origin: pText,
          destination: dText,
          originCoords: pickupCoords,
          destCoords: dropCoords
        });
        if (!isCancelled && res) {
          setTripTelemetry({
            ...res,
            isCalculated: true
          });
        }
      } catch (e) {
        console.warn('Route telemetry error:', e);
      }
    };

    const isFast = Boolean(pickupCoords && dropCoords);
    const timer = setTimeout(calculateRoute, isFast ? 50 : 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pickup, drop, pickupCoords, dropCoords]);

  // Unified Place Selection Handler: Extracts full address details and populates fields automatically
  const handleSelectPickupPlace = async (item) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setActiveSuggestField(null);
    setPickupSuggestions([]);

    const chosen = item.full || (item.title + (item.sub ? `, ${item.sub}` : ''));
    setPickup(chosen);

    if (item.place_id && !item.isMock) {
      try {
        const details = await fetchPlaceDetails(item.place_id);
        if (details?.lat && details?.lng) {
          const coords = {
            lat: Number(details.lat),
            lng: Number(details.lng),
            name: details.name || item.title,
            formatted: details.formatted_address || chosen,
            city: details.city || '',
            state: details.state || '',
            postalCode: details.postalCode || ''
          };
          setPickupCoords(coords);
          setPickupDetails(details);
          addToast(`Pickup confirmed: ${details.name || details.city || item.title}`, 'pin');
          return;
        }
      } catch (err) {
        console.warn('Place details error:', err);
      }
    }

    if (item.lat && item.lng) {
      const coords = {
        lat: Number(item.lat),
        lng: Number(item.lng),
        name: item.title,
        formatted: chosen,
        city: item.sub?.split(',')?.[0]?.trim() || '',
        state: 'Kerala'
      };
      setPickupCoords(coords);
      setPickupDetails(coords);
      addToast(`Pickup confirmed: ${item.title}`, 'pin');
    } else {
      const coords = await geocodeAddress(chosen);
      if (coords) {
        const cObj = { ...coords, name: item.title, formatted: chosen };
        setPickupCoords(cObj);
        setPickupDetails(cObj);
        addToast(`Pickup confirmed: ${item.title}`, 'pin');
      }
    }
  };

  const handleSelectDropPlace = async (item) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setActiveSuggestField(null);
    setDropSuggestions([]);

    const chosen = item.full || (item.title + (item.sub ? `, ${item.sub}` : ''));
    setDrop(chosen);

    if (item.place_id && !item.isMock) {
      try {
        const details = await fetchPlaceDetails(item.place_id);
        if (details?.lat && details?.lng) {
          const coords = {
            lat: Number(details.lat),
            lng: Number(details.lng),
            name: details.name || item.title,
            formatted: details.formatted_address || chosen,
            city: details.city || '',
            state: details.state || '',
            postalCode: details.postalCode || ''
          };
          setDropCoords(coords);
          setDropDetails(details);
          addToast(`Destination confirmed: ${details.name || details.city || item.title}`, 'pin');
          return;
        }
      } catch (err) {
        console.warn('Place details error:', err);
      }
    }

    if (item.lat && item.lng) {
      const coords = {
        lat: Number(item.lat),
        lng: Number(item.lng),
        name: item.title,
        formatted: chosen,
        city: item.sub?.split(',')?.[0]?.trim() || '',
        state: 'Kerala'
      };
      setDropCoords(coords);
      setDropDetails(coords);
      addToast(`Destination confirmed: ${item.title}`, 'pin');
    } else {
      const coords = await geocodeAddress(chosen);
      if (coords) {
        const cObj = { ...coords, name: item.title, formatted: chosen };
        setDropCoords(cObj);
        setDropDetails(cObj);
        addToast(`Destination confirmed: ${item.title}`, 'pin');
      }
    }
  };

  const handlePickupChange = (val) => {
    setPickup(val);
    setPickupCoords(null); // Clear selection until picked from dropdown list
    setPickupDetails(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const clean = (val || '').trim();
    if (clean.length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        setActiveSuggestField('pickup');
        searchGooglePlaces(
          clean,
          (results) => setPickupSuggestions(results || []),
          { userCoords: dropCoords || pickupCoords }
        );
      }, 150);
    } else {
      setPickupSuggestions([]);
      setActiveSuggestField(null);
    }
  };

  const handleDropChange = (val) => {
    setDrop(val);
    setDropCoords(null); // Clear selection until picked from dropdown list
    setDropDetails(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const clean = (val || '').trim();
    if (clean.length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        setActiveSuggestField('drop');
        searchGooglePlaces(
          clean,
          (results) => setDropSuggestions(results || []),
          { userCoords: pickupCoords || dropCoords }
        );
      }, 150);
    } else {
      setDropSuggestions([]);
      setActiveSuggestField(null);
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
        setDropCoords(null);
      }
      setPickup('');
      setPickupCoords(null);
      setTripTelemetry({
        distanceKm: null,
        distanceText: '--',
        durationMins: null,
        durationText: '--',
        etaText: '--',
        isCalculated: false
      });
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
        if (loc.lat && loc.lng) {
          const cObj = {
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            name: loc.address.split(',')[0].trim(),
            formatted: loc.address,
            city: loc.city || loc.address.split(',')[0].trim(),
            state: 'Kerala'
          };
          setPickupCoords(cObj);
          setPickupDetails(cObj);
        }
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
      geocodeAddress(addr).then(coords => {
        if (coords) {
          const cObj = {
            ...coords,
            name: addr.split(',')[0].trim(),
            formatted: addr,
            city: addr.split(',')[0].trim(),
            state: 'Kerala'
          };
          setPickupCoords(cObj);
          setPickupDetails(cObj);
        }
      });
      addToast(`Pickup set: ${addr.split(',')[0]}`, 'check');
    } else {
      setDrop(addr);
      geocodeAddress(addr).then(coords => {
        if (coords) {
          const cObj = {
            ...coords,
            name: addr.split(',')[0].trim(),
            formatted: addr,
            city: addr.split(',')[0].trim(),
            state: 'Kerala'
          };
          setDropCoords(cObj);
          setDropDetails(cObj);
        }
      });
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
      if (activeOngoingTrip) {
        if (addToast) addToast('You already have an active ride in progress. Complete your ongoing trip before booking another one.', 'warn');
        setBookingOpen(false);
        if (setActiveTrackingTripId) setActiveTrackingTripId(activeOngoingTrip.id);
        if (setLiveTrackingOpen) setLiveTrackingOpen(true);
        return;
      }
      const cleanPickup = pickup?.trim();
      if (!cleanPickup) {
        if (addToast) addToast('Please enter pickup location or choose on map', 'alert');
        return;
      }
      if (!pickupCoords) {
        if (addToast) addToast('Please tap & select your pickup from the suggestions or choose on map', 'alert');
        setActiveSuggestField('pickup');
        return;
      }
      if (drop && drop.trim() && !dropCoords) {
        if (addToast) addToast('Please tap & select your destination from the suggestions or choose on map', 'alert');
        setActiveSuggestField('drop');
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
            pickupDetails,
            dropDetails,
            flightNo: cat === 'airport' ? flightNo : null,
            airportType: cat === 'airport' ? airportType : null,
            driverEarlyBuffer: cat === 'airport' ? driverEarlyBuffer : null,
            distanceKm: tripTelemetry.isCalculated ? tripTelemetry.distanceKm : null,
            distanceText: tripTelemetry.isCalculated ? tripTelemetry.distanceText : null,
            durationMins: tripTelemetry.isCalculated ? tripTelemetry.durationMins : null,
            durationText: tripTelemetry.isCalculated ? tripTelemetry.durationText : null,
            eta: tripTelemetry.isCalculated ? tripTelemetry.etaText : null
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
        {activeOngoingTrip ? (
          /* ---------- Blocked View: Active Trip in Progress ---------- */
          <div className="sheet-scroll-body" style={{ padding: '24px 20px 36px', textAlign: 'center' }}>
            <div className="grab" />
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '14px auto 16px' }}>
              <Icon name="alert-triangle" size={30} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>Active Trip in Progress</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.5, margin: '0 auto 20px', maxWidth: '320px' }}>
              Only one trip booking is permitted at a time. Please complete your current ride before booking a new chauffeur.
            </p>

            <div style={{ background: 'var(--field)', borderRadius: '16px', padding: '14px 16px', textAlign: 'left', marginBottom: '22px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                  Current Ride
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 750, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A' }} />
                  {activeOngoingTrip.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📍 {activeOngoingTrip.pickup || 'Pickup'}
              </div>
              {activeOngoingTrip.drop_loc && (
                <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🏁 {activeOngoingTrip.drop_loc}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, height: '46px', borderRadius: '14px', border: '1.5px solid var(--line)', background: 'var(--field)', fontWeight: 700 }}
                onClick={handleClose}
              >
                Close
              </button>
              <button
                type="button"
                className="btn primary"
                style={{ flex: 1.6, height: '46px', borderRadius: '14px', background: '#000000', color: '#FFFFFF', fontWeight: 750 }}
                onClick={() => {
                  handleClose();
                  if (setActiveTrackingTripId) setActiveTrackingTripId(activeOngoingTrip.id);
                  if (setLiveTrackingOpen) setLiveTrackingOpen(true);
                }}
              >
                View Live Trip
              </button>
            </div>
          </div>
        ) : isSuccess && confirmedTrip ? (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="lab" htmlFor="bk-pickup" style={{ margin: 0 }}>
                  Pickup location
                </label>
              </div>
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
            <div className="loc-input-wrap" style={{ position: 'relative', zIndex: activeSuggestField === 'pickup' ? 9999 : 2 }}>
              <input
                ref={pickupInputRef}
                className="inp"
                id="bk-pickup"
                placeholder="Where should the driver meet you?"
                value={pickup}
                onChange={e => handlePickupChange(e.target.value)}
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

              {/* Google Maps Stock Location Suggestions Dropdown */}
              {activeSuggestField === 'pickup' && Boolean(pickup?.trim()?.length >= 2) && pickupSuggestions.length > 0 && (
                <div className="location-suggest-dropdown" style={{ zIndex: 9999 }}>
                  {pickupSuggestions.slice(0, 10).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="loc-suggest-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectPickupPlace(item)}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="#70757a"
                        style={{ flexShrink: 0, marginTop: '2px' }}
                        aria-hidden="true"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: 'var(--ink, #202124)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {highlightMatchGoogleStock(item.title, pickup)}
                        </div>
                        {item.sub && (
                          <div style={{ fontSize: '12px', color: '#70757a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {item.sub}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '6px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', background: 'transparent' }}>
                    <span style={{ fontSize: '11px', color: '#70757a', fontWeight: 400, marginRight: '4px' }}>powered by</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '-0.3px', fontFamily: "Roboto, 'Product Sans', sans-serif" }}>
                      <span style={{ color: '#4285F4' }}>G</span>
                      <span style={{ color: '#EA4335' }}>o</span>
                      <span style={{ color: '#FBBC05' }}>o</span>
                      <span style={{ color: '#4285F4' }}>g</span>
                      <span style={{ color: '#34A853' }}>l</span>
                      <span style={{ color: '#EA4335' }}>e</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Destination (optional) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="lab" htmlFor="bk-drop" style={{ margin: 0 }}>
                  Destination (optional)
                </label>
              </div>
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
            <div className="loc-input-wrap" style={{ position: 'relative', zIndex: activeSuggestField === 'drop' ? 9999 : 1 }}>
              <input
                ref={dropInputRef}
                className="inp"
                id="bk-drop"
                placeholder="Add if you know it"
                value={drop}
                onChange={e => handleDropChange(e.target.value)}
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

              {/* Google Maps Stock Location Suggestions Dropdown */}
              {activeSuggestField === 'drop' && Boolean(drop?.trim()?.length >= 2) && dropSuggestions.length > 0 && (
                <div className="location-suggest-dropdown" style={{ zIndex: 9999 }}>
                  {dropSuggestions.slice(0, 10).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="loc-suggest-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectDropPlace(item)}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="#70757a"
                        style={{ flexShrink: 0, marginTop: '2px' }}
                        aria-hidden="true"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: 'var(--ink, #202124)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {highlightMatchGoogleStock(item.title, drop)}
                        </div>
                        {item.sub && (
                          <div style={{ fontSize: '12px', color: '#70757a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {item.sub}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '6px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', background: 'transparent' }}>
                    <span style={{ fontSize: '11px', color: '#70757a', fontWeight: 400, marginRight: '4px' }}>powered by</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '-0.3px', fontFamily: "Roboto, 'Product Sans', sans-serif" }}>
                      <span style={{ color: '#4285F4' }}>G</span>
                      <span style={{ color: '#EA4335' }}>o</span>
                      <span style={{ color: '#FBBC05' }}>o</span>
                      <span style={{ color: '#4285F4' }}>g</span>
                      <span style={{ color: '#34A853' }}>l</span>
                      <span style={{ color: '#EA4335' }}>e</span>
                    </span>
                  </div>
                </div>
              )}
            </div>


            {/* Total Distance & ETA Minimal Stat Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                background: 'var(--field)',
                borderRadius: '12px',
                padding: '10px 18px',
                marginTop: '12px',
                marginBottom: '10px',
                border: '1px solid var(--line)'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 650,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '2px'
                  }}
                >
                  Total Distance
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: tripTelemetry.isCalculated && tripTelemetry.distanceText ? 'var(--ink)' : 'var(--muted)',
                    letterSpacing: '-0.02em',
                    display: 'block'
                  }}
                >
                  {tripTelemetry.isCalculated && tripTelemetry.distanceText ? tripTelemetry.distanceText : '--'}
                </span>
              </div>

              <div style={{ width: '1px', height: '26px', background: 'var(--line)', margin: '0 8px' }} />

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 650,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '2px'
                  }}
                >
                  ETA
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: tripTelemetry.isCalculated ? 'var(--ink)' : 'var(--muted)',
                    letterSpacing: '-0.02em',
                    display: 'block'
                  }}
                >
                  {tripTelemetry.isCalculated && tripTelemetry.durationMins
                    ? formatDurationMeasurement(tripTelemetry.durationMins)
                    : (tripTelemetry.durationText && tripTelemetry.durationText !== '--'
                        ? tripTelemetry.durationText.replace(/^~\s*/, '')
                        : '--')}
                </span>
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
