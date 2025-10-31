# Cursor Rules for Automatic Context Updates

## Purpose
Ensure every code change is reflected in the `context/` documentation so future development remains context-aware.

## Mandatory Rules
- When you change code, update the relevant `context/*.md` files in the same commit.
- Prefer concise diffs: only change the sections affected by your edits.
- Reflect UI/UX, API behavior, session/auth flows, and tier limits.
- If a new behavior is introduced (e.g., endpoint param, auto-routing), document it.
- Keep Free vs Pro features clearly stated.

## What to Update
- `project-overview.md`: Product behavior, tiers, and key flows.
- `frontend-application.md`: Pages, components, routing, and UX states.
- `dns-monitoring.md`: Monitoring cadence, logic, and filters.
- `user-management.md`: Auth, sessions, verification, limits, and dashboard features.
- `development-workflow.md`: Enforce mandatory context updates per change.

## Commit Discipline
- Use conventional commits and include context files in the same commit.
- Never push feature changes without corresponding context updates.

## Examples
- Added zone selector in dashboard → Update `frontend-application.md` and `user-management.md`.
- Changed Free limit from 1→2 → Update `project-overview.md`, `user-management.md`, and `dns-monitoring.md` if cadence affected.
- New API param `?zoneId` → Update `user-management.md` (APIs) and `frontend-application.md`.


