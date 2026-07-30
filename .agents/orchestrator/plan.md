# Orchestration Plan — DutyFlow Group-Scoped Shift Template & Schedule Filtering

## Objectives
1. **R1. Universal & Group-Specific Shift Template Scoping Across All Groups**:
   - Refactor template fetching, rendering, and filtering logic (`src/components/SchedulerDashboard.tsx`, `src/firebase.ts`, `src/types.ts`) so shift templates owned by a group are visible ONLY to users in that group or allowed target groups (`getAllowedTargetGroupIdsForHomeGroup`).
   - Support template aliases: General Weekday = เวรวันธรรมดา (`temp-group-weekday`), General Holiday = เวรวันหยุด (`temp-group-holiday`).
2. **R2. Group-Scoped Schedule & Shift View Across All Groups**:
   - Filter calendar/matrix shifts, rosters, dropdowns, and schedule view controls based on active home group and cross-group permissions.
3. **R3. Generalization & Removal of Hardcoded Special-Casing**:
   - Remove hardcoded group overrides (e.g., `group-saraburi`, `group-1650`). Resolve dynamically via `getAllowedTargetGroupIdsForHomeGroup` and `CROSS_GROUP_RULES`.

## Execution Topology
1. **Exploration Phase**: Spawn 3 parallel Explorers (`explorer_1`, `explorer_2`, `explorer_3`) to analyze existing hardcoded overrides, template filtering logic, schedule view logic, test suite, and present concrete refactoring designs.
2. **Implementation Phase**: Spawn 1 Worker (`implementer_1`) with Explorer consensus design to refactor codebase, run type checks, unit tests, and build.
3. **Review & Audit Phase**:
   - 2 Independent Reviewers (`reviewer_1`, `reviewer_2`)
   - 2 Challengers (`challenger_1`, `challenger_2`)
   - 1 Forensic Auditor (`auditor_1`)
4. **Final Gate**: All tests pass, build passes, 0 reviewer vetoes, clean audit verdict.
