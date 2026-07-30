## 2026-07-30T19:15:52+07:00
You are Explorer 1 for Milestone 5 (Universal Group-Scoped Shift Template & Schedule Filtering).
Working directory: c:\DEV\DutyFlow\.agents\explorer_m5_1

OBJECTIVE:
Investigate all hardcoded group-specific overrides, special-casing, or hardcoded strings (e.g., 'group-saraburi', 'group-1650', 'saraburi', '1650', etc.) across the entire codebase (`src/components/SchedulerDashboard.tsx`, `src/firebase.ts`, `src/types.ts`, and any other files).

SCOPE:
1. Search for all occurrences of hardcoded group IDs or group-specific logic across `src/` and `tests/`.
2. Map out how shift templates are currently fetched, stored, rendered, and filtered in `SchedulerDashboard.tsx`, `firebase.ts`, and related components.
3. Detail every line of code or component where group filtering or special-casing needs to be refactored to use dynamic permission helpers (`getAllowedTargetGroupIdsForHomeGroup`, `CROSS_GROUP_RULES`).

OUTPUT:
Write your complete analysis to `c:\DEV\DutyFlow\.agents\explorer_m5_1\handoff.md`.
Include concrete file paths, line numbers, and recommended refactoring changes.
Send a completion message back to parent.
