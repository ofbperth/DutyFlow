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
