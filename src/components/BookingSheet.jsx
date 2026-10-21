import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import MapPickerModal from './MapPickerModal';
import { getDeviceLocation, getCachedDeviceLocation } from '../lib/deviceLocation';
import { searchPlaces } from '../lib/locationService';
import { searchGooglePlaces, calculateTripRouteAndETA, fetchGoogleDistanceMatrix, geocodeAddress, fetchPlaceDetails, initGooglePlacesAutocomplete, formatDurationMeasurement, cleanPlusCode, fetchNearestLandmarkByCoordinates, getPlaceDetailsOnMarkerPlaced } from '../services/googleMapsService';
import { openPhonePeCheckout } from '../utils/phonepe';
import { POPULAR_DESTINATIONS } from '../data/popularDestinations';

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
    setBookingDestination,
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
  const [hasReviewedTerms, setHasReviewedTerms] = useState(true);
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

    if (!pText || !dText) {
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
        let pCoords = pickupCoords;
        let dCoords = dropCoords;

        // Automatically resolve genuine Google coordinates if either coordinate is not yet set
        if (!pCoords?.lat && pText) {
          const resolvedP = await geocodeAddress(pText);
          if (resolvedP?.lat) {
            pCoords = resolvedP;
            if (!isCancelled) {
              setPickupCoords(resolvedP);
              setPickupDetails(resolvedP);
            }
          }
        }

        if (!dCoords?.lat && dText) {
          const resolvedD = await geocodeAddress(dText);
          if (resolvedD?.lat) {
            dCoords = resolvedD;
            if (!isCancelled) {
              setDropCoords(resolvedD);
              setDropDetails(resolvedD);
            }
          }
        }

        if (!pCoords?.lat || !dCoords?.lat) return;

        // 1. Google Maps Distance Matrix API: Real-time driving distance and duration
        const matrixRes = await fetchGoogleDistanceMatrix({
          origin: pText,
          destination: dText,
          originCoords: pCoords,
          destCoords: dCoords
        });
        if (!isCancelled && matrixRes) {
          setTripTelemetry({
            ...matrixRes,
            isCalculated: true
          });
          return;
        }
      } catch (matrixErr) {
        console.warn('[BookingSheet] Distance Matrix API error, trying route calculation:', matrixErr);
      }

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
            postalCode: details.postalCode || '',
            source: 'google'
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

    // Always prioritize Google geocodeAddress (Google Places searchText) for genuine coordinates
    try {
      const coords = await geocodeAddress(chosen);
      if (coords && coords.lat && coords.lng) {
        const cObj = { ...coords, name: cleanPlusCode(item.title), formatted: chosen, source: 'google' };
        setPickupCoords(cObj);
        setPickupDetails(cObj);
        addToast(`Pickup confirmed: ${item.title}`, 'pin');
        return;
      }
    } catch (geoErr) {
      console.warn('Pickup geocoding error:', geoErr);
    }

    if (item.lat && item.lng) {
      const coords = {
        lat: Number(item.lat),
        lng: Number(item.lng),
        name: cleanPlusCode(item.title),
        formatted: chosen,
        city: item.sub?.split(',')?.[0]?.trim() || '',
        state: 'Kerala',
        source: item.source || 'fallback'
      };
      setPickupCoords(coords);
      setPickupDetails(coords);
      addToast(`Pickup confirmed: ${item.title}`, 'pin');
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
            postalCode: details.postalCode || '',
            source: 'google'
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

    // Always prioritize Google geocodeAddress (Google Places searchText) for genuine coordinates
    try {
      const coords = await geocodeAddress(chosen);
      if (coords && coords.lat && coords.lng) {
        const cObj = { ...coords, name: item.title, formatted: chosen, source: 'google' };
        setDropCoords(cObj);
        setDropDetails(cObj);
        addToast(`Destination confirmed: ${item.title}`, 'pin');
        return;
      }
    } catch (geoErr) {
      console.warn('Destination geocoding error:', geoErr);
    }

    if (item.lat && item.lng) {
      const coords = {
        lat: Number(item.lat),
        lng: Number(item.lng),
        name: item.title,
        formatted: chosen,
        city: item.sub?.split(',')?.[0]?.trim() || '',
        state: 'Kerala',
        source: item.source || 'fallback'
      };
      setDropCoords(coords);
      setDropDetails(coords);
      addToast(`Destination confirmed: ${item.title}`, 'pin');
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

  // Sync destination & Google Maps coordinates when selected from popular destinations, home search, or landmark
  useEffect(() => {
    if (bookingDestination) {
      let destName = '';
      let destAddress = '';
      let destLat = null;
      let destLng = null;
      let destCity = '';

      if (typeof bookingDestination === 'object' && bookingDestination !== null) {
        destName = bookingDestination.name || bookingDestination.title || '';
        destAddress = bookingDestination.destAddress || bookingDestination.address || bookingDestination.formatted || '';
        destLat = bookingDestination.lat;
        destLng = bookingDestination.lng;
        destCity = bookingDestination.city || bookingDestination.state || '';
      } else if (typeof bookingDestination === 'string') {
        destAddress = bookingDestination.trim();
        const matched = POPULAR_DESTINATIONS.find(
          d => d.destAddress === destAddress || d.name === destAddress || destAddress.toLowerCase().includes(d.name.toLowerCase())
        );
        if (matched) {
          destName = matched.name;
          destLat = matched.lat;
          destLng = matched.lng;
          destCity = matched.state || '';
        }
      }

      const displayDrop = destAddress || destName || (typeof bookingDestination === 'string' ? bookingDestination : '');
      if (displayDrop) {
        setDrop(displayDrop);
      }

      if (destLat && destLng) {
        const coords = {
          lat: Number(destLat),
          lng: Number(destLng),
          name: destName || displayDrop,
          formatted: displayDrop,
          city: destCity || 'Kerala',
          state: 'Kerala'
        };
        setDropCoords(coords);
        setDropDetails(coords);
      } else if (displayDrop) {
        // Fallback geocode to resolve exact Google Map coordinates
        geocodeAddress(displayDrop).then(coords => {
          if (coords) {
            const cObj = { ...coords, name: destName || displayDrop, formatted: displayDrop };
            setDropCoords(cObj);
            setDropDetails(cObj);
          }
        }).catch(() => {});
      }
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
        setDropDetails(null);
      }
      setPickup('');
      setPickupCoords(null);
      setPickupDetails(null);
      setFlightNo('');
      setPickupSuggestions([]);
      setDropSuggestions([]);
      setActiveSuggestField(null);
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

  const handleSubmit = async () => {
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
        pCoords = await geocodeAddress(cleanPickup);
        if (!pCoords) {
          pCoords = { lat: 11.2588, lng: 75.7804, name: cleanPickup, formatted: cleanPickup, source: 'default' };
        }
        setPickupCoords(pCoords);
      }

      let dCoords = dropCoords;
      if (!dCoords) {
        dCoords = await geocodeAddress(cleanDrop);
        if (!dCoords) {
          dCoords = { lat: 11.2600, lng: 75.7900, name: cleanDrop, formatted: cleanDrop, source: 'default' };
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

  const resetBookingForm = () => {
    setIsSuccess(false);
    setConfirmedTrip(null);
    setPickup('');
    setDrop('');
    setPickupCoords(null);
    setDropCoords(null);
    setPickupDetails(null);
    setDropDetails(null);
    setPickupSuggestions([]);
    setDropSuggestions([]);
    setActiveSuggestField(null);
    setTripTelemetry({
      distanceKm: null,
      distanceText: '--',
      durationMins: null,
      durationText: '--',
      etaText: '--',
      isCalculated: false
    });
    setFlightNo('');
    setDriverEarlyBuffer('30m');
    setAirportType('pickup');
    setCat('hourly');
    setQty(3);
    setSelectedDate(getTodayISO());
    setSelectedTime(getDefaultTime());
    setTrans('Manual');
    setShakingLocationField(null);
    if (setBookingDestination) {
      setBookingDestination('');
    }
    if (setBookingCategory) {
      setBookingCategory(null);
    }
  };

  const handleClose = () => {
    resetBookingForm();
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
            <div className="sheet-sticky-top" style={{ borderBottom: '1px solid var(--line, #F1F5F9)', padding: 'max(14px, env(safe-area-inset-top, 0px)) 18px 14px', background: 'var(--sheet, #FFFFFF)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    type="button"
                    className="iconbtn bk-back-btn"
                    onClick={handleClose}
                    aria-label="Back"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 850, color: 'var(--ink, #0F172A)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                      Book a Driver
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted, #64748B)', fontWeight: 500 }}>
                      Professional driver on demand
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Body: All details with smooth scroll animation */}
            <div className="sheet-scroll-body" style={{ paddingTop: '14px' }}>

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
                marginTop: '0px',
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
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid var(--line)',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div>
                  <div className="lab" style={{ margin: '0 0 5px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Airport Transfer Direction
                  </div>
                  <div className="seg" style={{ marginTop: '0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <button
                      type="button"
                      className={airportType === 'pickup' ? 'on' : ''}
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => {
                        setAirportType('pickup');
                      }}
                    >
                      Airport Pickup
                    </button>
                    <button
                      type="button"
                      className={airportType === 'drop' ? 'on' : ''}
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => {
                        setAirportType('drop');
                      }}
                    >
                      Airport Drop
                    </button>
                  </div>
                </div>

                <div>
                  <label className="lab" style={{ margin: '0 0 5px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', whiteSpace: 'nowrap' }}>
                    Flight Number
                  </label>
                  <input
                    className="inp"
                    placeholder="e.g. AI-504, 6E-201"
                    value={flightNo}
                    onChange={e => setFlightNo(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--card)', height: '40px' }}
                  />
                </div>

                {airportType === 'pickup' && (
                  <div>
                    <label className="lab" style={{ margin: '0 0 5px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', whiteSpace: 'nowrap' }}>
                      Driver Arrival
                    </label>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
                      {[
                        { id: '30m', label: '30m early' },
                        { id: '45m', label: '45m early' },
                        { id: '15m', label: '15m early' },
                        { id: 'exact', label: 'At landing' }
                      ].map(buf => (
                        <button
                          key={buf.id}
                          type="button"
                          className={`chip ${driverEarlyBuffer === buf.id ? 'on' : ''}`}
                          style={{ fontSize: '12px', padding: '5px 12px', height: '30px', flexShrink: 0, whiteSpace: 'nowrap', fontWeight: driverEarlyBuffer === buf.id ? 700 : 500 }}
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

            {/* Unified Route Box (Pickup & Destination with Left Timeline) */}
            <div className="bk-route-card">
              <div className="bk-route-timeline">
                <div className="bk-timeline-dot pickup">
                  <div className="bk-timeline-dot-inner" />
                </div>
                <div className="bk-timeline-dashed-line" />
                <div className="bk-timeline-dot dest" />
              </div>

              <div className="bk-route-fields">
                {/* Pickup Section */}
                <div className={`bk-route-section ${shakingLocationField === 'pickup' ? 'shake-attention' : ''}`} style={{ zIndex: activeSuggestField === 'pickup' ? 9999 : 2 }}>
                  <div className="bk-route-header">
                    <label className="bk-route-label" htmlFor="bk-pickup">
                      Pickup location <span style={{ color: '#EA580C', fontWeight: 800 }}>*</span>
                    </label>
                  </div>

                  <div className="bk-route-input-wrap">
                    <input
                      ref={pickupInputRef}
                      id="bk-pickup"
                      className="bk-route-input"
                      placeholder="Where should the driver meet you?"
                      value={pickup}
                      onChange={e => handlePickupChange(e.target.value)}
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      className="bk-route-end-icon-btn"
                      onClick={handleUseCurrentLocation}
                      title={isDetectingCurrent ? 'Locating...' : 'Use current location'}
                      aria-label="Use current location"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="22" y1="12" x2="18" y2="12" />
                        <line x1="6" y1="12" x2="2" y2="12" />
                        <line x1="12" y1="6" x2="12" y2="2" />
                        <line x1="12" y1="22" x2="12" y2="18" />
                      </svg>
                    </button>

                    {/* Google Maps Stock Location Suggestions Dropdown */}
                    {activeSuggestField === 'pickup' && Boolean(pickup?.trim()?.length >= 1) && pickupSuggestions.length > 0 && (
                      <div className="location-suggest-dropdown" style={{ zIndex: 99999, maxHeight: '280px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                </div>

                {/* Divider Line */}
                <div className="bk-route-divider" />

                {/* Destination Section */}
                <div className={`bk-route-section ${shakingLocationField === 'drop' ? 'shake-attention' : ''}`} style={{ zIndex: activeSuggestField === 'drop' ? 9999 : 1 }}>
                  <div className="bk-route-header">
                    <label className="bk-route-label" htmlFor="bk-drop">
                      Destination location <span style={{ color: '#EA580C', fontWeight: 800 }}>*</span>
                    </label>
                  </div>

                  <div className="bk-route-input-wrap">
                    <input
                      ref={dropInputRef}
                      id="bk-drop"
                      className="bk-route-input"
                      placeholder="Where are you heading to?"
                      value={drop}
                      onChange={e => handleDropChange(e.target.value)}
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      className="bk-route-end-icon-btn"
                      onClick={() => {
                        setActiveSuggestField(null);
                        openMap('drop');
                      }}
                      title="Choose on map"
                      aria-label="Choose on map"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </button>

                    {/* Google Maps Stock Location Suggestions Dropdown */}
                    {activeSuggestField === 'drop' && Boolean(drop?.trim()?.length >= 1) && dropSuggestions.length > 0 && (
                      <div className="location-suggest-dropdown" style={{ zIndex: 99999, maxHeight: '280px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                </div>
              </div>
            </div>

            {/* Total Distance & ETA Telemetry Stat Bar */}
            <div className="bk-telemetry-bar">
              <div className="bk-telemetry-col">
                <div className="bk-telemetry-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19 8 5" />
                    <path d="M20 19 16 5" />
                    <line x1="12" y1="7" x2="12" y2="9" />
                    <line x1="12" y1="13" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <span className="bk-telemetry-label">Total distance</span>
                  <span className="bk-telemetry-val">
                    {tripTelemetry.isCalculated && tripTelemetry.distanceText ? tripTelemetry.distanceText : '--'}
                  </span>
                </div>
              </div>

              <div className="bk-telemetry-divider" />

              <div className="bk-telemetry-col">
                <div className="bk-telemetry-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <span className="bk-telemetry-label">ETA</span>
                  <span className="bk-telemetry-val">
                    {tripTelemetry.isCalculated && tripTelemetry.durationMins
                      ? formatDurationMeasurement(tripTelemetry.durationMins)
                      : (tripTelemetry.durationText && tripTelemetry.durationText !== '--'
                          ? tripTelemetry.durationText.replace(/^~\s*/, '')
                          : '--')}
                  </span>
                </div>
              </div>
            </div>

            {/* Hours Stepper (Only for hourly/daily/outstation/event) */}
            {!isFlat && (
              <div className="bk-hours-wrap">
                <div className="bk-hours-header">
                  <h4 className="bk-hours-title">
                    {currentCat.units === 'hours' ? 'Hours' : 'Days'}
                  </h4>
                  <span className="bk-hours-subtitle">Select driver duration</span>
                </div>
                <div className="bk-hours-stepper">
                  <button
                    type="button"
                    className="bk-stepper-btn minus"
                    onClick={() => handleQtyChange(-1)}
                    disabled={qty <= (currentCat.min || 1)}
                    aria-label="Less"
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span className="bk-stepper-val">
                    {qty} {qty === 1 ? currentCat.unit : currentCat.units}
                  </span>
                  <button
                    type="button"
                    className="bk-stepper-btn plus"
                    onClick={() => handleQtyChange(1)}
                    disabled={qty >= (currentCat.max || 12)}
                    aria-label="More"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Date and time */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink, #0F172A)', margin: 0 }}>
                  Pickup date &amp; time
                </label>
                <span style={{ fontSize: '12.5px', color: 'var(--ink, #0F172A)', fontWeight: 700 }}>
                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateStr}, {timeStr}
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
                  marginBottom: '10px',
                  width: '100%',
                  paddingBottom: '2px'
                }}
              >
                <button
                  type="button"
                  className={`bk-preset-btn ${isToday ? 'active' : ''}`}
                  onClick={() => setSelectedDate(todayISO)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`bk-preset-btn ${isTomorrow ? 'active' : ''}`}
                  onClick={() => setSelectedDate(tomorrowISO)}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="bk-preset-btn"
                  onClick={() => addMinutesToTime(10)}
                >
                  Now
                </button>
                <button
                  type="button"
                  className="bk-preset-btn"
                  onClick={() => addMinutesToTime(30)}
                >
                  +30m
                </button>
              </div>

              {/* Two-Column Interactive Dropdown Inputs: Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Date Card */}
                <div
                  className={`bk-picker-card ${isCustomDate ? 'custom-active' : ''}`}
                  onClick={() => {
                    const el = document.getElementById('bk-date-input');
                    if (el && typeof el.showPicker === 'function') {
                      try { el.showPicker(); } catch (e) { el.focus(); }
                    }
                  }}
                >
                  <div className="bk-picker-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span className="bk-picker-card-label">
                      DATE
                    </span>
                    <span className="bk-picker-card-value">
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateStr}
                    </span>
                  </div>
                  <svg className="bk-picker-card-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
                  className="bk-picker-card"
                  onClick={() => {
                    const el = document.getElementById('bk-time-input');
                    if (el && typeof el.showPicker === 'function') {
                      try { el.showPicker(); } catch (e) { el.focus(); }
                    }
                  }}
                >
                  <div className="bk-picker-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span className="bk-picker-card-label">
                      TIME
                    </span>
                    <span className="bk-picker-card-value">
                      {timeStr}
                    </span>
                  </div>
                  <svg className="bk-picker-card-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="bk-gearbox-wrap">
                {[
                  {
                    id: 'Manual',
                    label: 'Manual',
                    icon: (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 5v14" />
                        <path d="M12 5v14" />
                        <path d="M18 5v14" />
                        <path d="M6 12h12" />
                      </svg>
                    )
                  },
                  {
                    id: 'Automatic',
                    label: 'Automatic',
                    icon: (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m8 16 4-8 4 8" />
                        <path d="M9.5 13h5" />
                      </svg>
                    )
                  },
                  {
                    id: 'IMT',
                    label: 'IMT',
                    icon: (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )
                  }
                ].map(item => {
                  const isActive = trans === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTrans(item.id)}
                      className={`bk-gearbox-btn ${isActive ? 'active' : ''}`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

              {/* Fare Invoice Breakdown Card */}
              <div className="bk-fare-card">
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
                      App service &amp; 24/7 matching
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
                      Safety &amp; dispatch fee
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted, #64748B)', marginTop: '1px' }}>
                      Ride safety &amp; operational dispatch
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

              {/* Waiting & Additional Trip Section (Single-Line Design, Placed at Bottom) */}
              <div className="bk-waiting-card">
                {/* Row 1: Waiting Charge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
                    <div className="bk-waiting-icon-clock">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      Waiting Charge
                    </span>
                    <span className="bk-waiting-badge-free">
                      60m Free
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)' }}>
                      ₹2<span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted, #64748B)' }}>/min</span>
                    </span>
                    <span className="bk-waiting-subtext">
                      (after 60m)
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="bk-waiting-divider" />

                {/* Row 2: Additional Trip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
                    <div className="bk-waiting-icon-extra">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 19 8.5 5" />
                        <path d="M19 19 15.5 5" />
                        <path d="M12 6v3" />
                        <path d="M12 15v3" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      Additional Trip
                    </span>
                    <span className="bk-waiting-badge-extra">
                      Extra Km
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)' }}>
                      ₹18<span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted, #64748B)' }}>/km</span>
                    </span>
                    <span className="bk-waiting-subtext">
                      (extra route)
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment & Conditions Acceptance Notification */}
              <div className="bk-terms-notice">
                <div className="bk-terms-notice-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <span className="bk-terms-notice-text">
                  By completing the payment, you accept the waiting and additional trip terms &amp; conditions.
                </span>
              </div>

            </div>

            {/* Sticky Floating Bottom Action Bar */}
            <div className="sheet-sticky-foot bk-footer-floating-wrap">
              <div className="bk-floating-bar">
                {/* Left Side: Pay Now (30%) + Amount */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                    Pay Now (30%)
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: '2px', fontFamily: 'var(--font-mono, monospace)' }}>
                    ₹{adv}
                  </span>
                </div>

                {/* Right Side: White Pay Now Pill Button */}
                <button
                  type="button"
                  className={`bk-floating-pay-btn ${(!pickup?.trim() || !drop?.trim()) ? 'disabled' : ''}`}
                  id="bk-submit-btn"
                  disabled={!pickup?.trim() || !drop?.trim()}
                  aria-disabled={!pickup?.trim() || !drop?.trim()}
                  onClick={() => {
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
                    !pickup?.trim()
                      ? 'Please enter Pickup location (From) before paying.'
                      : !drop?.trim()
                      ? 'Please enter Destination location (To) before paying.'
                      : 'Pay Now'
                  }
                >
                  <span>Pay Now</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
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
            className="bk-terms-modal-card"
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
              <div className="bk-terms-box-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon name="clock" size={15} color="#0284C7" />
                  <b style={{ fontSize: '13px', color: '#0F172A' }}>60 Minutes Free Waiting</b>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                  Your trip booking includes <b>60 minutes of complimentary waiting time</b> after the driver arrives at your pickup location.
                </p>
              </div>

              <div className="bk-terms-box-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon name="alert-circle" size={15} color="#DC2626" />
                  <b style={{ fontSize: '13px', color: '#991B1B' }}>Additional Waiting: ₹2 / min</b>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7F1D1D' }}>
                  Beyond the initial 60 minutes free window, waiting charges accrue at <b>₹2 per minute (₹120/hr)</b> and will be included in the final bill.
                </p>
              </div>

              <div className="bk-terms-box-3">
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
              className="bk-submit-btn"
              onClick={() => {
                setHasReviewedTerms(true);
                setShowTermsModal(false);
                if (addToast) addToast('Waiting charges terms accepted. Pay Now is unlocked!', 'check');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Icon name="check" size={16} />
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
