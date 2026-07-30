# Original User Request

## 2026-07-30T12:15:18Z

Fix group-based shift template and schedule filtering in DutyFlow so that EVERY shift template is shown strictly ONLY to users in its related/allowed groups and hidden from users in unrelated groups across ALL doctor groups (not limited to สระบุรี).

Working directory: c:\DEV\DutyFlow
Integrity mode: development

## Requirements

### R1. Universal & Group-Specific Shift Template Scoping Across All Groups
Refactor template fetching, rendering, and filtering logic (in `src/components/SchedulerDashboard.tsx`, `src/firebase.ts`, `src/types.ts`) so that for **every group** (Saraburi, 1650, ICU8S, ICU8N, ICU3, RCU, CCU, NVM groups, etc.):
- Shift templates owned by a specific group are visible **ONLY** to users belonging to that home group or to users in groups explicitly allowed via cross-group rules (`getAllowedTargetGroupIdsForHomeGroup`).
- Unrelated shift templates are strictly hidden from users outside those groups.
- Template aliases: **General Weekday** = **เวรวันธรรมดา** (`temp-group-weekday`), **General Holiday** = **เวรวันหยุด** (`temp-group-holiday`).

### R2. Group-Scoped Schedule & Shift View Across All Groups
Filter displayed calendar/matrix shifts, duty rosters, template dropdowns, and schedule view controls so users in **any group** see only shifts and shift templates related to their active home group or allowed cross-group assignments.

### R3. Generalization & Removal of Hardcoded Special-Casing
Remove all hardcoded group-specific overrides (e.g. hardcoded `group-saraburi` or `group-1650` logic blocks) across components. Resolve template and schedule visibility dynamically for **all groups** via central permission helpers (`getAllowedTargetGroupIdsForHomeGroup`, `CROSS_GROUP_RULES`).

## Verification Plan

### Automated Verification
- Run TypeScript type checking: `npm run lint`
- Run project test suite: `npm test`
- Verify production build: `npm run build`

## Acceptance Criteria

### Universal Group Isolation & Template Filtering
- [ ] For **every** doctor group, a logged-in user sees **only** shift templates belonging to their home group or allowed target groups (`allowedTargetGroupIds`).
- [ ] Shift templates belonging to unrelated groups (e.g., Saraburi templates, 1650 templates, ICU templates) are hidden from users in groups that lack cross-group access.
- [ ] Scheduled shifts shown in calendar, matrix, and roster views strictly match the user's active group and involved cross-group shifts.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass with zero errors.
