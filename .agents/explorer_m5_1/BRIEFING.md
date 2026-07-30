# BRIEFING — 2026-07-30T19:17:10+07:00

## Mission
Investigate hardcoded group-specific overrides, special-casing, and shift template/schedule fetching & filtering across `src/` and `tests/` for Milestone 5 (Universal Group-Scoped Shift Template & Schedule Filtering).

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator
- Working directory: c:\DEV\DutyFlow\.agents\explorer_m5_1
- Original parent: e99a297c-c2b8-4feb-a58d-f1411995b613
- Milestone: Milestone 5

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes in src/ or tests/ directly.
- Document all findings with file paths, line numbers, and proposed refactoring in handoff.md.

## Current Parent
- Conversation ID: e99a297c-c2b8-4feb-a58d-f1411995b613
- Updated: 2026-07-30T19:17:10+07:00

## Investigation State
- **Explored paths**: `src/types.ts`, `src/components/SchedulerDashboard.tsx`, `src/components/UserDashboard.tsx`, `src/components/AssignShiftModal.tsx`, `src/firebase.ts`, `tests/`.
- **Key findings**:
  - `src/types.ts` lines 98–119 hardcode group checks for `group-saraburi`, `group-1650`, `group-icu3`, `group-icu8s`, etc., excluding `group-universal` for Saraburi/1650.
  - `src/components/SchedulerDashboard.tsx` lines 566–568 and lines 1291–1293 hardcode universal template suppression for Saraburi and 1650.
  - `src/components/SchedulerDashboard.tsx` lines 873, 877, 900 use hardcoded Thai template names (`เวรวันธรรมดา`, `เวรวันหยุด`).
  - Proposed complete refactoring in `handoff.md` to dynamically evaluate allowed group IDs via `CROSS_GROUP_RULES`.
- **Unexplored areas**: None. Comprehensive codebase inspection complete.

## Key Decisions Made
- Derived dynamic implementation for `getAllowedTargetGroupIdsForHomeGroup` based on `CROSS_GROUP_RULES` that eliminates all group-specific hardcoded `if` statements.
- Prepared 5-component handoff report in `c:\DEV\DutyFlow\.agents\explorer_m5_1\handoff.md`.

## Artifact Index
- c:\DEV\DutyFlow\.agents\explorer_m5_1\ORIGINAL_REQUEST.md — Initial request log
- c:\DEV\DutyFlow\.agents\explorer_m5_1\BRIEFING.md — Working memory index
- c:\DEV\DutyFlow\.agents\explorer_m5_1\progress.md — Progress log
- c:\DEV\DutyFlow\.agents\explorer_m5_1\handoff.md — Final 5-component Handoff Report
