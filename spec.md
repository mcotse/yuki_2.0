# Yuki Care Tracker - Technical Specification

A Progressive Web App for tracking medication, food, and supplements for Yuki the dog.

---

## Overview

**Purpose**: Track and confirm daily medication administration, food, and supplements with multi-user support, offline capability, and historical logging for vet reference.

**Target Platform**: Mobile-first PWA optimized for iOS, also functional on desktop web.

**Tech Stack**:
- **Frontend**: Vue 3 + TypeScript
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: GitHub Pages with GitHub Actions CI/CD
- **Testing**: Vitest (unit) + Agent Browser (E2E)

---

## Core Features

### 1. Dashboard (Home)

The primary view showing pending and due items for the current day.

**Layout**:
- Bottom tab bar navigation (iOS style): Dashboard | History | Settings
- Items sorted by urgency: overdue first, then currently due, then upcoming
- Medications, food, and supplements all follow identical confirmation flow

**Item Cards**:
- Expand in-place on tap (no page navigation)
- Show medication name, location (LEFT eye, RIGHT eye, ORAL), and due time
- Warnings and storage notes (refrigerated) appear only in expanded view
- Snoozed items remain visible but move to bottom, showing countdown

**Confirmation Flow**:
1. Tap card to expand
2. See full details (dose, notes, warnings)
3. Optional: add a note (free text field)
4. Tap confirm button
5. Card collapses and moves to "completed" state (or disappears if desired)

**Conflict Handling** (5-minute eye drop spacing):
- Soft warning when confirming within 5 minutes of conflicting medication
- Inline countdown timer on blocked item: "Wait 2:34 before next left eye drop"
- User can override with extra tap (in case timing already elapsed IRL)

**Snooze**:
- Preset intervals: 15, 30, 60 minutes
- Snoozed items stay visible with countdown, move to bottom of list
- Re-notifies when snooze expires

**Quick Add**:
- Button to add one-time ad-hoc items
- Logged identically to scheduled items
- Does not repeat

### 2. History / Log Tab

**Filtering**:
- Filter by day (date picker)
- Future: extensible to support medication type, user, location filters

**Log Entry Display**:
- Medication/item name
- Time confirmed
- Who confirmed it (user identity)
- Optional notes
- Edit indicator if modified
- Ad-hoc items logged identically to scheduled items

**Edit Capability**:
- Can change: timestamp, who confirmed
- Cannot change: which medication (delete and re-add instead)
- Full version history preserved (before/after values for audit trail)

### 3. Settings Tab

**Medication Management** (Admin only):
- Full CRUD: Add, edit, deactivate medications
- Configure schedule times per medication (simple time pickers)
- Set active/inactive status
- Set start/end dates

**Archive Section**:
- View inactive/completed medications
- Medications with past endDate shown here, not on dashboard

**User Preferences**:
- Notification permission request/re-request
- View current user identity

**Future: Pet Profile** (for multi-pet support):
- Pet name, breed, weight (for vet reference)
- Switch between pets

### 4. Calendar View

- Accessible from dashboard (secondary navigation)
- Can view any past or future date
- Primary focus remains on "today"
- Pre-confirm future items if needed (e.g., preparing for absence)

---

## Authentication & Authorization

### Auth Flow
- Simple password-based login
- Password maps to user identity (e.g., "yuki2026" → "Matthew")
- Users stored in Supabase table (username, password hash)
- 7-day session persistence with activity refresh

### User Roles
- **Admin**: Full access - can add/edit/delete medications, manage users
- **User**: Can confirm medications, add notes, view history, snooze

### Multi-User Behavior
- Any logged-in user can confirm any item
- Log shows who confirmed each item
- No task assignment/claiming - first to confirm wins
- Occasional pet sitters may be added as temporary users

---

## Data Architecture

### Supabase Schema

```sql
-- Users table (simple auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pets table (multi-pet future-proof)
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  breed TEXT,
  weight_kg DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medications/Items definition
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES pets(id),
  type TEXT NOT NULL, -- 'medication', 'food', 'supplement'
  category TEXT, -- 'leftEye', 'rightEye', 'oral', 'food'
  name TEXT NOT NULL,
  dose TEXT,
  location TEXT, -- 'LEFT eye', 'RIGHT eye', 'ORAL', null for food
  notes TEXT, -- warnings, storage notes, etc.
  frequency TEXT NOT NULL, -- '1x_daily', '2x_daily', '4x_daily', '12h', etc.
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  conflict_group TEXT, -- items in same group need 5-min spacing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule times per item
CREATE TABLE item_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL, -- 'morning', 'midday', 'evening', 'night'
  scheduled_time TIME NOT NULL, -- actual time like '08:00'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily instances (generated daily)
CREATE TABLE daily_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES item_schedules(id),
  date DATE NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'snoozed', 'expired'
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  snooze_until TIMESTAMPTZ,
  notes TEXT,
  is_adhoc BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, schedule_id, date)
);

-- Confirmation history with version tracking
CREATE TABLE confirmation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES daily_instances(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  confirmed_at TIMESTAMPTZ NOT NULL,
  confirmed_by UUID REFERENCES users(id),
  notes TEXT,
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES users(id),
  previous_values JSONB, -- stores before state for audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflict groups for medication spacing
CREATE TABLE conflict_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'leftEye', 'rightEye'
  spacing_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Daily Instance Generation

- Supabase scheduled function runs at midnight (user's device timezone)
- Generates instances for current day + 7 days ahead
- Respects item active status and start/end dates
- Hard cutoff at midnight: unconfirmed items from yesterday auto-expire (no log entry)

### Conflict Group Logic

```typescript
interface ConflictGroup {
  name: string; // 'leftEye' | 'rightEye'
  itemIds: string[];
  spacingMinutes: number; // default 5
}

// When confirming, check last confirmation time for any item in same group
// If < spacingMinutes, show warning with countdown
// User can override (soft block)
```

---

## Offline-First Architecture

### Sync Strategy

1. **Local-First Storage**: All data cached in IndexedDB via Pinia plugin
2. **Optimistic Updates**: UI updates immediately on user action
3. **Background Sync**: Queue changes, sync when online
4. **Conflict Resolution**: Duplicate entries kept with 'duplicate' flag for manual review

### Offline Queue

```typescript
interface OfflineAction {
  id: string;
  type: 'confirm' | 'snooze' | 'edit' | 'create';
  payload: any;
  timestamp: Date;
  synced: boolean;
}
```

- Queue persists indefinitely until sync succeeds
- No warning threshold - just keep queuing
- On reconnect, process queue in order
- If two users confirm same item offline: both confirmations logged with duplicate flag

### Supabase Realtime

- Subscribe to `daily_instances` changes
- 1-5 minute acceptable sync delay
- Update local state on remote changes
- Handle merge when coming back online

---

## PWA & Notifications

### PWA Configuration

- Service worker for offline support
- Web app manifest with icons
- "Add to Home Screen" supported but not aggressively prompted
- Badge API for pending item count (iOS limitations accepted)

### Badge Logic

Badge count = due items + overdue items (not future items)

```typescript
const badgeCount = instances.filter(i =>
  i.status === 'pending' &&
  (isOverdue(i) || isDueNow(i))
).length;
```

### Notifications

- **Trigger**: Exactly at scheduled time
- **Content**: `{LOCATION}: {medication_name} due now`
  - Example: "LEFT eye: Ofloxacin 0.3% due now"
- **Limitations**: iOS PWA background push unreliable - best effort
- **Permission**: Request on first use, re-request available in Settings

---

## UI/UX Design

### Design System: Playful Geometric

Full implementation of the provided design system:

**Colors** (Tailwind config):
```javascript
colors: {
  background: '#FFFDF5', // Warm cream
  foreground: '#1E293B', // Slate 800
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  accent: '#8B5CF6', // Vivid violet (primary)
  secondary: '#F472B6', // Hot pink
  tertiary: '#FBBF24', // Amber
  quaternary: '#34D399', // Emerald
  border: '#E2E8F0',
}
```

**Typography**:
- Headings: Outfit (700-800 weight)
- Body: Plus Jakarta Sans (400-500 weight)
- Scale: 1.25 ratio (Major Third)

**Components**:
- Hard drop shadows (4px 4px 0px, no blur)
- Chunky 2px borders
- Pill-shaped buttons (rounded-full)
- Hover: translate + shadow extension
- Active: translate + shadow shrink

**Animations**:
- Bouncy easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Pop-in entrances (scale 0→1)
- Respect `prefers-reduced-motion`

**Mobile**:
- Reduce shadows to 2px
- Big tappable buttons (min 48px)
- Bottom tab navigation
- Light mode only (no dark mode)

### Navigation Structure

```
[Dashboard] [History] [Settings]
     │          │          │
     │          │          ├── Notification Preferences
     │          │          ├── Medication Management (Admin)
     │          │          ├── Archived Medications
     │          │          └── User Profile
     │          │
     │          └── Day-filtered log view
     │
     └── Today's pending items
         ├── Overdue (top)
         ├── Due now
         ├── Upcoming
         └── Snoozed (bottom)
```

---

## Timezone Handling

- Always use device's current timezone
- Schedule shifts if traveling with Yuki
- All timestamps stored as UTC in database
- Display converted to local timezone

---

## Seed Data

Initialize with current medication schedule:

### Left Eye
| Name | Dose | Frequency | Notes |
|------|------|-----------|-------|
| Ofloxacin 0.3% | 1 drop | 4x daily | - |
| Atropine 1% | 1 drop | 2x daily | May cause drooling |
| Amniotic eye drops | 1 drop | 2x daily | Refrigerated |

### Right Eye
| Name | Dose | Frequency | Notes |
|------|------|-----------|-------|
| Prednisolone acetate 1% | 1 drop | 2x daily | If squinting, STOP & call vet |
| Tacrolimus/Cyclosporine | 1 drop | 2x daily | Wash hands after. Lifelong |

### Oral
| Name | Dose | Frequency | Notes |
|------|------|-----------|-------|
| Prednisolone 5mg | 1/4 tablet | 1x daily | Do NOT stop abruptly |
| Gabapentin 50mg | 1 tablet | Every 12h | For pain, may sedate |

### Food/Supplements (to be defined)
| Name | Frequency | Notes |
|------|-----------|-------|
| Breakfast | 1x daily (morning) | - |
| Dinner | 1x daily (evening) | - |
| Vitamins | 1x daily | - |
| Probiotics | 1x daily | - |

---

## Testing Strategy

### Unit Tests (Vitest)
- Pinia store logic
- Conflict detection algorithms
- Timezone conversion utilities
- Badge count calculations
- Offline queue management

### E2E Tests (Agent Browser)
- Full confirmation flow
- Snooze and re-notification
- Offline behavior simulation
- Multi-user sync scenarios
- History editing and audit trail

---

## Deployment

### GitHub Actions Workflow

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## Future Considerations

- **Multiple Pets**: Schema supports multiple pets; UI for pet switching
- **Advanced History Filters**: Date range, medication type, user filters
- **Email/SMS Backup Notifications**: Via Supabase for critical reminders
- **Vet Export**: Generate PDF/printable medication log for vet visits
- **Medication Refill Reminders**: Track supply and remind when low

---

## Implementation Priority

### Phase 1: Core MVP
1. Vue + Vite + TypeScript + Tailwind setup
2. Supabase schema and connection
3. Basic auth (hardcoded users initially)
4. Dashboard with pending items
5. Confirmation flow (no conflicts yet)
6. Basic history view

### Phase 2: Full Features
1. Conflict detection with countdown
2. Snooze functionality
3. Offline-first with sync
4. Full history editing with audit
5. Notification system
6. PWA manifest and service worker

### Phase 3: Polish
1. Full design system implementation
2. Admin medication CRUD
3. Quick-add functionality
4. Calendar view
5. E2E tests
6. GitHub Actions deployment

---

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Conflict handling | Soft warning + override | Real-world timing may differ from app state |
| Offline strategy | Offline-first with queue | PWA should work without connectivity |
| Sync conflicts | Keep both entries | Data preservation over convenience |
| History edits | Timestamp + who | Balance flexibility with audit needs |
| Badge count | Due + overdue | Most actionable for user |
| Time windows | User-configurable per med | Different meds have different schedules |
| Notifications | Exact time | Simple and predictable |
| Missed doses | Auto-expire silently | Reduce noise, focus on current |
| Tapering | Manual (not automated) | Reduces complexity |
| Day rollover | Hard cutoff at midnight | Simple, predictable |
| Timezone | Device timezone | Travel-friendly |
| Dark mode | Light only | Design system optimized for light |
| PWA install | Nice to have | Not critical path |
| User roles | Admin + User | Protect medication config |
| Multi-pet | Future-proofed in schema | Anticipate expansion |
