# Scope: Milestone 7 — DutyFlow UI/UX Refactoring & Enhancements (R1-R6)

## Requirements & Scope Boundaries

### R1. Calendar Mode Holiday & Weekend Highlight Consistency
- **Goal**: Ensure holidays and weekend days (Saturday and Sunday) are styled and highlighted with identical/consistent background and border indicators in calendar mode view across rotation schedules.
- **Affected Components**: `src/components/FourWeekCalendarView.tsx`, `src/components/SchedulerDashboard.tsx`, `src/components/UserDashboard.tsx` or related styling/helper utilities.
- **Acceptance**: Weekend days (Sat/Sun) and public holidays share identical CSS/Tailwind background/border styling rules in calendar view.

### R2. Remove Shift Balance from Rotation Schedule Top Panel
- **Goal**: Remove the "Shift Balance" button and all underlying UI handlers/modals associated with shift balancing from the top panel on the rotation schedule page.
- **Affected Components**: `src/components/SchedulerDashboard.tsx`, `src/components/ShiftBalanceModal.tsx` (if present/unused), `src/components/RotationSchedule.tsx` or top header controls.
- **Acceptance**: Shift Balance button is no longer present in the top action panel of the rotation scheduler. No residual unused state or broken UI references remain.

### R3. Fix & Scope PDF Export for Duty Schedules
- **Goal**: Fix broken PDF export functionality so that generated PDFs cleanly export only home group staff shifts and the user's own cross-group shifts without rendering errors or missing data.
- **Affected Components**: `src/utils/pdfExport.ts` (or PDF generation service/component), `src/components/SchedulerDashboard.tsx`, `src/components/UserDashboard.tsx`.
- **Acceptance**: PDF export executes without errors or layout glitches. Output strictly includes home group shifts and the current user's own cross-group shifts.

### R4. Simplify Day Inspector Panel Header Stats
- **Goal**: Remove the "Assigned Staff" count, "Total Hours" count, and "Status Ratio" summary cards/metrics from the top section of the Day Inspector panel.
- **Affected Components**: `src/components/DayInspectorPanel.tsx`.
- **Acceptance**: The Day Inspector modal/panel displays without the three top metric cards (Assigned Staff, Total Hours, Status Ratio). Staff Roster Breakdown and Add Shift actions remain fully functional.

### R5. Compact Shift Cards in Matrix View
- **Goal**: In matrix schedule view, move the "Draft" / "Published" status badges/tags to be positioned underneath the shift time (instead of beside it), narrowing the horizontal width of shift cards.
- **Affected Components**: Matrix view shift cell rendering components (`src/components/SchedulerDashboard.tsx`, `src/components/UserDashboard.tsx`).
- **Acceptance**: Draft and Published badges render directly below shift times inside matrix view shift cells. Shift cards maintain a tighter, narrower horizontal width without clipping.

### R6. Allow Self-Role Switching Between User and Scheduler
- **Goal**: Allow every user to change/toggle their own role between "user" and "scheduler" in their settings/navigation UI. Update Firestore rules and client UI components so users can update their own role without permission denied errors or restriction blocks.
- **Affected Components**: `firestore.rules`, user profile / settings components (e.g. `src/components/Navigation.tsx`, `src/components/UserProfileModal.tsx`, `src/components/UserDashboard.tsx`, `src/components/SchedulerDashboard.tsx`, `src/firebase.ts`).
- **Acceptance**: Every user can switch their role between "user" and "scheduler". Firestore security rules allow users to update their own `role` field on their user document (`/users/{userId}`).
