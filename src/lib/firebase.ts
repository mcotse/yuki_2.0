import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getMessaging, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Check if Firebase should be used
// Requires VITE_USE_FIREBASE=true AND valid config
const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true'
const hasConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
)
const isConfigured = useFirebase && hasConfig

if (!isConfigured) {
  console.warn(
    'Firebase environment variables not set. Running in offline-only mode.'
  )
}

// Initialize Firebase app
let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let messaging: Messaging | null = null

if (isConfigured) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)

  // Enable offline persistence for Firestore
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence unavailable: multiple tabs open')
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('Firestore persistence not supported in this browser')
    }
  })

  // Initialize messaging only if supported
  if ('Notification' in window && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app)
    } catch {
      console.warn('Firebase Messaging not available')
    }
  }
}

/**
 * Firebase app instance
 */
export { app }

/**
 * Firestore database instance
 */
export { db }

/**
 * Firebase Auth instance
 */
export { auth }

/**
 * Firebase Cloud Messaging instance
 */
export { messaging }

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return isConfigured
}
