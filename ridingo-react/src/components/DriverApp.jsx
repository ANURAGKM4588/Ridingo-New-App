import React from 'react';
import { useApp } from '../context/AppContext';

export default function DriverApp() {
  const { trips, setTrips, driverOnline, setDriverOnline, addToast } = useApp();

  const requestedTrip = trips.find(t => t.status === 'requested');
  const inProgressTrip = trips.find(t => t.status === 'inprogress');

  const acceptTrip = (tripId) => {
    setTrips(prev => prev.map(t => {
      if (t.id === tripId) {
        return { ...t, status: 'inprogress', driver: 'Ravi Kumar' };
      }
      return t;
    }));
    addToast('Trip accepted! Navigating to customer pickup', 'check');
  };

  const completeTrip = (tripId) => {
    setTrips(prev => prev.map(t => {
      if (t.id === tripId) {
        return { ...t, status: 'completed' };
      }
      return t;
    }));
    addToast('Trip completed! Earnings credited to wallet', 'check');
  };

  return (
    <div className="inner">
      <div className="island" aria-hidden="true" />
      <div className="statusbar" />

      <div className="content" style={{ padding: '20px' }}>
        {/* Driver Status Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: 'var(--card)',
            borderRadius: '20px',
            border: '1px solid var(--line)',
            marginBottom: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: driverOnline ? 'var(--good)' : 'var(--muted)'
                }}
              />
              <b style={{ fontSize: '16px' }}>{driverOnline ? 'Online • Accepting' : 'Offline'}</b>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Ravi Kumar (Chauffeur)
            </div>
          </div>

          <button
            className="btn sm"
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              background: driverOnline ? 'var(--good-soft)' : 'var(--chip)',
              color: driverOnline ? 'var(--good)' : 'var(--muted)',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            onClick={() => setDriverOnline(!driverOnline)}
          >
            {driverOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        {/* Incoming Trip Request */}
        {driverOnline && requestedTrip && (
          <div
            style={{
              padding: '20px',
              borderRadius: '22px',
              background: 'var(--card)',
              border: '2px solid var(--yellow)',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(255, 199, 10, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="live-badge" style={{ color: 'var(--on-yellow)', background: 'var(--yellow)' }}>
                NEW RIDE REQUEST
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800 }}>₹{requestedTrip.fare}</span>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              Rider: {requestedTrip.rider?.name || 'Customer'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
              Car: {requestedTrip.car?.model} ({requestedTrip.car?.plate})
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.4', marginBottom: '16px' }}>
              📍 <b>Pickup:</b> {requestedTrip.pickup}<br />
              🏁 <b>Drop:</b> {requestedTrip.drop_loc || 'Flexible'}
            </div>

            <button
              className="btn"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--yellow)',
                color: 'var(--on-yellow)',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer'
              }}
              onClick={() => acceptTrip(requestedTrip.id)}
            >
              Accept Ride Request
            </button>
          </div>
        )}

        {/* In-Progress Ride */}
        {inProgressTrip && (
          <div
            style={{
              padding: '20px',
              borderRadius: '22px',
              background: 'var(--card)',
              border: '2px solid var(--good)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="pill good">ON TRIP</span>
              <span style={{ fontSize: '16px', fontWeight: 700 }}>₹{inProgressTrip.fare}</span>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Passenger: {inProgressTrip.rider?.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', marginBottom: '16px' }}>
              {inProgressTrip.pickup} → {inProgressTrip.drop_loc}
            </div>

            <button
              className="btn"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--good)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer'
              }}
              onClick={() => completeTrip(inProgressTrip.id)}
            >
              Finish Trip & Collect Fare
            </button>
          </div>
        )}

        {/* Daily Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '16px', background: 'var(--card)', borderRadius: '18px', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Today's Earnings</span>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>₹1,495</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--card)', borderRadius: '18px', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Completed Trips</span>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>3 Rides</div>
          </div>
        </div>
      </div>
    </div>
  );
}
