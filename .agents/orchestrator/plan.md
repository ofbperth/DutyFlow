# Orchestration Plan — DutyFlow UI/UX Refactoring & Enhancements (R1-R6)

## Objectives
1. **R1: Calendar Mode Holiday & Weekend Highlight Consistency**: Align Saturday, Sunday, and public holiday background/border highlights in calendar mode.
2. **R2: Remove Shift Balance from Rotation Schedule Top Panel**: Remove Shift Balance button, modals, and handlers from rotation schedule header.
3. **R3: Fix & Scope PDF Export for Duty Schedules**: Scope PDF export to home group shifts + user's cross-group shifts and fix broken PDF rendering.
4. **R4: Simplify Day Inspector Panel Header Stats**: Remove "Assigned Staff", "Total Hours", "Status Ratio" cards while keeping roster breakdown and add shift actions.
5. **R5: Compact Shift Cards in Matrix View**: Position "Draft" / "Published" status badges below shift time to narrow shift card width.
6. **R6: Allow Self-Role Switching Between User and Scheduler**: Enable users to toggle their own role between "user" and "scheduler" in UI and update `firestore.rules` accordingly.

## Execution Topology
1. **Exploration Phase**:
   - 3 parallel Explorers complete (Explorer 1 for R1/R2, Explorer 2 for R3, Explorer 3 for R4/R5).
   - Dispatch Explorer 4 (`explorer_4`) to analyze R6 (self-role switching UI and `firestore.rules`).
2. **Implementation Phase**:
   - Spawn 1 Worker (`implementer_1`) with consensus recommendations from Explorers to implement R1-R6, run TypeScript linting/typechecking, unit tests, and build.
3. **Review & Audit Phase**:
   - Spawn 2 independent Reviewers (`reviewer_1`, `reviewer_2`) for code quality and requirement verification.
   - Spawn 2 Challengers (`challenger_1`, `challenger_2`) for empirical test/layout/role-switching checks.
   - Spawn 1 Forensic Auditor (`auditor_1`) for integrity verification.
4. **Final Gate**:
   - Verify 0 lint errors, build pass, tests pass, no Reviewer vetoes, Challenger pass, Forensic Auditor CLEAN.
