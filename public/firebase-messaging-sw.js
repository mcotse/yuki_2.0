// Firebase Messaging Service Worker
// This handles background push notifications from Firebase Cloud Messaging

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Initialize Firebase with your config
// Note: These values must match your .env.local configuration
firebase.initializeApp({
  apiKey: 'AIzaSyCwpMZFbfHFdKrWvhLlvm1ND4Drcv7zCt4',
  authDomain: 'yuki-dash.firebaseapp.com',
  projectId: 'yuki-dash',
  storageBucket: 'yuki-dash.firebasestorage.app',
  messagingSenderId: '406590006887',
  appId: '1:406590006887:web:2edfef627ea7ae93d596c2',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload)

  const notificationTitle = payload.notification?.title || 'Yuki Care Reminder'
  const notificationOptions = {
    body: payload.notification?.body || 'Time to give medication',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'confirm', title: 'Confirm' },
      { action: 'snooze', title: 'Snooze 15m' },
    ],
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})
