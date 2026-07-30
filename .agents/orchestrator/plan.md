# Plan: DutyFlow UI/UX Fixes

## Overview
Address 4 UI/UX requirements in DutyFlow (R1-R4) and conduct build verification, review, forensic audit, and git commit/push to origin/main (R5).

## Requirements Breakdown & Acceptance Criteria
1. **R1: Direct Drag & Drop Staff Selector Modal**:
   - Dragging a shift template onto a calendar date cell (or adding a shift from panel) prompts a staff selection modal/prompt asking which staff member to assign to that shift for that date.
2. **R2: Upper Panel Batch Assign Trigger**:
   - Add a prominent "Batch Assign" button in the upper control panel of Scheduler Dashboard / 4-Week Calendar View that opens the BatchAssignmentModal.
3. **R3: Relocate Manage Group to Admin Menu**:
   - Move "Manage Group" trigger to Admin Dashboard / Admin menu so group management is strictly housed within administrative settings.
4. **R4: Fixed Centered Positioning for Modals & Popups on Scroll**:
   - Modal overlays use `fixed inset-0 z-50 flex items-center justify-center` with backdrop blur so popups stay centered and follow the viewport smoothly when scrolling.
5. **R5: Recheck, Verification, Commit & Push**:
   - Verify all 4 requirements, run production build (`npm run build`), verify zero errors, then perform git add, git commit, and git push to origin/main.

## Orchestration Milestones
- **Milestone 1**: Technical Exploration & Architectural Mapping (Explorer)
  - Map files, components, state management, modal styling, drag-and-drop event handlers, batch assign triggers, group manager menu locations.
- **Milestone 2**: UI/UX Implementation (Worker)
  - Implement R1, R2, R3, R4 in components.
- **Milestone 3**: Review, Verification & Forensic Audit (Reviewer, Challenger, Auditor)
  - Perform code review, build verification (`npm run build`), stress tests, forensic audit.
- **Milestone 4**: Git Commit & Push (Worker)
  - Execute git add, git commit, git push to origin/main.
