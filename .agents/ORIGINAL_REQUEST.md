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

## 2026-07-30T14:29:31Z

Refactor and update the DutyFlow hospital duty scheduling application to enhance calendar highlights, clean up rotation scheduling UI panels, fix PDF export rules, simplify the day inspector, and optimize matrix view shift card layouts.

Working directory: c:\DEV\DutyFlow
Integrity mode: development

## Requirements

### R1. Calendar Mode Holiday & Weekend Highlight Consistency
Ensure holidays and weekend days (Saturday and Sunday) are styled and highlighted as identical/consistent background/border indicators in calendar mode view across rotation schedules.

### R2. Remove Shift Balance from Rotation Schedule Top Panel
Remove the "Shift Balance" button and all underlying UI handlers/modals associated with shift balancing from the top panel on the rotation schedule page.

### R3. Fix & Scope PDF Export for Duty Schedules
Fix broken PDF export functionality so that generated PDFs cleanly export only home group staff shifts and the user's own cross-group shifts without rendering errors or missing data.

### R4. Simplify Day Inspector Panel Header Stats
Remove the "Assigned Staff" count, "Total Hours" count, and "Status Ratio" summary cards/metrics from the top section of the Day Inspector panel.

### R5. Compact Shift Cards in Matrix View
In matrix schedule view, move the "Draft" / "Published" status badges/tags to be positioned underneath the shift time (instead of beside it), narrowing the horizontal width of shift cards.

## Acceptance Criteria

### Calendar View Styling
- Weekend days (Sat/Sun) and public holidays share identical styling/highlighting rules in calendar view.

### Rotation Schedule Top Panel
- Shift Balance button is no longer present in the top action panel of the rotation scheduler.
- No residual unused state or broken UI references related to shift balance remain in the header.

### PDF Export
- PDF export executes without errors or layout glitches.
- PDF output strictly includes home group shifts and the current user's own cross-group shifts.

### Day Inspector
- The Day Inspector modal/panel displays without the three top metric cards (Assigned Staff, Total Hours, Status Ratio).
- Staff Roster Breakdown and Add Shift actions remain functional.

### Matrix View
- Draft and Published badges render directly below shift times inside matrix view shift cells.
- Shift cards maintain a tighter, narrower horizontal width without clipping.

## 2026-07-30T14:33:30Z

### R6. Allow Self-Role Switching Between User and Scheduler
- Description: Allow every user to change/toggle their own role between "user" and "scheduler" in their settings/navigation UI. Update Firestore rules and client UI components so users can update their own role without permission denied errors or restriction blocks.

Acceptance Criteria for R6:
- Every user can switch their role between "user" and "scheduler".
- Firestore rules allow users to update their own role document field.
