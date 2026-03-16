import 'react-native-get-random-values';

// Polyfill AbortSignal.any for Hermes (React Native),
// which the Firebase AI SDK requires but Hermes doesn't provide.
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any !== 'function') {
  AbortSignal.any = function any(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
  };
}

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth, type Auth } from "firebase/auth";
// @ts-ignore - Metro resolves the React Native persistence export at runtime
import { getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";
import { 
  getAI, 
  getGenerativeModel, 
  type GenerativeModel,
  GoogleAIBackend 
} from 'firebase/ai';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
export const REGISTRATION_API_KEY = process.env.REGISTRATION_API_KEY;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isAppUninitialized = getApps().length === 0;
export const app = isAppUninitialized ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

const initializeFirebaseAuth = (): Auth => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  if (!isAppUninitialized) {
    return getAuth(app);
  }

  // Persist auth state across app restarts via AsyncStorage
  return initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
};

export const auth: Auth = initializeFirebaseAuth();

let aiModelInstance: GenerativeModel | null = null;

export const getGeminiModel = (): GenerativeModel => {
  if (aiModelInstance) {
    return aiModelInstance;
  }

  const ai = getAI(app, {
    backend: new GoogleAIBackend()
  });

  aiModelInstance = getGenerativeModel(ai, {
    model: "gemini-3-flash-preview"
  });

  return aiModelInstance;
};