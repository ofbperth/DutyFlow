# Technical Architecture & Design Analysis: DutyFlow 4-Week Calendar & Adaptive Scheduling

## 1. Executive Summary & Overview
DutyFlow is a React 19 + TypeScript + Vite application designed for medical staff scheduling in hospital departments. Currently, schedules are displayed primarily in a table matrix layout (`UserDashboard.tsx` and `SchedulerDashboard.tsx`), where staff/groups form rows and dates form columns.

This document details the complete technical design for the **4-Week Calendar View & Adaptive Scheduling** feature. It introduces a 7-column x 4-row responsive grid calendar, view switcher between Calendar and Matrix views, color-coded shift summary chips, glowing highlights for the current user's shifts ("YOU: [Shift Name]"), adaptive controls for desktop (Drag & Drop, Multi-Select Batch Assignment) and iPad/mobile (Touch Context Menu, Copy & Paste Day Roster), and a collapsible Day Inspector Panel.

---

## 2. Current Codebase Exploration & Analysis

### 2.1 File Structure & Core Roles
- **`src/types.ts`**: Defines core domain models (`User`, `ShiftTemplate`, `Shift`, `Availability`, `ShiftSwap`, `Holiday`, `SchedulePeriod`, `DoctorGroup`, `GroupRotationAssignment`).
- **`src/App.tsx`**: Holds application state, Firebase auth listener, data fetching routines (`loadAllData`), and navigation tab routing.
- **`src/components/UserDashboard.tsx`**: Renders user-facing schedule matrix, availability preference submissions, shift swap workflows, and profile settings.
- **`src/components/SchedulerDashboard.tsx`**: Renders scheduler matrix grid, shift template sidebar, drag & drop handlers, shift note editor, publish draft controller, and PDF exporter.
- **`src/index.css`**: Configures Tailwind CSS 4, fonts (Inter, Space Grotesk, JetBrains Mono), glassmorphism styles (`.glass`), scrollbars, and keyframes (`@keyframes fadeIn`).
- **`package.json`**: React 19.0.1, Lucide React 0.546.0, Tailwind CSS 4.1.14, Motion 12.23.24, jsPDF 4.2.1, Vite 6.2.3, TypeScript 5.8.2. Lint script: `tsc --noEmit`. Build script: `vite build`.

### 2.2 Data Flow & Existing State Architecture
1. **Schedule Periods & Dates**:
   - `schedulePeriod` contains `startDate` (e.g. `'2026-07-01'`) and `endDate` (e.g. `'2026-07-14'` or `'2026-07-28'`).
   - Dates array generated via `getDatesInRange(startDate, endDate)`.
2. **Shifts & Templates**:
   - `Shift`: `{ id, userId, date, templateId, status: 'draft' | 'published', assignedBy, notes?, targetGroupId? }`.
   - `ShiftTemplate`: `{ id, name, startTime, endTime, color, groupId, isPooled? }`.
3. **User Group Assignments**:
   - `GroupRotationAssignment`: `{ id, periodId, groupId, userId, displayOrder? }`.

---

## 3. Feature Architectural Design & Strategy

### 3.1 4-Week Calendar Grid Component (`FourWeekCalendarView.tsx`)
- **Layout & Zero Side-Scroll**:
  - Grid: `display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; width: 100%;`
  - Container constraint: `w-full overflow-hidden` ensures all 7 columns fit on screen with 0 horizontal side scrolling across mobile, iPad, and desktop viewports.
- **28-Day Cycle Calculation**:
  - Generates 28 consecutive dates starting from `startDate` (4 full 7-day weeks, Row 1: Days 1-7, Row 2: Days 8-14, Row 3: Days 15-21, Row 4: Days 22-28).
- **Shift Summary Chips**:
  - Aggregates assigned shifts on a given date by `templateId`.
  - Renders compact badges with template background color/border, shift name, and assigned staff count.
- **Glowing User Shift Highlight ("YOU: [Shift Name]")**:
  - When `currentUserId` is assigned to a shift on a date cell, render a glowing highlight badge:
    ```tsx
    <div className="rounded-lg p-1.5 bg-amber-500/20 border-2 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse flex items-center justify-between">
      <span className="font-extrabold text-[10px] tracking-wide">YOU: {template.name}</span>
      <span className="text-[8px] font-mono opacity-80">{template.startTime}-{template.endTime}</span>
    </div>
    ```

### 3.2 View Switcher Interface ([ 📅 4-Week Calendar ] / [ 📊 Matrix ])
- Dual-state toggle control integrated in `UserDashboard.tsx` and `SchedulerDashboard.tsx`:
  - `viewMode === 'calendar'`: Renders `FourWeekCalendarView`.
  - `viewMode === 'matrix'`: Renders existing table grid matrix.

### 3.3 Desktop Adaptive Controls
1. **Direct Drag & Drop**:
   - Template sidebar items (`ShiftTemplate`) act as drag sources (`onDragStart`).
   - Day cells in `FourWeekCalendarView` act as drag targets (`onDragOver`, `onDrop`).
   - Dropping a template triggers `onDropShift(templateId, dateStr)`.
2. **Multi-Select Dates & Batch Assignment**:
   - Clicking date cells while in "Batch Mode" (or holding Ctrl/Cmd) adds/removes date from `selectedDates` array.
   - Floating action toolbar displays selected count and button "Batch Assign Shifts".
   - Opens `BatchAssignModal.tsx`, allowing selection of shift template & target staff member to assign across all selected dates in one operation.

### 3.4 iPad & Mobile Adaptive Controls
1. **Touch Context Menu (`TouchContextMenu.tsx`)**:
   - Tapping a day cell opens touch context menu modal/popover.
   - Actions:
     - 👁️ **Inspect Day Roster** (opens `DayInspectorPanel`)
     - ➕ **Add Shift to Day** (opens assignment picker)
     - 📋 **Copy Day Roster** (copies roster snippet for `date`)
     - 📥 **Paste Day Roster** (pastes saved roster snippet onto target `date`)
     - 🧹 **Clear Day Roster** (deletes shifts on date for scheduler)
2. **Copy & Paste Day Roster State Machine**:
   - `copiedRosterDate`: Stores source date string.
   - `onCopyDayRoster(sourceDate)`: Sets `copiedRosterDate = sourceDate`.
   - `onPasteDayRoster(targetDate)`: Queries shifts on `sourceDate`, creates duplicate shift records for `targetDate` set to `'draft'`, calls `saveShift`, and refreshes dataset.

### 3.5 Day Inspector Panel (`DayInspectorPanel.tsx`)
- Collapsible side panel / drawer displaying complete roster breakdown for `selectedDate`:
  - Selected date header with day of week & holiday info.
  - Total shifts, draft vs published metrics, total hours.
  - List of assigned staff cards (doctor name, group, shift template, hours, status, notes).
  - Quick action buttons (Add Shift, Edit Note, Delete Assignment).

### 3.6 Testing & Verification Strategy
- **TypeScript Compilation**: `npm run lint` (`tsc --noEmit`) must complete with zero errors.
- **Production Build**: `npm run build` (`vite build`) must build clean bundle.
- **Component & Logic Verification**: Add unit/component tests using Vitest + React Testing Library (or tsx runner) to verify:
  - 28-day rotation date math.
  - Shift summary aggregation per cell.
  - Current user glowing highlight filtering.
  - Multi-select date batch operations.
  - Copy/Paste day roster data transformation.

---

## 4. Interfaces & Data Contracts

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
  startTime: string;
  endTime: string;
  isCurrentUser?: boolean;
  status?: 'draft' | 'published';
  notes?: string;
  targetGroupId?: string;
}

export interface FourWeekCalendarViewProps {
  startDate: string; // First day of 28-day rotation
  assignments: ShiftAssignment[];
  templates: ShiftTemplate[];
  users: User[];
  groups: DoctorGroup[];
  holidays: Holiday[];
  availabilities: Availability[];
  currentUserId?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  // Adaptive Controls Props
  isScheduler?: boolean;
  onDropShift?: (templateId: string, date: string) => void;
  onBatchAssign?: (dates: string[], templateId: string, userId?: string) => void;
  onCopyDayRoster?: (sourceDate: string) => void;
  onPasteDayRoster?: (targetDate: string) => void;
  onClearDayRoster?: (date: string) => void;
  copiedRosterDate?: string | null;
  selectedDates?: string[];
  onToggleSelectDate?: (date: string) => void;
  onClearSelectedDates?: () => void;
}

export interface DayInspectorPanelProps {
  selectedDate: string | null;
  assignments: ShiftAssignment[];
  users: User[];
  templates: ShiftTemplate[];
  groups: DoctorGroup[];
  isOpen: boolean;
  onClose: () => void;
  isScheduler?: boolean;
  onAddAssignment?: (date: string) => void;
  onEditAssignment?: (assignmentId: string, notes: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
}

export interface TouchContextMenuProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onInspectRoster: (date: string) => void;
  onAddShift: (date: string) => void;
  onCopyRoster: (date: string) => void;
  onPasteRoster: (date: string) => void;
  onClearRoster: (date: string) => void;
  canPaste: boolean;
  isScheduler?: boolean;
}

export interface BatchAssignModalProps {
  selectedDates: string[];
  templates: ShiftTemplate[];
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (dates: string[], templateId: string, userId?: string) => Promise<void>;
}
```

---

## 5. Exact Code Paths to Create & Modify

1. `src/types.ts`:
   - Add `ViewMode`, `ShiftAssignment`, `FourWeekCalendarViewProps`, `DayInspectorPanelProps`, `TouchContextMenuProps`, `BatchAssignModalProps`.
2. `src/components/FourWeekCalendarView.tsx` (New):
   - Implement 7x4 responsive grid, shift summary chips, glowing user shift highlight, drag target handlers, multi-select date badges.
3. `src/components/DayInspectorPanel.tsx` (New):
   - Implement slide-over / expandable side panel displaying detailed roster for selected date.
4. `src/components/TouchContextMenu.tsx` (New):
   - Implement touch menu modal for mobile/iPad context actions (View, Add, Copy, Paste, Clear).
5. `src/components/BatchAssignModal.tsx` (New):
   - Implement batch shift assignment modal for multi-selected dates.
6. `src/components/UserDashboard.tsx`:
   - Add `viewMode` state (`'calendar' | 'matrix'`).
   - Add View Switcher UI component.
   - Render `FourWeekCalendarView` and `DayInspectorPanel`.
7. `src/components/SchedulerDashboard.tsx`:
   - Add `viewMode` state.
   - Add View Switcher UI component.
   - Integrate `FourWeekCalendarView`, `DayInspectorPanel`, `TouchContextMenu`, `BatchAssignModal`.
   - Wire Drag & Drop, Batch Assign, Copy/Paste Day Roster handlers to `saveShift` / `deleteShift`.
8. `src/index.css`:
   - Add `@keyframes glowPulse`, `.glow-user-shift`, zero horizontal side-scroll container styles.

---

## 6. Step-by-Step Implementation Plan

### Step 1: Type Extensions & CSS Keyframes
- Update `src/types.ts` with new interfaces.
- Add glowing highlight keyframes and 4-week grid styles in `src/index.css`.

### Step 2: Build FourWeekCalendarView Component
- Implement 28-day date calculation from `startDate`.
- Build 7x4 responsive grid container with 0 horizontal side-scroll (`grid grid-cols-7`).
- Render color-coded summary chips and glowing user shift highlight (`YOU: Shift Name`).

### Step 3: Implement Day Inspector Panel
- Build `DayInspectorPanel.tsx` with collapsible side drawer.
- Render detailed staff roster, shift times, notes, and scheduler edit/delete actions.

### Step 4: Implement Touch Context Menu & Batch Assignment Modal
- Build `TouchContextMenu.tsx` for iPad & mobile touch triggers.
- Build `BatchAssignModal.tsx` for multi-date shift assignment.

### Step 5: Dashboard Integrations (UserDashboard & SchedulerDashboard)
- Add `viewMode` state and View Switcher control ([ 📅 4-Week Calendar ] / [ 📊 Matrix ]).
- Wire all adaptive controls (Drag & Drop, Multi-Select Batch, Copy/Paste Day Roster, Inspector Panel).

### Step 6: Verification & Test Suite Execution
- Run `npm run lint` (`tsc --noEmit`).
- Run `npm run build` (`vite build`).
- Run test runner verification.
