## 2026-07-30T12:18:18Z
You are Worker 1 for Milestone 5 (Universal Group-Scoped Shift Template & Schedule Filtering).
Working directory: c:\DEV\DutyFlow\.agents\implementer_m5_1

OBJECTIVE:
Refactor template fetching, rendering, and filtering logic across all doctor groups (R1, R2, R3) and implement the M5 test suite.

BACKGROUND & SPECIFICATIONS:
Read the 3 Explorer handoff reports before modifying any files:
- `c:\DEV\DutyFlow\.agents\explorer_m5_1\handoff.md`
- `c:\DEV\DutyFlow\.agents\explorer_m5_2\handoff.md`
- `c:\DEV\DutyFlow\.agents\explorer_m5_3\handoff.md`

REQUIRED IMPLEMENTATION STEPS:
1. `src/types.ts`:
   - Export `NON_UNIVERSAL_GROUPS = new Set<string>(['group-saraburi', 'group-1650']);`
   - Refactor `getAllowedTargetGroupIdsForHomeGroup(homeGroupId: string, groups?: DoctorGroup[])` to be 100% dynamic without hardcoded `if` branches per group:
     - Always include `homeGroupId` and `'group-pooled'`.
     - Include `'group-universal'` unless the group is non-universal (`NON_UNIVERSAL_GROUPS.has(homeGroupId)` or `groups?.find(g => g.id === homeGroupId)?.isUniversal === false`).
     - Dynamically invert `CROSS_GROUP_RULES` (`Object.entries(CROSS_GROUP_RULES)`): for target groups where `allowedHomeGroups.includes(homeGroupId)`, add `targetGroupId`.

2. `src/components/SchedulerDashboard.tsx` (and related components if applicable):
   - Remove hardcoded `(myGroupId === 'group-saraburi' || myGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))` checks in `filteredTemplates` (line 566) and Assigning Cell Modal (line 1291).
   - Replace hardcoded Thai string checks (`['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name)`) in sidebar filters (lines 873, 877, 900) with `t.groupId === 'group-universal'`.
   - Ensure shift templates and schedule/calendar views resolve visibility dynamically for ALL doctor groups (Saraburi, 1650, ICU8S, ICU8N, ICU3, RCU, CCU, NVM groups, etc.).

3. `tests/m5-group-scoping-filtering.test.ts` & `tests/run-tests.ts`:
   - Create `tests/m5-group-scoping-filtering.test.ts` containing the 11 unit/integration test cases specified by Explorer 3 (`R1-TPL-01..04`, `R2-SCHED-01..04`, `R3-PERM-01..03`).
   - Register `tests/m5-group-scoping-filtering.test.ts` in `tests/run-tests.ts` so `npm test` runs all tests.

4. Run build and tests:
   - Run `npm run lint` (`npx tsc --noEmit`)
   - Run `npm test`
   - Run `npm run build`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

OUTPUT:
Write your complete handoff report with build/test results to `c:\DEV\DutyFlow\.agents\implementer_m5_1\handoff.md`.
Send a completion message back to parent.
