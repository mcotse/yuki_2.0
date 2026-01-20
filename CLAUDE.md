# Project Rules

## Issue Tracking with Beads

This project uses **beads** for issue tracking. All tasks and issues are tracked in `beads.md`.

### Implementation Workflow

When a user requests any implementation:

1. **Break down the task** into discrete, actionable items
2. **Add all items to beads** (`beads.md`) before starting any work
3. **Execute on each bead** in order, marking them complete as you go

### Beads Format

Each bead in `beads.md` follows this format:

```markdown
## [BEAD-XXX] Title

- **Status**: pending | in_progress | completed
- **Created**: YYYY-MM-DD
- **Description**: Brief description of the task

### Subtasks
- [ ] Subtask 1
- [ ] Subtask 2
```

### Rules

- Never start implementation without first adding beads
- Break complex features into multiple beads
- Each bead should be a single, focused unit of work
- Update bead status as work progresses
- Reference bead IDs in commit messages when applicable
