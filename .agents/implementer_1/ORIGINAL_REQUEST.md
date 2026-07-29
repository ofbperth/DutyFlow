## 2026-07-29T15:37:43Z
<USER_REQUEST>
You are Worker 1 (Implementer 1) for the DutyFlow project.
Your working directory is c:\DEV\DutyFlow\.agents\implementer_1. Create this directory if it does not exist.

Your Task: Implement Milestone 1 - 4-Week Calendar Grid & View Switcher Component.

Requirements to implement:
1. Read c:\DEV\DutyFlow\.agents\explorer_1\analysis.md and c:\DEV\DutyFlow\PROJECT.md.
2. Update `src/types.ts` to include core interfaces (`ViewMode`, `ShiftAssignment`, `FourWeekCalendarViewProps`, etc.).
3. Update `src/index.css` to add glowing animation utilities (`@keyframes glowPulse`, `.glow-user-shift`, zero horizontal side-scroll grid layout helper classes).
4. Create `src/components/FourWeekCalendarView.tsx`:
   - 7 columns x 4 rows responsive grid fitting 100% container width with zero horizontal side-scroll (`grid grid-cols-7 w-full overflow-hidden`).
   - Generates and displays all 28 days of a rotation.
   - Renders color-coded shift summary chips (grouped by shift template with count badges).
   - Renders glowing highlight badge when the current user has a shift assigned on a day cell (`YOU: [Shift Name]`).
   - Handles cell selection and prop callbacks for date click, drag/drop, and mobile context actions.
5. Integrate View Switcher into `src/components/UserDashboard.tsx` and `src/components/SchedulerDashboard.tsx`:
   - Add state `viewMode: 'calendar' | 'matrix'`.
   - Add toggle buttons `[ 📅 4-Week Calendar ] / [ 📊 Matrix ]` near dashboard header/toolbar.
   - Conditionally render `FourWeekCalendarView` when `viewMode === 'calendar'`, and original matrix view when `viewMode === 'matrix'`.
6. Run `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`) to verify zero TypeScript and build errors.
7. Write your changes summary to c:\DEV\DutyFlow\.agents\implementer_1\changes.md and handoff report to c:\DEV\DutyFlow\.agents\implementer_1\handoff.md.
8. Send a message to parent orchestrator when complete.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</USER_REQUEST>
