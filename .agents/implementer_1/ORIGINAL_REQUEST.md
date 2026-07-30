## 2026-07-30T21:37:14Z
You are Worker 1 implementing Milestone 7 (UI/UX Refactoring & Enhancements R1-R6) for DutyFlow.
Your working directory is: c:\DEV\DutyFlow\.agents\implementer_1

Read the 4 Explorer handoff reports for exact step-by-step implementation instructions:
1. c:\DEV\DutyFlow\.agents\explorer_1\handoff.md (R1 & R2)
2. c:\DEV\DutyFlow\.agents\explorer_2\handoff.md (R3)
3. c:\DEV\DutyFlow\.agents\explorer_3\handoff.md (R4 & R5)
4. c:\DEV\DutyFlow\.agents\explorer_4\handoff.md (R6)

Also read the scope details in c:\DEV\DutyFlow\.agents\orchestrator\SCOPE.md and c:\DEV\DutyFlow\.agents\ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Summary of Implementation Requirements:

1. R1: Calendar Mode Holiday & Weekend Highlight Consistency
   - Update `src/components/FourWeekCalendarView.tsx` so weekend days (Sat/Sun) and public holidays use consistent `bg-blue-500/10 border-blue-500/30 hover:border-blue-500/40 hover:bg-blue-500/15` container styling and `text-blue-400` day number styling.
   - Update matrix headers in `src/components/SchedulerDashboard.tsx`, `src/components/UserDashboard.tsx`, and `src/components/PooledShiftsDashboard.tsx` to highlight `isHoliday || isWeekend` consistently with `bg-blue-500/10 text-blue-400 font-semibold border-b border-blue-500/30`.

2. R2: Remove Shift Balance from Rotation Schedule Top Panel
   - In `src/components/SchedulerDashboard.tsx`, remove state `const [showShiftBalance, setShowShiftBalance] = useState(false);`, remove `showShiftBalance` references from `useEffect`, and delete the top panel button for "Shift Balance". Preserve `BarChart3` import as it is used elsewhere.

3. R3: Fix & Scope PDF Export for Duty Schedules
   - Create `src/utils/pdfExport.ts` implementing clean, error-free PDF export. Scope exported data strictly to home group staff shifts and the current user's own cross-group shifts (`targetGroupId !== myHomeGroupId`). Use safe ASCII template/shift labels and doctor name sanitization to prevent jsPDF Thai Unicode rendering crashes. Include dark slate table header pagination across multi-page exports.
   - Update `SchedulerDashboard.tsx` to call `exportScheduleToPDF`.

4. R4: Simplify Day Inspector Panel Header Stats
   - In `src/components/DayInspectorPanel.tsx`, remove the top header metrics grid ("Assigned Staff", "Total Hours", "Status Ratio") and unused summary variables (`totalShifts`, `totalHours`, `publishedShiftsCount`, `draftShiftsCount`). Preserve `calculateShiftHours` function and the Quick Actions header ("Staff Roster Breakdown" and "Add Shift" button).

5. R5: Compact Shift Cards in Matrix View
   - In `src/components/SchedulerDashboard.tsx` and `src/components/UserDashboard.tsx`, move the status badges ("Draft" / "Published") underneath the shift time into a block `<div className="mt-1">` container instead of rendering beside the template name, narrowing shift card width without text clipping.

6. R6: Allow Self-Role Switching Between User and Scheduler
   - Update `firestore.rules` for `/users/{userId}` to allow users to update their own `role` field between 'user' and 'scheduler' (`request.resource.data.role == 'user' || request.resource.data.role == 'scheduler' || request.resource.data.role == resource.data.role`).
   - Update `src/components/Navbar.tsx` profile dropdown, `src/components/UserDashboard.tsx` Settings card, and `src/App.tsx` state updates to enable clean self-role switching between 'user' and 'scheduler' without permission denied errors or restriction blocks.

Verification Commands to Run:
1. `npm run lint` (`npx tsc --noEmit`)
2. `npm test` (`npx tsx tests/run-tests.ts`)
3. `npm run build` (`npx vite build`)

Deliver your complete implementation report to `c:\DEV\DutyFlow\.agents\implementer_1\handoff.md`. Include build, test, and lint outputs in your handoff report. When done, send a message to the orchestrator.
