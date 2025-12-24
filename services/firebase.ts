
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// NOTE: Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAbQWI8JJJZxi4u2m3CpXoVXo_tfV9idQ",
  authDomain: "spanish-reading-7f2f6.firebaseapp.com",
  projectId: "spanish-reading-7f2f6",
  storageBucket: "spanish-reading-7f2f6.firebasestorage.app",
  messagingSenderId: "199552752380",
  appId: "1:199552752380:web:7f00e4d764d4cefcde5579",
  measurementId: "G-B41M23QF87"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with settings to ignore undefined properties
// This prevents crashes when saving objects with optional fields like 'category'
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
