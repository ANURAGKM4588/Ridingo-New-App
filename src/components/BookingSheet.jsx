import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import MapPickerModal from './MapPickerModal';
import { getDeviceLocation, getCachedDeviceLocation } from '../lib/deviceLocation';
import { searchPlaces } from '../lib/locationService';
import { searchGooglePlaces, calculateTripRouteAndETA, geocodeAddress, fetchPlaceDetails, initGooglePlacesAutocomplete, formatDurationMeasurement, cleanPlusCode, fetchNearestLandmarkByCoordinates, getPlaceDetailsOnMarkerPlaced } from '../services/googleMapsService';
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
  const monthName = dateObj.toLocaleDateString('en-IN', { month: 'short' });
  const d = parts[2];

  if (dateISO === today) {
    return 'Today';
  } else if (dateISO === tomorrow) {
    return 'Tomorrow';
  } else {
    return `${d} ${monthName}`;
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
    setLiveTrackingOpen,
    setTermsConfirmationBanner
  } = useApp();

  const activeOngoingTrip = (trips || []).find(t =>
    isUserTrip(t, user) &&
    ['requested', 'accepted', 'pickup_arrived', 'ready_to_start', 'inprogress'].includes(t.status)
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
  const [hasReviewedTerms, setHasReviewedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isShakingTerms, setIsShakingTerms] = useState(false);
  const [shakingLocationField, setShakingLocationField] = useState(null); // 'pickup' | 'drop' | null
  const termsSectionRef = useRef(null);

  const triggerWaitingSectionShake = () => {
    // 1. Light tactile vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([35, 45, 35]);
      } catch (_) {}
    }
    // 2. Trigger subtle shake animation
    setIsShakingTerms(true);
    setTimeout(() => {
      setIsShakingTerms(false);
    }, 550);
    // 3. Smooth scroll into view
    if (termsSectionRef.current) {
      termsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (addToast) addToast('Please review waiting charges & additional trip policy before paying.', 'info');
  };

  const triggerLocationShake = (field) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([35, 45, 35]);
      } catch (_) {}
    }
    setShakingLocationField(field);
    setTimeout(() => {
      setShakingLocationField(null);
    }, 550);

    if (field === 'pickup') {
      if (pickupInputRef.current) {
        pickupInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pickupInputRef.current.focus();
      }
      if (addToast) addToast('Please enter your pickup location (From) before paying.', 'alert');
    } else if (field === 'drop') {
      if (dropInputRef.current) {
        dropInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dropInputRef.current.focus();
      }
      if (addToast) addToast('Please enter your destination location (To) before paying.', 'alert');
    }
  };

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
  const searchSeqRef = useRef(0);
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

    const rawChosen = item.full || (item.title + (item.sub ? `, ${item.sub}` : ''));
    const chosen = cleanPlusCode(rawChosen);
    setPickup(chosen);

    if (item.place_id && !item.isMock) {
      try {
        const details = await fetchPlaceDetails(item.place_id);
        if (details?.lat && details?.lng) {
          const coords = {
            lat: Number(details.lat),
            lng: Number(details.lng),
            name: cleanPlusCode(details.name) || item.title,
            formatted: cleanPlusCode(details.formatted_address || chosen),
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
        name: cleanPlusCode(item.title),
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
        const cObj = { ...coords, name: cleanPlusCode(item.title), formatted: chosen };
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

    const rawChosen = item.full || (item.title + (item.sub ? `, ${item.sub}` : ''));
    const chosen = cleanPlusCode(rawChosen);
    setDrop(chosen);

    if (item.place_id && !item.isMock) {
      try {
        const details = await fetchPlaceDetails(item.place_id);
        if (details?.lat && details?.lng) {
          const coords = {
            lat: Number(details.lat),
            lng: Number(details.lng),
            name: cleanPlusCode(details.name) || item.title,
            formatted: cleanPlusCode(details.formatted_address || chosen),
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
    if (clean.length >= 1) {
      setActiveSuggestField('pickup');
      const currentSeq = ++searchSeqRef.current;
      searchDebounceRef.current = setTimeout(() => {
        searchGooglePlaces(
          clean,
          (results) => {
            if (currentSeq === searchSeqRef.current) {
              setPickupSuggestions(results || []);
            }
          },
          { userCoords: dropCoords || pickupCoords }
        );
      }, 60);
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
    if (clean.length >= 1) {
      setActiveSuggestField('drop');
      const currentSeq = ++searchSeqRef.current;
      searchDebounceRef.current = setTimeout(() => {
        searchGooglePlaces(
          clean,
          (results) => {
            if (currentSeq === searchSeqRef.current) {
              setDropSuggestions(results || []);
            }
          },
          { userCoords: pickupCoords || dropCoords }
        );
      }, 60);
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

    // Instant detection from local cache with 0ms delay
    const cached = getCachedDeviceLocation();
    if (cached && cached.address) {
      const cleanAddr = cleanPlusCode(cached.address);
      setPickup(cleanAddr);
      if (cached.lat && cached.lng) {
        const cObj = {
          lat: Number(cached.lat),
          lng: Number(cached.lng),
          name: cleanAddr.split(',')[0].trim(),
          formatted: cleanAddr,
          city: cached.city || cleanAddr.split(',')[0].trim(),
          state: 'Kerala'
        };
        setPickupCoords(cObj);
        setPickupDetails(cObj);
      }
      const short = cleanAddr.split(',')[0].trim();
      addToast(`Pickup set to device location: ${short}`, 'check');
      setIsDetectingCurrent(false);
      return;
    }

    try {
      const loc = await getDeviceLocation(false);
      if (loc && loc.address) {
        const cleanAddr = cleanPlusCode(loc.address);
        setPickup(cleanAddr);
        if (loc.lat && loc.lng) {
          const cObj = {
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            name: cleanAddr.split(',')[0].trim(),
            formatted: cleanAddr,
            city: loc.city || cleanAddr.split(',')[0].trim(),
            state: 'Kerala'
          };
          setPickupCoords(cObj);
          setPickupDetails(cObj);
        }
        const short = cleanAddr.split(',')[0].trim();
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

  const handleMapSelect = (addr, details) => {
    if (mapPickerTarget === 'pickup') {
      setPickup(addr);
      if (details && details.lat && details.lng) {
        const cObj = {
          lat: Number(details.lat),
          lng: Number(details.lng),
          name: details.name || addr.split(',')[0].trim(),
          formatted: details.address || addr,
          city: details.city || addr.split(',')[0].trim(),
          state: details.state || 'Kerala',
          placeId: details.placeId || null,
          isPoi: !!details.isPoi,
          isLandmark: !!details.isLandmark
        };
        setPickupCoords(cObj);
        setPickupDetails(cObj);
      } else {
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
      }
      const labelName = details?.name || addr.split(',')[0].trim();
      addToast(`Pickup set: ${labelName}`, 'check');
    } else {
      setDrop(addr);
      if (details && details.lat && details.lng) {
        const cObj = {
          lat: Number(details.lat),
          lng: Number(details.lng),
          name: details.name || addr.split(',')[0].trim(),
          formatted: details.address || addr,
          city: details.city || addr.split(',')[0].trim(),
          state: details.state || 'Kerala',
          placeId: details.placeId || null
        };
        setDropCoords(cObj);
        setDropDetails(cObj);
      } else {
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
      }
      const labelName = details?.name || addr.split(',')[0].trim();
      addToast(`Destination set: ${labelName}`, 'check');
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
        triggerLocationShake('pickup');
        return;
      }

      const cleanDrop = drop?.trim();
      if (!cleanDrop) {
        triggerLocationShake('drop');
        return;
      }

      let pCoords = pickupCoords;
      if (!pCoords) {
        if (pickupSuggestions.length > 0) {
          const item = pickupSuggestions[0];
          pCoords = { lat: Number(item.lat) || 11.2588, lng: Number(item.lng) || 75.7804, name: item.title || cleanPickup, formatted: cleanPickup };
        } else {
          pCoords = { lat: 11.2588, lng: 75.7804, name: cleanPickup, formatted: cleanPickup };
        }
        setPickupCoords(pCoords);
      }

      let dCoords = dropCoords;
      if (!dCoords) {
        if (dropSuggestions.length > 0) {
          const item = dropSuggestions[0];
          dCoords = { lat: Number(item.lat) || 11.2600, lng: Number(item.lng) || 75.7900, name: item.title || cleanDrop, formatted: cleanDrop };
        } else {
          dCoords = { lat: 11.2600, lng: 75.7900, name: cleanDrop, formatted: cleanDrop };
        }
        setDropCoords(dCoords);
      }

      const pickupLoc = cleanPickup;
      const dropLoc = cleanDrop;

      // Trigger PhonePe payment options popup sheet (navigates to payment page)
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
            rawDate: selectedDate,
            rawTime: selectedTime,
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
          if (setTermsConfirmationBanner) {
            setTermsConfirmationBanner({
              tripId: pId,
              text: 'Waiting charges policy (60 mins free, ₹2/min thereafter) confirmed for this ride.'
            });
          }
          addToast(`Paid ₹${adv} via ${methodLabel}! Driver scheduled for ${dateStr} · ${timeStr}.`, 'check');
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
    <div className="booking-fullscreen-view" id="u-layer" role="dialog" aria-modal="true">
      <div className="sheet booking-fullscreen-inner" role="region">
        {isSuccess && confirmedTrip ? (
          /* ---------- Request Sent Confirmation View ---------- */
          <>
            <div className="sheet-sticky-top" style={{ borderBottom: '1px solid var(--line)', padding: 'max(14px, env(safe-area-inset-top, 0px)) 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>Booking Confirmed</h3>
                <button
                  type="button"
                  className="iconbtn"
                  onClick={handleClose}
                  aria-label="Back"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--field)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}
                >
                  <Icon name="arrow-left" size={18} />
                </button>
              </div>
            </div>

            <div className="sheet-scroll-body" style={{ padding: '24px 20px 36px' }}>
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
          </>
        ) : (
          /* ---------- Booking Details Form (Full-Page Design) ---------- */
          <>
            {/* Full-Page App Bar Header with Back Button Only */}
            <div className="sheet-sticky-top" style={{ borderBottom: '1px solid var(--line, #F1F5F9)', padding: 'max(14px, env(safe-area-inset-top, 0px)) 18px 14px', background: 'var(--card, #FFFFFF)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={handleClose}
                    aria-label="Back"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#F1F5F9',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink, #0F172A)',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 850, color: 'var(--ink, #0F172A)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                      Book a Driver
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                      Professional driver on demand
                    </p>
                  </div>
                </div>
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
                  Pickup location (From) <span style={{ color: '#EA580C', fontWeight: 800 }}>*</span>
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
            <div className={`loc-input-wrap ${shakingLocationField === 'pickup' ? 'shake-attention' : ''}`} style={{ position: 'relative', zIndex: activeSuggestField === 'pickup' ? 9999 : 2 }}>
              <input
                ref={pickupInputRef}
                className="inp"
                id="bk-pickup"
                placeholder="Where should the driver meet you? (From)"
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
              {activeSuggestField === 'pickup' && Boolean(pickup?.trim()?.length >= 1) && pickupSuggestions.length > 0 && (
                <div className="location-suggest-dropdown" style={{ zIndex: 9999, maxHeight: '280px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {pickupSuggestions.map((item, idx) => (
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

            {/* Destination Location (To) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="lab" htmlFor="bk-drop" style={{ margin: 0 }}>
                  Destination location (To) <span style={{ color: '#EA580C', fontWeight: 800 }}>*</span>
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
            <div className={`loc-input-wrap ${shakingLocationField === 'drop' ? 'shake-attention' : ''}`} style={{ position: 'relative', zIndex: activeSuggestField === 'drop' ? 9999 : 1 }}>
              <input
                ref={dropInputRef}
                className="inp"
                id="bk-drop"
                placeholder="Where are you heading to? (To)"
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
              {activeSuggestField === 'drop' && Boolean(drop?.trim()?.length >= 1) && dropSuggestions.length > 0 && (
                <div className="location-suggest-dropdown" style={{ zIndex: 9999, maxHeight: '280px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {dropSuggestions.map((item, idx) => (
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
                background: '#F8FAFC',
                borderRadius: '16px',
                padding: '14px 18px',
                marginTop: '14px',
                marginBottom: '16px',
                border: '1px solid #F1F5F9'
              }}
            >
              {/* Left: Total Distance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488',
                    flexShrink: 0
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <path d="M6 15v-3a3 3 0 0 1 3-3h6a3 3 0 0 0 3-3V6" />
                    <path d="m14 8 4-2-4-2" />
                  </svg>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 750,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      display: 'block',
                      marginBottom: '2px'
                    }}
                  >
                    TOTAL DISTANCE
                  </span>
                  <span
                    style={{
                      fontSize: '17px',
                      fontWeight: 800,
                      color: tripTelemetry.isCalculated && tripTelemetry.distanceText ? 'var(--ink)' : 'var(--ink)',
                      letterSpacing: '-0.02em',
                      display: 'block',
                      lineHeight: 1.1
                    }}
                  >
                    {tripTelemetry.isCalculated && tripTelemetry.distanceText ? tripTelemetry.distanceText : '--'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '36px', background: '#E2E8F0', margin: '0 8px' }} />

              {/* Right: ETA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488',
                    flexShrink: 0
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 750,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      display: 'block',
                      marginBottom: '2px'
                    }}
                  >
                    ETA
                  </span>
                  <span
                    style={{
                      fontSize: '17px',
                      fontWeight: 800,
                      color: 'var(--ink)',
                      letterSpacing: '-0.02em',
                      display: 'block',
                      lineHeight: 1.1
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
            </div>

            {/* Hours Stepper (Only for hourly/daily/event) */}
            {!isFlat && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                  {currentCat.units === 'hours' ? 'Hours' : 'Days'}
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 12px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleQtyChange(-1)}
                    disabled={qty <= (currentCat.min || 1)}
                    aria-label="Less hours"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      color: 'var(--ink)',
                      cursor: qty <= (currentCat.min || 1) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      opacity: qty <= (currentCat.min || 1) ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>

                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    {qty} {qty === 1 ? currentCat.unit : currentCat.units}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={qty >= (currentCat.max || 12)}
                    aria-label="More hours"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      color: 'var(--ink)',
                      cursor: qty >= (currentCat.max || 12) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      opacity: qty >= (currentCat.max || 12) ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Date and time */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                  Pickup date & time
                </label>
                <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 800 }}>
                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateStr} - {timeStr}
                </span>
              </div>

              {/* Quick Date & Time Presets Inline */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch',
                  marginBottom: '12px',
                  width: '100%'
                }}
              >
                <button
                  type="button"
                  style={{
                    flexShrink: 0,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    border: 'none',
                    background: isToday ? '#0F172A' : '#F1F5F9',
                    color: isToday ? '#FFFFFF' : '#334155',
                    fontSize: '13px',
                    fontWeight: isToday ? 750 : 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setSelectedDate(todayISO)}
                >
                  Today
                </button>
                <button
                  type="button"
                  style={{
                    flexShrink: 0,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    border: 'none',
                    background: isTomorrow ? '#0F172A' : '#F1F5F9',
                    color: isTomorrow ? '#FFFFFF' : '#334155',
                    fontSize: '13px',
                    fontWeight: isTomorrow ? 750 : 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setSelectedDate(tomorrowISO)}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  style={{
                    flexShrink: 0,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => addMinutesToTime(10)}
                >
                  Now
                </button>
                <button
                  type="button"
                  style={{
                    flexShrink: 0,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => addMinutesToTime(30)}
                >
                  +30m
                </button>
                <button
                  type="button"
                  style={{
                    flexShrink: 0,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => addMinutesToTime(60)}
                >
                  +1h
                </button>
              </div>

              {/* Two-Column Interactive Dropdown Inputs: Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Date Card */}
                <div
                  style={{
                    position: 'relative',
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    border: isCustomDate ? '1.5px solid var(--ink)' : '1px solid #E2E8F0',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const el = document.getElementById('bk-date-input');
                    if (el && typeof el.showPicker === 'function') {
                      try { el.showPicker(); } catch (e) { el.focus(); }
                    }
                  }}
                >
                  <div style={{ color: '#334155', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      DATE
                    </span>
                    <span style={{ fontSize: '14.5px', fontWeight: 750, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateStr}
                    </span>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
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

                {/* Time Card */}
                <div
                  style={{
                    position: 'relative',
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const el = document.getElementById('bk-time-input');
                    if (el && typeof el.showPicker === 'function') {
                      try { el.showPicker(); } catch (e) { el.focus(); }
                    }
                  }}
                >
                  <div style={{ color: '#334155', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TIME
                    </span>
                    <span style={{ fontSize: '14.5px', fontWeight: 750, color: 'var(--ink)' }}>
                      {timeStr}
                    </span>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
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
            </div>

            {/* Vehicle Gearbox Segment */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink, #0F172A)', display: 'block', marginBottom: '8px' }}>
                Vehicle gearbox
              </label>
              <div
                style={{
                  background: '#F1F5F9',
                  borderRadius: '14px',
                  padding: '4px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '4px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {['Manual', 'Automatic', 'IMT'].map(x => {
                  const isActive = trans === x;
                  return (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setTrans(x)}
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isActive ? '#FFFFFF' : 'transparent',
                        color: isActive ? 'var(--ink, #0F172A)' : '#475569',
                        fontSize: '13.5px',
                        fontWeight: isActive ? 800 : 600,
                        boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 0,
                        padding: '0 4px',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {x}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FARE BREAKDOWN Card */}
            <div
              style={{
                background: 'var(--card, #FFFFFF)',
                border: '1px solid #E2E8F0',
                borderRadius: '20px',
                padding: '14px 12px 16px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Card Header: FARE BREAKDOWN + Duration Pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B' }}>
                  FARE BREAKDOWN
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 750,
                    color: 'var(--ink)',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '2.5px 12px',
                    borderRadius: '999px'
                  }}
                >
                  {isFlat ? 'Flat route' : `${qty} ${qty > 1 ? currentCat.units : currentCat.unit}`}
                </span>
              </div>

              {/* 2-Column Side-by-Side Cards (Waiting & Additional Trip) with guaranteed boundary constraint */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* Card 1: Waiting Policy Card */}
                <div
                  style={{
                    background: 'var(--card, #FFFFFF)',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#FEF3C7',
                          color: '#D97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <b style={{ fontSize: '13px', color: 'var(--ink)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Waiting
                      </b>
                    </div>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 5px',
                        borderRadius: '6px',
                        background: '#DCFCE7',
                        color: '#166534',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      60m Free
                    </span>
                  </div>

                  <span style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.25 }}>
                    Review policy before paying
                  </span>

                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 650, color: 'var(--ink)' }}>₹</span>
                    <span style={{ fontSize: '22px', fontWeight: 850, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      2
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', marginLeft: '3px' }}>
                      / min
                    </span>
                  </div>

                  <span style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.2 }}>
                    After 60 mins (₹120/hr)
                  </span>
                </div>

                {/* Card 2: Additional Trip Card */}
                <div
                  style={{
                    background: 'var(--card, #FFFFFF)',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#E0F2FE',
                          color: '#0284C7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 19 8.5 5" />
                          <path d="M19 19 15.5 5" />
                          <path d="M12 6v3" />
                          <path d="M12 15v3" />
                        </svg>
                      </div>
                      <b style={{ fontSize: '12px', color: 'var(--ink)', lineHeight: 1.15, wordBreak: 'break-word' }}>
                        Additional Trip
                      </b>
                    </div>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 5px',
                        borderRadius: '6px',
                        background: '#E0F2FE',
                        color: '#0369A1',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      Extra Km
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '20px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 650, color: 'var(--ink)' }}>₹</span>
                    <span style={{ fontSize: '22px', fontWeight: 850, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      18
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', marginLeft: '3px' }}>
                      / km
                    </span>
                  </div>

                  <span style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.2 }}>
                    Beyond booked route
                  </span>
                </div>
              </div>
            </div>

            {/* Full-Width Policy Acknowledgement Button */}
            <div style={{ marginBottom: '18px' }} ref={termsSectionRef} className={isShakingTerms ? 'shake-attention' : ''}>
              {!hasReviewedTerms ? (
                <button
                  type="button"
                  onClick={() => {
                    setHasReviewedTerms(true);
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      try { navigator.vibrate(15); } catch (_) {}
                    }
                    if (addToast) addToast('Policy acknowledged! Pay Now is unlocked.', 'check');
                  }}
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '14px',
                    background: isShakingTerms ? '#EA580C' : '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 750,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '9px',
                    boxShadow: isShakingTerms
                      ? '0 0 0 3px rgba(234, 88, 12, 0.35)'
                      : '0 4px 16px rgba(15, 23, 42, 0.22)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>I Acknowledge Waiting & Route Policy</span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(22, 163, 74, 0.08)',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                    fontSize: '13px',
                    color: '#16A34A',
                    fontWeight: 750
                  }}
                >
                  <Icon name="check-circle" size={16} color="#16A34A" />
                  <span>Waiting & Route Policy Acknowledged</span>
                </div>
              )}
            </div>

              {/* Fare Invoice Breakdown Card */}
              <div
                style={{
                  background: 'var(--card, #FFFFFF)',
                  border: '1px solid #E2E8F0',
                  borderRadius: '18px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Driver Trip Fare */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '13px', color: 'var(--ink, #0F172A)', fontWeight: 600 }}>
                      Driver trip fare
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
                  aria-disabled={!hasReviewedTerms || !pickup?.trim() || !drop?.trim()}
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    padding: '0 22px',
                    fontWeight: 800,
                    fontSize: '14.5px',
                    cursor: (hasReviewedTerms && pickup?.trim() && drop?.trim()) ? 'pointer' : 'default',
                    background: (hasReviewedTerms && pickup?.trim() && drop?.trim()) ? 'var(--solid, #000000)' : '#94A3B8',
                    color: '#FFFFFF',
                    border: (hasReviewedTerms && pickup?.trim() && drop?.trim()) ? '1.5px solid var(--solid, #000000)' : '1.5px solid #94A3B8',
                    boxShadow: (hasReviewedTerms && pickup?.trim() && drop?.trim()) ? '0 4px 14px rgba(0, 0, 0, 0.22)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    opacity: (hasReviewedTerms && pickup?.trim() && drop?.trim()) ? 1 : 0.75,
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (!hasReviewedTerms) {
                      triggerWaitingSectionShake();
                      return;
                    }
                    if (!pickup?.trim()) {
                      triggerLocationShake('pickup');
                      return;
                    }
                    if (!drop?.trim()) {
                      triggerLocationShake('drop');
                      return;
                    }
                    handleSubmit();
                  }}
                  title={
                    !hasReviewedTerms
                      ? 'Please review the waiting charges before paying.'
                      : !pickup?.trim()
                      ? 'Please enter Pickup location (From) before paying.'
                      : !drop?.trim()
                      ? 'Please enter Destination location (To) before paying.'
                      : 'Pay Now'
                  }
                >
                  <span>Pay Now</span>
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Waiting Charges & Trip Terms Review Modal */}
      {showTermsModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100080,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowTermsModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              background: 'var(--card, #FFFFFF)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              color: 'var(--ink, #0F172A)',
              position: 'relative',
              animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(234, 88, 12, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon name="info" size={18} color="#EA580C" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink, #0F172A)' }}>
                    Waiting Charges & Terms
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--muted, #64748B)' }}>
                    Please review waiting charges before paying
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--field, #F1F5F9)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--muted, #64748B)'
                }}
                aria-label="Close dialog"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            {/* Terms Content List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.45, marginBottom: '20px' }}>
              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon name="clock" size={15} color="#0284C7" />
                  <b style={{ fontSize: '13px', color: '#0F172A' }}>60 Minutes Free Waiting</b>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                  Your trip booking includes <b>60 minutes of complimentary waiting time</b> after the driver arrives at your pickup location.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FEE2E2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon name="alert-circle" size={15} color="#DC2626" />
                  <b style={{ fontSize: '13px', color: '#991B1B' }}>Additional Waiting: ₹2 / min</b>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7F1D1D' }}>
                  Beyond the initial 60 minutes free window, waiting charges accrue at <b>₹2 per minute (₹120/hr)</b> and will be included in the final bill.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: '#F0FDF4', borderRadius: '14px', border: '1px solid #DCFCE7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon name="route" size={15} color="#166534" />
                  <b style={{ fontSize: '13px', color: '#166534' }}>Distance Extension & Tolls</b>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#14532D' }}>
                  Extra travel distance beyond the scheduled route is charged at ₹18/km. Parking and toll charges are payable as actuals.
                </p>
              </div>
            </div>

            {/* Review & Accept Button */}
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setHasReviewedTerms(true);
                setShowTermsModal(false);
                if (addToast) addToast('Waiting charges terms accepted. Pay Now is unlocked!', 'check');
              }}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '14.5px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)'
              }}
            >
              <Icon name="check" size={16} color="#FFFFFF" />
              <span>I Review & Accept Terms</span>
            </button>
          </div>
        </div>
      )}

      <MapPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onSelect={handleMapSelect}
        targetField={mapPickerTarget}
      />
    </div>
  );
}
