import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth } from "firebase/auth";
// @ts-ignore - TS reads web types by default, but Metro finds this at runtime on mobile
import { getReactNativePersistence } from "firebase/auth"; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native"; // 1. Import Platform

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
export const REGISTRATION_API_KEY = process.env.REGISTRATION_API_KEY;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
};

// Check if Firebase is already initialized
const isAppUninitialized = getApps().length === 0;

export const app = isAppUninitialized ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// 2. Initialize Auth conditionally
const initializeFirebaseAuth = () => {
  // If we are running on the web, use the standard getAuth (handles persistence automatically)
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  // If we are on iOS/Android, use the React Native persistence layer
  return isAppUninitialized 
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      })
    : getAuth(app);
};

export const auth = initializeFirebaseAuth();