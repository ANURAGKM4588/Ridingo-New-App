import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

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
    user,
    userBalance,
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

  if (!bookingOpen) return null;

  const currentCat = CATS[cat] || CATS.hourly;
  const isFlat = !!currentCat.flat;

  // Fare & Advance calculation
  const fare = isFlat ? currentCat.flat : currentCat.rate * qty;
  const adv = Math.ceil(fare * 0.3);
  const remaining = fare - adv;

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

  const handleSubmit = () => {
    const pickupLoc = pickup.trim() || 'Edappally Toll, Kochi';
    const dropLoc = drop.trim() || (cat === 'airport' ? 'Cochin International Airport (COK)' : 'City Route');

    const tripObj = {
      id: 'TRP-' + Math.floor(1000 + Math.random() * 9000),
      cat,
      qty,
      pickup: pickupLoc,
      drop_loc: dropLoc,
      fare,
      advance: adv,
      cashback: Math.floor(1 + Math.random() * 5),
      trans,
      when_ts: Date.now()
    };

    setConfirmedTrip(tripObj);
    setIsSuccess(true);
    bookRide(cat, qty, pickupLoc, dropLoc, fare);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setConfirmedTrip(null);
    setBookingOpen(false);
  };

  const dateStr = dateType === 'today' ? '5 Oct 2026' : '6 Oct 2026';
  const timeStr = '6:00 PM';

  return (
    <div className="layer on" id="u-layer">
      <div className="scrim" onClick={handleClose} />

      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />

        {isSuccess && confirmedTrip ? (
          /* ---------- Request Sent Confirmation View ---------- */
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
                <b>{confirmedTrip.id}</b>
              </div>
              <div>
                <span>When</span>
                <b>{dateStr} · {timeStr}</b>
              </div>
              <div>
                <span>Advance paid</span>
                <b>₹{confirmedTrip.advance}</b>
              </div>
              <div>
                <span>Wallet balance</span>
                <b>₹{userBalance.toLocaleString('en-IN')}</b>
              </div>
            </div>

            <button className="btn solid block" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          /* ---------- Booking Details Form (Matching User's Reference Screenshot) ---------- */
          <>
            <div className="sheet-h">
              <h3>Book a driver</h3>
              <button className="iconbtn" onClick={handleClose} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>

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

            {/* Pickup Location */}
            <label className="lab" htmlFor="bk-pickup">
              Pickup location
            </label>
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
                onClick={() => {
                  setPickup('Edappally Toll, Kochi');
                  addToast('Pickup set to current location', 'pin');
                }}
              >
                <Icon name="pin" size={16} />
              </button>
            </div>

            {/* Destination (optional) */}
            <label className="lab" htmlFor="bk-drop" style={{ marginTop: '10px' }}>
              Destination (optional)
            </label>
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
                onClick={() => {
                  setDrop('Cochin International Airport (COK)');
                  addToast('Destination set to Airport', 'pin');
                }}
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

            {/* Your Car Card */}
            <div className="lab" style={{ marginTop: '10px' }}>
              Your car
            </div>
            <div className="carrow">
              <span
                className="ico"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--yellow)',
                  color: 'var(--on-yellow)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                <Icon name="car" size={20} />
              </span>
              <div className="grow">
                <b style={{ display: 'block', fontSize: '15px' }}>
                  {user?.car?.model || 'Hyundai Creta'}
                </b>
                <span className="sub" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {user?.car?.plate || 'KL 07 AB 4821'} · {trans}
                </span>
              </div>
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

            {/* Cashback Hint */}
            <div className="cbhint" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="gift" size={16} /> Get ₹1 to ₹5 cashback on every booking
            </div>

            {/* Wallet Balance */}
            <div
              className="row small"
              style={{
                justifyContent: 'space-between',
                margin: '12px 0 6px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span className="mut" style={{ fontSize: '14px' }}>
                Wallet balance
              </span>
              <b style={{ fontSize: '15px' }}>₹{userBalance.toLocaleString('en-IN')}</b>
            </div>

            {/* Submit Primary CTA */}
            <button
              className="btn primary block"
              style={{
                marginTop: '14px',
                width: '100%',
                borderRadius: '24px',
                padding: '16px',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer'
              }}
              onClick={handleSubmit}
            >
              Pay ₹{adv} and send request
            </button>
          </>
        )}
      </div>
    </div>
  );
}
