# Original User Request

## 2026-07-29T15:35:42Z

Implement a 4-Week Calendar View for DutyFlow's Scheduled page, eliminating horizontal side scrolling by fitting the entire 28-day rotation on screen, with adaptive Desktop (Direct Drag & Drop, Batch Assign) and Mobile/iPad (Touch Context Menu, Copy-Paste Day) scheduling controls.

Working directory: c:\DEV\DutyFlow
Integrity mode: development

## Requirements

### R1. 4-Week Calendar View (No Side-Scroll Overview)
Add a 4-Week Calendar View to UserDashboard.tsx and SchedulerDashboard.tsx displaying all 28 days of a rotation in a 7-column x 4-row grid that fits 100% of the container width without horizontal scrolling. Include a View Switcher ([ 📅 4-Week Calendar ] / [ 📊 Matrix ]) and color-coded shift summary chips with glowing user shift highlights (YOU: Shift Name).

### R2. Responsive Adaptive Scheduling Controls
Implement device-aware shift scheduling:
- Desktop/PC: Support direct Drag & Drop of shift templates/staff onto calendar day cells, and multi-select date Batch Assignment.
- iPad & Mobile: Support touch-friendly Context Menus upon tapping day cells, along with Copy & Paste Day duty roster capabilities.

### R3. Day Inspector Panel
Include a collapsible/expandable Day Inspector panel displaying the full detailed staff roster for a selected date.

## Acceptance Criteria

### UI & Layout
- [ ] 4-Week Calendar Grid renders all 28 days within 100% container width with zero horizontal side-scroll.
- [ ] Users can toggle seamlessly between 4-Week Calendar View and classic Matrix View.

### Desktop Scheduling
- [ ] Schedulers can drag and drop shift templates directly onto calendar day cells.
- [ ] Schedulers can multi-select calendar dates and batch-assign shifts in one click.

### iPad & Mobile Scheduling
- [ ] Tapping a date cell on touch devices opens a touch context menu to add/edit/remove shifts.
- [ ] Schedulers can copy a day's duty roster and paste it onto other dates.

### Quality & Verification
- [ ] TypeScript compilation (npm run build) completes with zero errors.
- [ ] Perform a thorough audit & scrutiny of the UI and code after completing implementation to ensure premium aesthetics, responsiveness, and zero overlapping elements.
