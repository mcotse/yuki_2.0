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
