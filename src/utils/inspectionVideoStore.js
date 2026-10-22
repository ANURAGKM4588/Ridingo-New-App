/**
 * inspectionVideoStore.js
 * Persistent IndexedDB storage for Driver's Real Recorded Inspection Videos.
 * 
 * Ensures recorded inspection video blobs survive across page reloads, tab switches,
 * app restarts, and offline mode.
 */

const DB_NAME = 'ridingo_inspection_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'inspection_videos';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn('[VideoStore] IndexedDB open error:', event.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('[VideoStore] IndexedDB init exception:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

// In-memory active blob URL cache for rapid playback without re-allocating
const activeBlobUrlCache = new Map();

/**
 * Save driver's real recorded video blob into persistent IndexedDB
 * @param {string} tripId
 * @param {Blob} videoBlob
 * @param {object} metadata
 */
export async function saveRecordedVideo(tripId, videoBlob, metadata = {}) {
  if (!videoBlob) return null;

  try {
    const db = await getDB();
    const timestamp = Date.now();
    const record = {
      id: String(tripId || 'latest'),
      blob: videoBlob,
      mimeType: videoBlob.type || 'video/webm',
      size: videoBlob.size,
      timestamp,
      metadata
    };

    if (db) {
      await new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(record);
          // Also save under 'latest' for instant access if tripId changes
          store.put({ ...record, id: 'latest' });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    // Generate fresh live URL for current session
    const liveUrl = URL.createObjectURL(videoBlob);
    activeBlobUrlCache.set(String(tripId || 'latest'), liveUrl);
    activeBlobUrlCache.set('latest', liveUrl);

    console.info(`[VideoStore] Successfully saved recorded video for trip ${tripId} (${(videoBlob.size / 1024).toFixed(1)} KB)`);
    return liveUrl;
  } catch (e) {
    console.warn('[VideoStore] Failed to save video to IndexedDB:', e);
    // Fallback: still return in-memory blob URL for current session
    const liveUrl = URL.createObjectURL(videoBlob);
    activeBlobUrlCache.set(String(tripId || 'latest'), liveUrl);
    return liveUrl;
  }
}

/**
 * Get valid playable video URL for a given trip.
 * Generates a fresh living Blob URL from IndexedDB if the previous one expired.
 * @param {string} tripId
 * @returns {Promise<string|null>}
 */
export async function getRecordedVideoUrl(tripId) {
  const key = String(tripId || 'latest');

  // Check in-memory live URL first
  if (activeBlobUrlCache.has(key)) {
    return activeBlobUrlCache.get(key);
  }

  try {
    const db = await getDB();
    if (!db) return null;

    const record = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });

    if (record && record.blob) {
      const freshUrl = URL.createObjectURL(record.blob);
      activeBlobUrlCache.set(key, freshUrl);
      return freshUrl;
    }

    // Try fallback to 'latest' if looking up a specific trip ID
    if (key !== 'latest') {
      const latestRecord = await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get('latest');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });

      if (latestRecord && latestRecord.blob) {
        const freshUrl = URL.createObjectURL(latestRecord.blob);
        activeBlobUrlCache.set(key, freshUrl);
        return freshUrl;
      }
    }
  } catch (e) {
    console.warn('[VideoStore] Error fetching recorded video:', e);
  }

  return null;
}

/**
 * Check if a driver recorded video exists for this trip or session
 * @param {string} tripId
 * @returns {Promise<boolean>}
 */
export async function hasRecordedVideo(tripId) {
  const key = String(tripId || 'latest');
  if (activeBlobUrlCache.has(key) || activeBlobUrlCache.has('latest')) return true;

  try {
    const db = await getDB();
    if (!db) return false;

    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) resolve(true);
          else {
            // Check 'latest'
            const reqLatest = store.get('latest');
            reqLatest.onsuccess = () => resolve(!!reqLatest.result);
            reqLatest.onerror = () => resolve(false);
          }
        };
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  } catch (_) {
    return false;
  }
}
