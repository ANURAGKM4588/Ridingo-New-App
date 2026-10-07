/**
 * Real-Time Communication Hub between User App and Driver App
 * Uses BroadcastChannel with localStorage storage-event fallback
 * to guarantee instant real-time sync across preview tabs, windows, and apps.
 */

class RealtimeHub {
  constructor() {
    this.listeners = new Map();
    this.channel = null;

    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('ridingo_realtime_bus');
          this.channel.onmessage = (event) => {
            if (event?.data && event.data.type) {
              this._dispatchLocal(event.data.type, event.data.payload);
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel initialization fallback:', e);
      }

      // Storage event fallback for cross-window syncing
      window.addEventListener('storage', (e) => {
        if (e.key === 'ridingo_realtime_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data && data.type) {
              this._dispatchLocal(data.type, data.payload);
            }
          } catch (err) {}
        }
      });
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
        this.channel.postMessage({ type, payload, timestamp: Date.now() });
      } catch (e) {}
    }

    // 3. Fallback via localStorage storage event
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'ridingo_realtime_event',
          JSON.stringify({ type, payload, ts: Date.now(), rand: Math.random() })
        );
      } catch (e) {}
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

  completeRide(tripId, details = {}) {
    this.emit('TRIP_COMPLETED', { tripId, ...details, timestamp: Date.now() });
  }
}

export const realtime = new RealtimeHub();
export default realtime;
