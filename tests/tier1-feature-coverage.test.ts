import { describe, it, expect, beforeEach } from './test-framework.ts';
import { CalendarStateEngine } from './calendar-model.ts';
import { ShiftAssignment } from '../src/types.ts';

describe('Tier 1: Feature Coverage Test Suite', () => {
  let engine: CalendarStateEngine;

  beforeEach(() => {
    engine = new CalendarStateEngine({
      startDate: '2026-08-03',
      currentUserId: 'user-alice',
      isScheduler: true,
    });
  });

  // ==========================================
  // Feature 1: 4-Week Grid Layout (Zero Side-Scroll)
  // ==========================================
  describe('Feature 1: 4-Week Grid Layout (Zero Side-Scroll)', () => {
    it('4W-GRID-01: Renders exactly 28 days in 7-column x 4-row grid', () => {
      const days = engine.get28Days();
      expect(days.length).toBe(28);

      const cells = engine.buildGridCells();
      expect(cells.length).toBe(28);

      // Verify 4 rows (weekIndex 0..3) and 7 columns (columnIndex 0..6)
      const weekIndices = new Set(cells.map((c) => c.weekIndex));
      const colIndices = new Set(cells.map((c) => c.columnIndex));
      expect(weekIndices.size).toBe(4);
      expect(colIndices.size).toBe(7);
    });

    it('4W-GRID-02: Calculates 28-day rotation end date correctly from start date', () => {
      expect(engine.startDate).toBe('2026-08-03');
      expect(engine.getEndDate()).toBe('2026-08-30');
    });

    it('4W-GRID-03: Zero horizontal side-scroll layout constraint (100% container width fitting)', () => {
      // Test desktop container (1400px)
      const desktopCheck = engine.checkZeroHorizontalScrollConstraint(1400, 100);
      expect(desktopCheck.fits).toBe(true);
      expect(desktopCheck.colWidthPx).toBe(200);

      // Test mobile/tablet container (700px)
      const tabletCheck = engine.checkZeroHorizontalScrollConstraint(700, 80);
      expect(tabletCheck.fits).toBe(true);
      expect(tabletCheck.colWidthPx).toBe(100);
    });

    it('4W-GRID-04: Maps assignments correctly to respective 28-day date cells', () => {
      engine.assignments = [
        { id: 's1', userId: 'user-alice', userName: 'Alice', date: '2026-08-03', shiftTypeId: 'st-day', shiftTypeName: 'Day Shift', color: 'bg-blue-500' },
        { id: 's2', userId: 'user-bob', userName: 'Bob', date: '2026-08-03', shiftTypeId: 'st-night', shiftTypeName: 'Night Shift', color: 'bg-indigo-500' },
        { id: 's3', userId: 'user-alice', userName: 'Alice', date: '2026-08-10', shiftTypeId: 'st-call', shiftTypeName: 'On Call', color: 'bg-red-500' },
      ];

      const day1Assignments = engine.getAssignmentsForDate('2026-08-03');
      expect(day1Assignments.length).toBe(2);

      const day8Assignments = engine.getAssignmentsForDate('2026-08-10');
      expect(day8Assignments.length).toBe(1);

      const emptyDayAssignments = engine.getAssignmentsForDate('2026-08-04');
      expect(emptyDayAssignments.length).toBe(0);
    });

    it('4W-GRID-05: Computes weekIndex (0..3) and columnIndex (0..6) accurately for all 28 days', () => {
      const cells = engine.buildGridCells();
      expect(cells[0].weekIndex).toBe(0);
      expect(cells[0].columnIndex).toBe(0);

      expect(cells[6].weekIndex).toBe(0);
      expect(cells[6].columnIndex).toBe(6);

      expect(cells[7].weekIndex).toBe(1);
      expect(cells[7].columnIndex).toBe(0);

      expect(cells[27].weekIndex).toBe(3);
      expect(cells[27].columnIndex).toBe(6);
    });
  });

  // ==========================================
  // Feature 2: View Switcher (Calendar vs Matrix)
  // ==========================================
  describe('Feature 2: View Switcher (Calendar vs Matrix)', () => {
    it('VIEW-SW-01: Defaults viewMode to "calendar" upon initial load', () => {
      expect(engine.viewMode).toBe('calendar');
    });

    it('VIEW-SW-02: Switches viewMode to "matrix" on user toggle', () => {
      engine.setViewMode('matrix');
      expect(engine.viewMode).toBe('matrix');
    });

    it('VIEW-SW-03: Switches viewMode back to "calendar" from "matrix"', () => {
      engine.setViewMode('matrix');
      expect(engine.viewMode).toBe('matrix');
      engine.setViewMode('calendar');
      expect(engine.viewMode).toBe('calendar');
    });

    it('VIEW-SW-04: Throws validation error if setViewMode is invoked with invalid mode string', () => {
      expect(() => engine.setViewMode('invalid-mode' as any)).toThrow('Invalid ViewMode');
    });

    it('VIEW-SW-05: Preserves selectedDate state when toggling view mode', () => {
      engine.selectDate('2026-08-10');
      expect(engine.selectedDate).toBe('2026-08-10');
      engine.setViewMode('matrix');
      expect(engine.selectedDate).toBe('2026-08-10');
      engine.setViewMode('calendar');
      expect(engine.selectedDate).toBe('2026-08-10');
    });
  });

  // ==========================================
  // Feature 3: Glowing User Shift Highlights
  // ==========================================
  describe('Feature 3: Glowing User Shift Highlights', () => {
    it('GLOW-01: Correctly flags assignment as currentUser when userId matches currentUserId', () => {
      const aliceShift: ShiftAssignment = {
        id: 's1',
        userId: 'user-alice',
        userName: 'Alice',
        date: '2026-08-03',
        shiftTypeId: 'd1',
        shiftTypeName: 'Day',
        color: 'bg-blue-500',
      };
      const bobShift: ShiftAssignment = {
        id: 's2',
        userId: 'user-bob',
        userName: 'Bob',
        date: '2026-08-03',
        shiftTypeId: 'd1',
        shiftTypeName: 'Day',
        color: 'bg-blue-500',
      };

      expect(engine.isCurrentUserAssignment(aliceShift)).toBe(true);
      expect(engine.isCurrentUserAssignment(bobShift)).toBe(false);
    });

    it('GLOW-02: Returns glowing assignments filtered by currentUser for a specific date cell', () => {
      engine.assignments = [
        { id: 's1', userId: 'user-alice', userName: 'Alice', date: '2026-08-05', shiftTypeId: 'st1', shiftTypeName: 'Morning', color: 'bg-green-500' },
        { id: 's2', userId: 'user-bob', userName: 'Bob', date: '2026-08-05', shiftTypeId: 'st2', shiftTypeName: 'Evening', color: 'bg-orange-500' },
      ];

      const glowing = engine.getGlowingAssignmentsForDate('2026-08-05');
      expect(glowing.length).toBe(1);
      expect(glowing[0].id).toBe('s1');
      expect(glowing[0].userId).toBe('user-alice');
    });

    it('GLOW-03: Returns empty list for glowing assignments if currentUser has no shifts on date', () => {
      engine.assignments = [
        { id: 's1', userId: 'user-bob', userName: 'Bob', date: '2026-08-05', shiftTypeId: 'st2', shiftTypeName: 'Evening', color: 'bg-orange-500' },
      ];

      const glowing = engine.getGlowingAssignmentsForDate('2026-08-05');
      expect(glowing.length).toBe(0);
    });

    it('GLOW-04: Supports case-insensitive userId matching for glowing user highlights', () => {
      engine.currentUserId = 'USER-ALICE';
      const shift: ShiftAssignment = {
        id: 's1',
        userId: 'user-alice',
        userName: 'Alice',
        date: '2026-08-03',
        shiftTypeId: 'st1',
        shiftTypeName: 'Day',
        color: 'bg-blue-500',
      };
      expect(engine.isCurrentUserAssignment(shift)).toBe(true);
    });

    it('GLOW-05: Returns false for isCurrentUserAssignment when currentUserId is null/undefined', () => {
      engine.currentUserId = null;
      const shift: ShiftAssignment = {
        id: 's1',
        userId: 'user-alice',
        userName: 'Alice',
        date: '2026-08-03',
        shiftTypeId: 'st1',
        shiftTypeName: 'Day',
        color: 'bg-blue-500',
      };
      expect(engine.isCurrentUserAssignment(shift)).toBe(false);
    });
  });

  // ==========================================
  // Feature 4: Desktop Drag & Drop Scheduling
  // ==========================================
  describe('Feature 4: Desktop Drag & Drop Scheduling', () => {
    it('DRAG-DROP-01: Drops shift template onto valid date cell and adds assignment', () => {
      const dropped = engine.dropShift('shift-day', '2026-08-10', 'Day Shift', 'bg-blue-500');
      expect(dropped).toBeTruthy();
      expect(dropped.date).toBe('2026-08-10');
      expect(dropped.shiftTypeId).toBe('shift-day');

      const dateAssignments = engine.getAssignmentsForDate('2026-08-10');
      expect(dateAssignments.length).toBe(1);
    });

    it('DRAG-DROP-02: Assigns unique ID and correct shiftTypeId to dropped shift', () => {
      const d1 = engine.dropShift('shift-night', '2026-08-11', 'Night Shift');
      const d2 = engine.dropShift('shift-night', '2026-08-11', 'Night Shift');
      expect(d1.id).not.toBe(d2.id);
      expect(d1.shiftTypeId).toBe('shift-night');
      expect(d2.shiftTypeId).toBe('shift-night');
    });

    it('DRAG-DROP-03: Rejects shift drop when user is not a scheduler (isScheduler = false)', () => {
      engine.isScheduler = false;
      expect(() => engine.dropShift('shift-day', '2026-08-10')).toThrow('Permission denied');
    });

    it('DRAG-DROP-04: Rejects shift drop onto date cell outside 28-day rotation bounds', () => {
      expect(() => engine.dropShift('shift-day', '2026-09-01')).toThrow('out of bounds');
    });

    it('DRAG-DROP-05: Rejects shift drop with empty or blank shiftTypeId', () => {
      expect(() => engine.dropShift('', '2026-08-10')).toThrow('Invalid shiftTypeId');
    });
  });

  // ==========================================
  // Feature 5: Desktop Multi-Select Batch Assignment
  // ==========================================
  describe('Feature 5: Desktop Multi-Select Batch Assignment', () => {
    it('BATCH-01: Toggles date selection on date cells into selection buffer', () => {
      expect(engine.selectedDates.size).toBe(0);

      engine.toggleDateSelection('2026-08-03');
      expect(engine.selectedDates.has('2026-08-03')).toBe(true);

      engine.toggleDateSelection('2026-08-04');
      expect(engine.selectedDates.size).toBe(2);

      // Toggle off 2026-08-03
      engine.toggleDateSelection('2026-08-03');
      expect(engine.selectedDates.has('2026-08-03')).toBe(false);
      expect(engine.selectedDates.size).toBe(1);
    });

    it('BATCH-02: Selects contiguous range of dates across grid via selectDateRange', () => {
      engine.selectDateRange('2026-08-03', '2026-08-07');
      expect(engine.selectedDates.size).toBe(5);
      expect(engine.selectedDates.has('2026-08-03')).toBe(true);
      expect(engine.selectedDates.has('2026-08-07')).toBe(true);
    });

    it('BATCH-03: Performs batch assignment across all selected dates in one operation', () => {
      engine.toggleDateSelection('2026-08-03');
      engine.toggleDateSelection('2026-08-04');
      engine.toggleDateSelection('2026-08-05');

      const created = engine.batchAssign('st-icu-day', 'ICU Day', 'bg-purple-600');
      expect(created.length).toBe(3);

      expect(engine.getAssignmentsForDate('2026-08-03').length).toBe(1);
      expect(engine.getAssignmentsForDate('2026-08-04').length).toBe(1);
      expect(engine.getAssignmentsForDate('2026-08-05').length).toBe(1);
    });

    it('BATCH-04: Clears selectedDates set after successful batch assign', () => {
      engine.toggleDateSelection('2026-08-10');
      engine.batchAssign('st-night');
      expect(engine.selectedDates.size).toBe(0);
    });

    it('BATCH-05: Rejects batch assignment when user is not a scheduler', () => {
      engine.toggleDateSelection('2026-08-10');
      engine.isScheduler = false;
      expect(() => engine.batchAssign('st-night')).toThrow('Permission denied');
    });
  });

  // ==========================================
  // Feature 6: iPad/Mobile Touch Context Menu
  // ==========================================
  describe('Feature 6: iPad/Mobile Touch Context Menu', () => {
    it('TOUCH-MENU-01: Opens touch context menu for valid date cell', () => {
      expect(engine.touchMenu.isOpen).toBe(false);
      engine.openTouchMenu('2026-08-12');
      expect(engine.touchMenu.isOpen).toBe(true);
      expect(engine.touchMenu.date).toBe('2026-08-12');
    });

    it('TOUCH-MENU-02: Sets targetShiftId when touch menu is opened on a specific shift', () => {
      engine.openTouchMenu('2026-08-12', 'shift-999');
      expect(engine.touchMenu.isOpen).toBe(true);
      expect(engine.touchMenu.targetShiftId).toBe('shift-999');
    });

    it('TOUCH-MENU-03: Closes touch context menu cleanly and resets state', () => {
      engine.openTouchMenu('2026-08-12', 'shift-999');
      engine.closeTouchMenu();
      expect(engine.touchMenu.isOpen).toBe(false);
      expect(engine.touchMenu.date).toBeNull();
      expect(engine.touchMenu.targetShiftId).toBeNull();
    });

    it('TOUCH-MENU-04: Rejects opening touch context menu for out-of-bounds date', () => {
      expect(() => engine.openTouchMenu('2026-09-30')).toThrow('out of bounds');
    });

    it('TOUCH-MENU-05: Maintains menu state isolation between different dates', () => {
      engine.openTouchMenu('2026-08-05');
      expect(engine.touchMenu.date).toBe('2026-08-05');
      engine.openTouchMenu('2026-08-08');
      expect(engine.touchMenu.date).toBe('2026-08-08');
    });
  });

  // ==========================================
  // Feature 7: iPad/Mobile Copy & Paste Day Roster
  // ==========================================
  describe('Feature 7: iPad/Mobile Copy & Paste Day Roster', () => {
    it('COPY-PASTE-01: Copies source day roster assignments into copiedRosterBuffer', () => {
      engine.assignments = [
        { id: 'a1', userId: 'u1', userName: 'Doc 1', date: '2026-08-03', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
        { id: 'a2', userId: 'u2', userName: 'Doc 2', date: '2026-08-03', shiftTypeId: 'st2', shiftTypeName: 'Night', color: 'bg-indigo-500' },
      ];

      const copied = engine.copyDayRoster('2026-08-03');
      expect(copied.length).toBe(2);
      expect(engine.copiedRosterDate).toBe('2026-08-03');
      expect(engine.copiedRosterAssignments.length).toBe(2);
    });

    it('COPY-PASTE-02: Pastes copied roster onto target date cell with new unique IDs', () => {
      engine.assignments = [
        { id: 'a1', userId: 'u1', userName: 'Doc 1', date: '2026-08-03', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
      ];

      engine.copyDayRoster('2026-08-03');
      const pasted = engine.pasteDayRoster('2026-08-10');

      expect(pasted.length).toBe(1);
      expect(pasted[0].date).toBe('2026-08-10');
      expect(pasted[0].id).not.toBe('a1');

      expect(engine.getAssignmentsForDate('2026-08-10').length).toBe(1);
    });

    it('COPY-PASTE-03: Rejects paste action when no roster has been copied', () => {
      expect(() => engine.pasteDayRoster('2026-08-10')).toThrow('No copied roster available');
    });

    it('COPY-PASTE-04: Rejects pasting day roster onto the exact same source date', () => {
      engine.assignments = [
        { id: 'a1', userId: 'u1', userName: 'Doc 1', date: '2026-08-03', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
      ];
      engine.copyDayRoster('2026-08-03');
      expect(() => engine.pasteDayRoster('2026-08-03')).toThrow('same source date');
    });

    it('COPY-PASTE-05: Rejects paste action when user is not a scheduler', () => {
      engine.assignments = [
        { id: 'a1', userId: 'u1', userName: 'Doc 1', date: '2026-08-03', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
      ];
      engine.copyDayRoster('2026-08-03');
      engine.isScheduler = false;
      expect(() => engine.pasteDayRoster('2026-08-10')).toThrow('Permission denied');
    });
  });

  // ==========================================
  // Feature 8: Day Inspector Panel (Collapsible/Expandable)
  // ==========================================
  describe('Feature 8: Day Inspector Panel (Collapsible/Expandable)', () => {
    it('INSPECT-01: Selecting a date opens Day Inspector panel automatically', () => {
      expect(engine.dayInspector.isOpen).toBe(false);
      engine.selectDate('2026-08-15');
      expect(engine.dayInspector.isOpen).toBe(true);
      expect(engine.dayInspector.selectedDate).toBe('2026-08-15');
    });

    it('INSPECT-02: Displays assignments for selected date inside Day Inspector', () => {
      engine.assignments = [
        { id: 'as1', userId: 'u1', userName: 'Dr. Smith', date: '2026-08-15', shiftTypeId: 'st1', shiftTypeName: 'ER Shift', color: 'bg-red-500' },
      ];
      engine.selectDate('2026-08-15');
      const inspectorAssignments = engine.getAssignmentsForDate(engine.dayInspector.selectedDate!);
      expect(inspectorAssignments.length).toBe(1);
      expect(inspectorAssignments[0].userName).toBe('Dr. Smith');
    });

    it('INSPECT-03: Closes Day Inspector panel and resets selectedDate to null', () => {
      engine.selectDate('2026-08-15');
      engine.closeDayInspector();
      expect(engine.dayInspector.isOpen).toBe(false);
      expect(engine.dayInspector.selectedDate).toBeNull();
      expect(engine.selectedDate).toBeNull();
    });

    it('INSPECT-04: Removes an assignment from selected date via removeAssignment', () => {
      engine.assignments = [
        { id: 'rem-1', userId: 'u1', userName: 'Dr. Jones', date: '2026-08-15', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
      ];
      engine.selectDate('2026-08-15');
      engine.removeAssignment('rem-1');
      expect(engine.getAssignmentsForDate('2026-08-15').length).toBe(0);
    });

    it('INSPECT-05: Edits shift assignment details (notes/times) via editAssignment', () => {
      engine.assignments = [
        { id: 'ed-1', userId: 'u1', userName: 'Dr. Jones', date: '2026-08-15', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
      ];
      const updated = engine.editAssignment('ed-1', { shiftTypeName: 'Supervised Day', color: 'bg-green-500' });
      expect(updated.shiftTypeName).toBe('Supervised Day');
      expect(updated.color).toBe('bg-green-500');
    });
  });
});
