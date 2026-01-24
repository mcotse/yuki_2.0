# Migration Plan: GitHub Pages + Firebase

Migrate Yuki Care Tracker from Supabase to Firebase, hosted on GitHub Pages.

## Architecture Overview

| Component | Current | Target |
|-----------|---------|--------|
| Hosting | None | GitHub Pages |
| Database | Supabase PostgreSQL | Firestore |
| Auth | Custom password-based | Firebase Auth |
| Push Notifications | Shell only | Firebase Cloud Messaging |

---

## Phase 1: Firebase Console Setup

Since you already have a Firebase project, here's what to enable/configure:

### 1.1 Enable Services (Firebase Console)

**Authentication:**
1. Go to Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Go to Users tab → Add user:
   - Email: `yuki2026@yuki.app`
   - Password: `yuki2026`
   - (Add more users as needed with same pattern)

**Firestore:**
1. Go to Firestore Database → Create database
2. Start in **test mode** (we'll add rules later)
3. Choose region closest to your users

**Cloud Messaging (for push notifications):**
1. Go to Project Settings → Cloud Messaging
2. Under "Web Push certificates", click "Generate key pair"
3. Copy the VAPID key (you'll need this for FCM)

### 1.2 Get Web App Config

1. Go to Project Settings → General
2. Under "Your apps", click web icon (`</>`) to add a web app
3. Register app name (e.g., "Yuki Care Tracker")
4. Copy the `firebaseConfig` object - you'll need these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### 1.3 Create Initial User Document

After creating the auth user, add their Firestore document:
1. Go to Firestore → Start collection → `users`
2. Document ID: Copy the UID from Authentication → Users
3. Fields:
   - `displayName`: "Matthew" (string)
   - `role`: "admin" (string)
   - `createdAt`: (timestamp)

**Files to create:**
- `src/lib/firebase.ts` - Firebase initialization with offline persistence

**Dependencies:**
```bash
npm uninstall @supabase/supabase-js
npm install firebase
```

**Environment variables:**
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_VAPID_KEY
```

---

## Phase 2: Firestore Data Model

### Collection Structure

```
/users/{userId}
  - email, displayName, role, fcmToken, createdAt

/pets/{petId}
  - name, breed, weightKg, notes, createdAt

/items/{itemId}
  - petId, type, category, name, dose, location, frequency, active
  - conflictGroup, startDate, endDate, createdAt, updatedAt
  - schedules: [] (embedded array)

/dailyInstances/{instanceId}
  - itemId, scheduleId, date (YYYY-MM-DD), scheduledTime, status
  - confirmedAt, confirmedBy, snoozeUntil, notes, isAdhoc
  - itemName, itemType, itemCategory, itemDose (denormalized)

/conflictGroups/{groupId}
  - name, spacingMinutes

/confirmationHistory/{historyId}
  - instanceId, version, confirmedAt, confirmedBy, notes, previousValues
```

**Files to modify:**
- `src/types/database.ts` - Create Firestore-compatible types

---

## Phase 3: Authentication Migration

**Approach:** Keep password-only UX, use Firebase Auth behind the scenes with a fixed email pattern.

**Files to modify:**
- `src/stores/auth.ts` - Use Firebase Auth with password-derived email
- `src/views/LoginView.vue` - No changes needed (stays password-only)

**Key changes:**
- Map password to email internally: `{password}@yuki.app`
- Use `signInWithEmailAndPassword(auth, `${password}@yuki.app`, password)`
- Pre-create users in Firebase with this email pattern
- Fetch user role from Firestore `/users/{uid}` document
- Remove hardcoded `USER_CREDENTIALS` mapping
- Firebase handles session persistence automatically

**Firebase Console setup:**
- Create user: `yuki2026@yuki.app` with password `yuki2026`
- Link to Firestore `/users/{uid}` with role: admin

---

## Phase 4: Store Migrations

### 4.1 Items Store (`src/stores/items.ts`)
- Replace Supabase queries with Firestore: `getDocs`, `addDoc`, `updateDoc`
- Remove separate schedules fetch (now embedded in items)

### 4.2 Instances Store (`src/stores/instances.ts`)
- Query by date: `where('date', '==', dateString)`
- Use `updateDoc` for status changes
- Optional: Add `onSnapshot` for real-time updates

### 4.3 History Store (`src/stores/history.ts`)
- Compound query: `where('date', '==', date), where('status', '==', 'confirmed')`

### 4.4 Instance Generator (`src/services/instanceGenerator.ts`)
- Use `writeBatch` for bulk instance creation
- Include denormalized item data in each instance

---

## Phase 5: Push Notifications (FCM)

**Files to modify:**
- `public/sw.js` - Add FCM background message handler

**Files to create:**
- `src/services/notificationService.ts` - Token management, permission requests

**Key implementation:**
1. Request notification permission on login
2. Get FCM token and store in user document
3. Handle foreground messages with `onMessage`
4. Handle background messages in service worker

---

## Phase 6: GitHub Pages Deployment

**Files to modify:**
- `vite.config.ts` - Set `base: '/yuki_2.0/'` (or custom domain)
- `.github/workflows/ci.yml` - Add deployment job

**Files to create:**
- `public/404.html` - SPA redirect for client-side routing

**GitHub Actions deployment job:**
```yaml
deploy:
  needs: [build]
  if: github.ref == 'refs/heads/main'
  permissions:
    pages: write
    id-token: write
  steps:
    - uses: actions/download-artifact@v4
    - uses: actions/configure-pages@v4
    - uses: actions/upload-pages-artifact@v3
    - uses: actions/deploy-pages@v4
```

**Repository settings:**
- Enable GitHub Pages with source "GitHub Actions"
- Add Firebase env vars as repository secrets

---

## Phase 7: Security & Testing

### Firestore Security Rules
- Authenticated users: read all, write to dailyInstances
- Admin only: write to items, pets, users, conflictGroups

### Testing Updates
- Mock Firebase Auth and Firestore in unit tests
- Update `src/stores/__tests__/*.spec.ts`

### Data Migration
- Create one-time script to migrate Supabase data to Firestore
- Map existing user IDs to Firebase UIDs

---

## File Summary

| Action | Files |
|--------|-------|
| Create | `src/lib/firebase.ts`, `public/404.html`, `firestore.rules` |
| Modify | `src/stores/auth.ts`, `src/stores/items.ts`, `src/stores/instances.ts`, `src/stores/history.ts`, `src/services/instanceGenerator.ts`, `src/views/LoginView.vue`, `src/types/database.ts`, `public/sw.js`, `.github/workflows/ci.yml`, `vite.config.ts`, `package.json` |
| Delete | `src/lib/supabase.ts` (after migration complete) |

---

## Verification

1. **Auth**: Login with password, verify session persists
2. **Data**: Dashboard loads instances, confirm/snooze works
3. **Offline**: Disconnect network, verify cached data loads
4. **Notifications**: Request permission, receive test push
5. **Deployment**: Verify GitHub Pages URL loads correctly
6. **PWA**: Install app, verify offline functionality
