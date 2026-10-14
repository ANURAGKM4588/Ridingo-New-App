/**
 * Real-Time Communication Hub between User App and Driver App
 * Connects User App and Driver App across:
 * 1. Supabase Cloud Realtime Channel (WebSockets across separate devices & mobile apps)
 * 2. BroadcastChannel ('ridingo_realtime_bus' across browser tabs)
 * 3. localStorage StorageEvent & Persistent Active Request cache
 */

import { supabase } from '../lib/supabase';

const ACTIVE_TRIP_KEY = 'ridingo_active_trip_request';
const SHARED_TRIPS_KEY = 'ridingo_shared_trips';
const REALTIME_EVENT_KEY = 'ridingo_realtime_event';

class RealtimeHub {
  constructor() {
    this.listeners = new Map();
    this.clientId = 'client_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    this.channel = null;
    this.sbChannel = null;

    if (typeof window !== 'undefined') {
      // 1. Browser BroadcastChannel
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('ridingo_realtime_bus');
          this.channel.onmessage = (event) => {
            if (event?.data && event.data.type && event.data.senderId !== this.clientId) {
              this._dispatchLocal(event.data.type, event.data.payload);
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel initialization fallback:', e);
      }

      // 2. localStorage StorageEvent fallback
      window.addEventListener('storage', (e) => {
        if (e.key === REALTIME_EVENT_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data && data.type && data.senderId !== this.clientId) {
              this._dispatchLocal(data.type, data.payload);
            }
          } catch (err) {}
        }
      });

      // 3. Supabase Cloud Realtime WebSocket Channel
      try {
        if (supabase && typeof supabase.channel === 'function') {
          this.sbChannel = supabase.channel('ridingo_dispatch_bus');
          this.sbChannel
            .on('broadcast', { event: 'dispatch' }, ({ payload }) => {
              if (payload && payload.type && payload.senderId !== this.clientId) {
                this._dispatchLocal(payload.type, payload.data);
              }
            })
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                // Connected to Supabase real-time cloud dispatch
              }
            });
        }
      } catch (err) {
        console.warn('Supabase Realtime bus initialization error:', err);
      }
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);

    // Return unbind function
    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(callback);
      }
    };
  }

  _dispatchLocal(type, payload) {
    // Automatically manage persistent active trip storage
    if (type === 'TRIP_REQUESTED' && payload) {
      this._persistActiveTrip(payload);
    } else if (['TRIP_ACCEPTED', 'TRIP_DECLINED', 'TRIP_COMPLETED'].includes(type)) {
      this._clearActiveTrip(payload?.tripId);
    }

    const set = this.listeners.get(type);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in realtime listener for ${type}:`, e);
        }
      });
    }
  }

  emit(type, payload) {
    // 1. Dispatch locally in active context
    this._dispatchLocal(type, payload);

    // 2. Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage({
          type,
          payload,
          senderId: this.clientId,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    // 3. Broadcast via localStorage storage event
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          REALTIME_EVENT_KEY,
          JSON.stringify({
            type,
            payload,
            senderId: this.clientId,
            ts: Date.now(),
            rand: Math.random()
          })
        );
      } catch (e) {}
    }

    // 4. Broadcast via Supabase Cloud Realtime Channel
    if (this.sbChannel && typeof this.sbChannel.send === 'function') {
      try {
        this.sbChannel.send({
          type: 'broadcast',
          event: 'dispatch',
          payload: {
            type,
            data: payload,
            senderId: this.clientId,
            timestamp: Date.now()
          }
        }).catch(() => {});
      } catch (e) {}
    }
  }

  // Active Trip Persistence in localStorage
  _persistActiveTrip(trip) {
    if (typeof localStorage === 'undefined' || !trip) return;
    try {
      const record = {
        trip,
        timestamp: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes validity
      };
      localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(record));

      // Also append to shared trips cache
      const raw = localStorage.getItem(SHARED_TRIPS_KEY);
      let list = raw ? JSON.parse(raw) : [];
      list = [trip, ...list.filter(t => t.id !== trip.id && t.status !== 'requested')].slice(0, 20);
      localStorage.setItem(SHARED_TRIPS_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  _clearActiveTrip(tripId) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
      if (raw) {
        const record = JSON.parse(raw);
        if (!tripId || record?.trip?.id === tripId) {
          localStorage.removeItem(ACTIVE_TRIP_KEY);
        }
      }
    } catch (e) {}
  }

  getActiveTripRequest() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
      if (!raw) return null;
      const record = JSON.parse(raw);
      if (record && record.expiresAt && Date.now() < record.expiresAt && record.trip) {
        return record.trip;
      }
      localStorage.removeItem(ACTIVE_TRIP_KEY);
    } catch (e) {}
    return null;
  }

  getSharedTrips() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SHARED_TRIPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Convenience helper methods
  requestRide(trip) {
    this.emit('TRIP_REQUESTED', trip);
  }

  acceptRide(tripId, driver) {
    this.emit('TRIP_ACCEPTED', { tripId, driver, timestamp: Date.now() });
  }

  declineRide(tripId) {
    this.emit('TRIP_DECLINED', { tripId, timestamp: Date.now() });
  }

  arrivedAtPickup(tripId) {
    this.emit('ARRIVED_PICKUP', { tripId, timestamp: Date.now() });
  }

  verifyStartOtp(tripId) {
    this.emit('START_OTP_VERIFIED', { tripId, timestamp: Date.now() });
  }

  verifyConditionCheck(tripId, photos, scratches) {
    this.emit('CONDITION_VERIFIED', { tripId, photos, scratches, timestamp: Date.now() });
  }

  startRide(tripId) {
    this.emit('TRIP_STARTED', { tripId, timestamp: Date.now() });
  }

  requestEndTrip(tripId, endOtp) {
    this.emit('END_OTP_REQUESTED', { tripId, endOtp, timestamp: Date.now() });
  }

  // Live GPS Telemetry Stream (Driver App -> User App)
  updateDriverLocation({ tripId, lat, lng, heading = 0, speed = 0 }) {
    this.emit('LOCATION_UPDATE', {
      tripId,
      lat,
      lng,
      heading,
      speed,
      timestamp: Date.now()
    });
  }

  completeRide(tripId, details = {}) {
    this.emit('TRIP_COMPLETED', { tripId, ...details, timestamp: Date.now() });
  }
}

/**
 * Secure 4-digit OTP Generator using WebCrypto API
 */
export function generateSecureOtp(length = 4) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const min = Math.pow(10, length - 1);
      const max = Math.pow(10, length) - 1;
      return String(min + (array[0] % (max - min + 1)));
    }
  } catch (e) {}
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export const realtime = new RealtimeHub();
export default realtime;
