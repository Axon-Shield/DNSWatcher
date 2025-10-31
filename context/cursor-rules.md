# Cursor Rules for Automatic Context Updates

## Purpose
Ensure every code change is reflected in the `context/` documentation so future development remains context-aware.

## Mandatory Rules
- When you change code, update the relevant `context/*.md` files in the same commit.
- Prefer concise diffs: only change the sections affected by your edits.
- Reflect UI/UX, API behavior, session/auth flows, and tier limits.
- If a new behavior is introduced (e.g., endpoint param, auto-routing), document it.
- Keep Free vs Pro features clearly stated.

## Browser Debugging Rules
- Do NOT start external Edge/Chrome with remote debugging.
- Use Cursor's inbuilt Chrome browser to reproduce issues and capture JS console logs.
- Prefer capturing console output directly via the inbuilt console tool when investigating frontend errors.

## Automation & Discipline Rules
- After implementing any change (code, config, or docs), you MUST:
  1) Deploy relevant cloud artifacts (e.g., Supabase Edge Functions) immediately.
  2) Update all impacted `context/*.md` documents to reflect behavior and operational changes.
  3) Commit with a conventional commit message and push to the default branch.
- Apply the above on every prompt where changes are made. If an item is intentionally skipped, note the reason explicitly in the status update.

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


