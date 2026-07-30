## 2026-07-30T06:09:47Z
You are Worker 1, working in directory `c:\DEV\DutyFlow\.agents\implementer_1`.

Your task is to implement the 4 UI/UX requirements for DutyFlow in `src/components/`:

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Requirements to implement:

1. **R1. Direct Drag & Drop Staff Selector Modal**:
   - When dragging & dropping a shift template onto a calendar date cell in `FourWeekCalendarView.tsx` (or adding a shift from the panel in `SchedulerDashboard.tsx`), open a staff selection prompt/modal asking which staff member to assign to that shift for that specific date.
   - When a shift template is dropped on a cell or added from panel, open a modal (`AssignShiftModal` or a staff selector modal) with `selectedDate` and `shiftTypeId` set, listing all available staff members (doctors) so the user selects the staff member to assign for that date.

2. **R2. Upper Panel Batch Assign Trigger**:
   - Add a clear, prominent "Batch Assign" button in the upper control panel of `SchedulerDashboard.tsx` (and `FourWeekCalendarView.tsx` top toolbar) that opens `BatchAssignModal`.
   - Ensure the button is styled prominently (e.g. glowing/accent button with icon and label "Batch Assign") and opens the batch assignment modal when clicked.

3. **R3. Relocate Manage Group to Admin Menu**:
   - Move the "Manage Group" (Group Manager) access trigger from `SchedulerDashboard.tsx` to `AdminDashboard.tsx`.
   - Remove "Manage Group" button from `SchedulerDashboard.tsx`.
   - Add "Manage Group" button into `AdminDashboard.tsx` controls/tabs, wire `GroupManagerModal` state inside `AdminDashboard.tsx` (passing necessary group props), so group management is strictly housed within administrative settings.

4. **R4. Fixed Centered Positioning for Modals & Popups on Scroll**:
   - Audit modal overlay containers across all components in `src/components/` (`BatchAssignModal.tsx`, `GroupManagerModal.tsx`, `DayInspectorPanel.tsx`, `TouchContextMenu.tsx`, `RotationRearrangerModal.tsx`, and any modal overlays in `SchedulerDashboard.tsx`, `UserDashboard.tsx`, `AdminDashboard.tsx`).
   - Enforce fixed centered overlay wrapper CSS on all modal backdrops:
     `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto`
   - Ensure popups stay centered in the viewport smoothly when scrolling up and down.

5. **Build Verification**:
   - Run `npm run build` to verify 0 errors. Ensure TypeScript and Vite build complete cleanly.

Create your working directory `c:\DEV\DutyFlow\.agents\implementer_1\` if needed, write `progress.md` after completing meaningful steps, perform all code changes, run build verification, document results in `changes.md` and `handoff.md`, and send a message back to parent when completed.
