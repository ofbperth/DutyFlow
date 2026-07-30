## 2026-07-30T12:15:52Z
You are Explorer 2 for Milestone 5 (Universal Group-Scoped Shift Template & Schedule Filtering).
Working directory: c:\DEV\DutyFlow\.agents\explorer_m5_2

OBJECTIVE:
Analyze central permission helpers (`getAllowedTargetGroupIdsForHomeGroup`, `CROSS_GROUP_RULES`) and template fetching/filtering logic.

SCOPE:
1. Read `src/firebase.ts`, `src/types.ts`, `src/components/SchedulerDashboard.tsx`, and relevant helper files.
2. Analyze how shift templates owned by a group should be filtered so they are visible ONLY to users belonging to that home group or allowed target groups (`getAllowedTargetGroupIdsForHomeGroup`).
3. Check template aliases: General Weekday = เวรวันธรรมดา (`temp-group-weekday`), General Holiday = เวรวันหยุด (`temp-group-holiday`), and how they are assigned or mapped to groups.
4. Define a detailed, step-by-step refactoring proposal for how template fetching/rendering and schedule filtering across ALL doctor groups (Saraburi, 1650, ICU8S, ICU8N, ICU3, RCU, CCU, NVM, etc.) will be dynamically resolved without hardcoded special cases.

OUTPUT:
Write your complete analysis and technical design to `c:\DEV\DutyFlow\.agents\explorer_m5_2\handoff.md`.
Send a completion message back to parent.
