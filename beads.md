# Beads - Issue Tracking

> All implementation tasks are tracked here. See CLAUDE.md for workflow details.

---

<!-- Add new beads below this line -->

## [BEAD-001] Fix archived medication reminders showing on dashboard

- **Status**: completed
- **Created**: 2026-02-07
- **Description**: Archived medications still show reminders on the dashboard (e.g., Ofloxacin 0.3% appears as OVERDUE despite being archived). The instance generator correctly skips archived items for new instance creation, but when fetching existing instances from the database, the join logic does not filter out instances belonging to inactive items.

### Subtasks
- [x] Filter out archived items in `fetchInstancesForDate` (both local and Firebase paths)
- [x] Filter out archived items in `fetchUpcomingDaysInstances` (both local and Firebase paths)

## [BEAD-002] Add swipe-to-delete for reminder cards on dashboard

- **Status**: completed
- **Created**: 2026-02-07
- **Description**: Allow users to delete a reminder instance from the dashboard without completing it, by swiping left to reveal a delete button.

### Subtasks
- [x] Add `deleteInstance` method to `localData.ts`
- [x] Add `deleteInstance` action to instances Pinia store (Firestore + localStorage)
- [x] Add swipe-left gesture handling to `MedicationCard.vue` to reveal delete button
- [x] Wire up `delete` event in `DashboardView.vue`
- [x] Add swipe and delete CSS animations to `main.css`

## [BEAD-003] Fix swipe-to-delete card visual inconsistency

- **Status**: completed
- **Created**: 2026-02-07
- **Description**: When swiping a card to reveal the delete button, the card shadow is clipped by the swipe container's `overflow: hidden` and the card border creates a visual seam. The shadow and border need to be moved to the container level for consistent appearance.

### Subtasks
- [x] Move card border and shadow to `.swipe-container-active` instead of `.swipe-card`
- [x] Ensure non-swiped cards still look consistent
- [x] Ensure delete button area integrates visually with card
- [x] Keep compact cards unaffected via `.swipe-container-compact`

## [BEAD-004] Fix bottom nav bar overlapped by scrolling content

- **Status**: completed
- **Created**: 2026-02-07
- **Description**: The `BottomTabBar` uses `position: fixed` but has no `z-index`, while medication cards have `position: relative; z-index: 1` on `.swipe-card`. This causes cards to render on top of the nav bar when scrolling.

### Subtasks
- [x] Add `z-50` to `BottomTabBar` component
- [x] Verify cards scroll behind the nav bar

## [BEAD-005] Fix GitHub Pages SPA routing (missing 404.html)

- **Status**: completed
- **Created**: 2026-02-07
- **Description**: Pages fail to load on GitHub Pages when navigating directly to a sub-route or refreshing on one (e.g., `/yuki_2.0/history`). GitHub Pages returns a 404 because no actual file exists at that path. Need to copy `index.html` to `404.html` during the deploy build so GitHub Pages serves the SPA shell for all routes.

### Subtasks
- [x] Add post-build step to deploy workflow to copy index.html to 404.html

## [BEAD-006] Fix broken asset paths for GitHub Pages base path

- **Status**: completed
- **Created**: 2026-02-07
- **Description**: Several static asset references use root-relative paths (`/`) that don't resolve correctly on GitHub Pages where the app is served from `/yuki_2.0/`. Vite rewrites JS/CSS/manifest links but not inline scripts or public JSON files.

### Subtasks
- [x] Fix service worker registration path in index.html inline script
- [x] Fix manifest.json `start_url`, `scope`, and icon paths
- [x] Fix sw.js cached static asset paths
- [x] Clean up apple-touch-icon references (icons directory doesn't exist)
