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
