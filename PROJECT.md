# Project: DutyFlow - 4-Week Calendar & Adaptive Scheduling

## Architecture
DutyFlow is a React + Vite TypeScript application providing staff scheduling capabilities.
The 4-Week Calendar View feature introduces:
1. **FourWeekCalendarView Component** (`src/components/FourWeekCalendarView.tsx`):
   - A 7-column x 4-row responsive grid container fitting 100% width with 0 horizontal side scrolling.
   - Shift summary chips per day cell with color coding and glowing highlight for current user ("YOU: Shift Name").
   - View switcher state in `UserDashboard.tsx` and `SchedulerDashboard.tsx` allowing toggle between 4-Week Calendar View and classic Matrix View.
2. **Adaptive Scheduling Controls**:
   - **Desktop/PC**: HTML5 / React drag-and-drop support for shift templates / staff onto date cells; multi-select dates for batch assignment.
   - **iPad & Mobile**: Touch context menu on date cell tap (add/edit/remove shifts); Copy-Paste Day duty roster capabilities across dates.
3. **Day Inspector Panel** (`src/components/DayInspectorPanel.tsx`):
   - Collapsible/expandable side or bottom panel displaying detailed staff roster, assigned shifts, hours, and notes for the selected date.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Test Suite Creation | Create comprehensive unit & E2E tests for 4-Week Calendar & adaptive controls | none | DONE |
| M1  | 4-Week Calendar Grid & View Switcher | Implement FourWeekCalendarView, grid layout, chips, glowing user highlights, and view switcher | E2E | DONE |
| M2  | Adaptive Desktop & Mobile Scheduling Controls | Implement Drag & Drop, Batch Assign, Touch Context Menu, Copy/Paste Day roster | M1 | DONE |
| M3  | Day Inspector Panel & Dashboard Integration | Implement Day Inspector panel, integrate with UserDashboard and SchedulerDashboard | M2 | DONE |
| M4  | E2E Testing Pass & Forensic Audit | Run full test suite, verify build/tsc, perform adversarial coverage & forensic integrity audit | M3 | DONE |
| M5  | Universal Group-Scoped Template & Schedule Filtering | Refactor template and schedule filtering across all groups via central permission helpers | M4 | DONE |
| M6  | Verification & Forensic Integrity Audit | Run test suite, lint, build, reviewer check, and forensic audit | M5 | DONE |

## Interface Contracts
### View Switcher & Calendar View Props
```typescript
export type ViewMode = 'calendar' | 'matrix';

export interface ShiftAssignment {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  shiftTypeId: string;
  shiftTypeName: string;
  color: string;
  isCurrentUser?: boolean;
}

export interface FourWeekCalendarViewProps {
  startDate: string; // First day of 28-day rotation
  assignments: ShiftAssignment[];
  currentUserId?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  // Adaptive Controls Props
  isScheduler?: boolean;
  onDropShift?: (shiftTypeId: string, date: string) => void;
  onBatchAssign?: (dates: string[], shiftTypeId: string) => void;
  onCopyDayRoster?: (sourceDate: string) => void;
  onPasteDayRoster?: (targetDate: string) => void;
  copiedRosterDate?: string | null;
}
```

### Day Inspector Props
```typescript
export interface DayInspectorPanelProps {
  selectedDate: string | null;
  assignments: ShiftAssignment[];
  isOpen: boolean;
  onClose: () => void;
  onEditAssignment?: (assignmentId: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
}
```

## Code Layout
- `src/App.tsx` — Main routing and application state wrapper.
- `src/types.ts` — Core data models (Shift, User, Rotation, Assignment).
- `src/components/UserDashboard.tsx` — User Dashboard with 4-Week Calendar / Matrix toggle.
- `src/components/SchedulerDashboard.tsx` — Scheduler Dashboard with adaptive scheduling controls.
- `src/components/FourWeekCalendarView.tsx` — 4-Week 7x4 responsive grid calendar component.
- `src/components/DayInspectorPanel.tsx` — Collapsible Day Inspector panel component.
- `src/components/TouchContextMenu.tsx` — Touch-friendly context menu modal/popover for mobile/iPad.
- `src/components/BatchAssignModal.tsx` — Multi-select date batch shift assignment component.
