# Original User Request

## 2026-07-30T13:08:40Z

Fix 4 critical UI/UX issues in DutyFlow's Scheduler and 4-Week Calendar views, ensure all features function smoothly, verify with build tests, and perform git commit & push.

Working directory: c:\DEV\DutyFlow
Integrity mode: development

## Requirements

### R1. Direct Drag & Drop Staff Selector Modal
When dragging & dropping a shift template onto a calendar date cell (or adding a shift from the panel), open a staff selection prompt/modal asking which staff member to assign to that shift for that specific date.

### R2. Upper Panel Batch Assign Trigger
Add a clear, prominent "Batch Assign" button in the upper control panel of the Scheduler Dashboard / 4-Week Calendar View that opens the Batch Assignment Modal.

### R3. Relocate Manage Group to Admin Menu
Move the "Manage Group" (Group Manager) access trigger to the Admin Dashboard / Admin menu so group management is strictly housed within administrative settings.

### R4. Fixed Centered Positioning for Modals & Popups on Scroll
Fix modal overlays (including Shift Balance modal, Assign Cell modal, etc.) using fixed inset-0 z-50 flex items-center justify-center with background backdrop blur so popups stay centered and follow the viewport smoothly when scrolling up and down.

### R5. Recheck, Verification, Commit & Push
Verify all 4 requirements, run production build (npm run build), verify zero errors, then perform git add, git commit, and git push to origin/main.

## Acceptance Criteria

### Functionality & UI
- [ ] Dragging a shift template onto a calendar date cell prompts a modal/dropdown to select the staff member to assign.
- [ ] Upper control panel contains a working "Batch Assign" button opening the BatchAssignModal.
- [ ] "Manage Group" button is located within the Admin Menu/Dashboard.
- [ ] Modals (Shift Balance, Assign Shift, etc.) stay fixed and centered on screen when scrolling up and down.

### Build & Version Control
- [ ] npm run build completes with 0 errors.
- [ ] Changes are committed with a clear message and pushed to origin/main.

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
