/**
 * Firebase Configuration for Phone Auth SMS OTP
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_DEMO_KEY_RIDINGO_OTP',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ridingo-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ridingo-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ridingo-app.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
