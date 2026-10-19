/**
 * Firebase Configuration for Phone Auth SMS OTP
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDyKbwEU2_y3fb1F5U3wV_QKuK3wn7ObRg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ridingo-bd466.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ridingo-bd466',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ridingo-bd466.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1013815921601',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1013815921601:web:0fe9f4655b3ad9c8233d40'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
