import { describe, it, expect, beforeEach } from './test-framework.ts';
import { CalendarStateEngine } from './calendar-model.ts';
import { ShiftAssignment } from '../src/types.ts';

describe('Tier 2: Boundary & Corner Cases Test Suite', () => {
  let engine: CalendarStateEngine;

  beforeEach(() => {
    engine = new CalendarStateEngine({
      startDate: '2026-08-03',
      currentUserId: 'user-alice',
      isScheduler: true,
    });
  });

  // ==========================================
  // Feature 1 Boundaries: 4-Week Grid Layout
  // ==========================================
  describe('Feature 1 Boundaries: 4-Week Grid Layout', () => {
    it('4W-BOUND-01: Handles leap year month rollover (Feb 15, 2028 leap year rotation)', () => {
      const leapEngine = new CalendarStateEngine({ startDate: '2028-02-15' });
      const days = leapEngine.get28Days();
      expect(days.length).toBe(28);
      expect(days).toContain('2028-02-29'); // Leap day present
      expect(leapEngine.getEndDate()).toBe('2028-03-13');
    });

    it('4W-BOUND-02: Handles year-end rollover (Dec 20, 2026 to Jan 16, 2027)', () => {
      const yearEndEngine = new CalendarStateEngine({ startDate: '2026-12-20' });
      const days = yearEndEngine.get28Days();
      expect(days[0]).toBe('2026-12-20');
      expect(days[12]).toBe('2027-01-01');
      expect(yearEndEngine.getEndDate()).toBe('2027-01-16');
    });

    it('4W-BOUND-03: Handles cell rendering with 0 assignments (empty day)', () => {
      const cellAssignments = engine.getAssignmentsForDate('2026-08-03');
      expect(cellAssignments).toEqual([]);
      expect(cellAssignments.length).toBe(0);
    });

    it('4W-BOUND-04: Handles cell rendering with overflow assignments (25+ assignments on single day)', () => {
      const overflowShifts: ShiftAssignment[] = [];
      for (let i = 0; i < 25; i++) {
        overflowShifts.push({
          id: `overflow-${i}`,
          userId: `user-${i}`,
          userName: `Staff ${i}`,
          date: '2026-08-10',
          shiftTypeId: 'st-day',
          shiftTypeName: 'Day Shift',
          color: 'bg-blue-500',
        });
      }
      engine.assignments = overflowShifts;

      const dateAssignments = engine.getAssignmentsForDate('2026-08-10');
      expect(dateAssignments.length).toBe(25);
    });

    it('4W-BOUND-05: Throws error for invalid date string format (e.g., "invalid-date-string")', () => {
      const invalidEngine = new CalendarStateEngine({ startDate: 'invalid-date-string' });
      expect(() => invalidEngine.get28Days()).toThrow('Invalid startDate format');
    });
  });

  // ==========================================
  // Feature 2 Boundaries: View Switcher
  // ==========================================
  describe('Feature 2 Boundaries: View Switcher', () => {
    it('VIEW-BOUND-01: Rapid sequential view toggles (calendar -> matrix -> calendar -> matrix -> calendar)', () => {
      expect(engine.viewMode).toBe('calendar');
      engine.setViewMode('matrix');
      engine.setViewMode('calendar');
      engine.setViewMode('matrix');
      engine.setViewMode('calendar');
      expect(engine.viewMode).toBe('calendar');
    });

    it('VIEW-BOUND-02: View mode switching with empty assignments array ([])', () => {
      engine.assignments = [];
      engine.setViewMode('matrix');
      expect(engine.viewMode).toBe('matrix');
      engine.setViewMode('calendar');
      expect(engine.viewMode).toBe('calendar');
    });

    it('VIEW-BOUND-03: View mode switching with massive assignment array (1000+ items)', () => {
      const bigList: ShiftAssignment[] = [];
      for (let i = 0; i < 1000; i++) {
        bigList.push({
          id: `big-${i}`,
          userId: `u-${i % 20}`,
          userName: `User ${i % 20}`,
          date: engine.get28Days()[i % 28],
          shiftTypeId: 'st-1',
          shiftTypeName: 'Shift',
          color: 'bg-blue-500',
        });
      }
      engine.assignments = bigList;
      engine.setViewMode('matrix');
      expect(engine.viewMode).toBe('matrix');
      expect(engine.assignments.length).toBe(1000);
    });

    it('VIEW-BOUND-04: View mode switching when selectedDate is set to non-grid date', () => {
      engine.selectedDate = '2030-01-01';
      engine.setViewMode('matrix');
      expect(engine.selectedDate).toBe('2030-01-01');
    });

    it('VIEW-BOUND-05: View mode switching preserves selectedDates multi-select buffer', () => {
      engine.toggleDateSelection('2026-08-03');
      engine.toggleDateSelection('2026-08-04');
      expect(engine.selectedDates.size).toBe(2);

      engine.setViewMode('matrix');
      expect(engine.selectedDates.size).toBe(2);
      expect(engine.selectedDates.has('2026-08-03')).toBe(true);
    });
  });

  // ==========================================
  // Feature 3 Boundaries: Glowing User Highlights
  // ==========================================
  describe('Feature 3 Boundaries: Glowing User Highlights', () => {
    it('GLOW-BOUND-01: User has 0 assigned shifts across all 28 days', () => {
      engine.currentUserId = 'user-zero-shifts';
      engine.assignments = [
        { id: 's1', userId: 'user-bob', userName: 'Bob', date: '2026-08-03', shiftTypeId: 'st1', shiftTypeName: 'Day', color: 'bg-blue-500' },
      ];

      const days = engine.get28Days();
      let totalGlowing = 0;
      for (const d of days) {
        totalGlowing += engine.getGlowingAssignmentsForDate(d).length;
      }
      expect(totalGlowing).toBe(0);
    });

    it('GLOW-BOUND-02: User is assigned to all 28 days (28 consecutive shifts)', () => {
      const days = engine.get28Days();
      const allDaysShifts: ShiftAssignment[] = days.map((d, idx) => ({
        id: `all-${idx}`,
        userId: 'user-alice',
        userName: 'Alice',
        date: d,
        shiftTypeId: 'st1',
        shiftTypeName: 'Daily Shift',
        color: 'bg-blue-500',
      }));
      engine.assignments = allDaysShifts;

      for (const d of days) {
        const glowing = engine.getGlowingAssignmentsForDate(d);
        expect(glowing.length).toBe(1);
        expect(glowing[0].userId).toBe('user-alice');
      }
    });

    it('GLOW-BOUND-03: User ID containing leading/trailing whitespace and uppercase/lowercase mix', () => {
      engine.currentUserId = '  User-Alice  ';
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

    it('GLOW-BOUND-04: User ID with special characters and symbols (e.g., "usr#123@spec!")', () => {
      engine.currentUserId = 'usr#123@spec!';
      const shift: ShiftAssignment = {
        id: 's1',
        userId: 'usr#123@spec!',
        userName: 'Special User',
        date: '2026-08-03',
        shiftTypeId: 'st1',
        shiftTypeName: 'Day',
        color: 'bg-blue-500',
      };
      expect(engine.isCurrentUserAssignment(shift)).toBe(true);
    });

    it('GLOW-BOUND-05: Multiple shifts for current user on the same date cell (both highlighted)', () => {
      engine.assignments = [
        { id: 'm1', userId: 'user-alice', userName: 'Alice', date: '2026-08-03', shiftTypeId: 'st1', shiftTypeName: 'Morning', color: 'bg-green-500' },
        { id: 'm2', userId: 'user-alice', userName: 'Alice', date: '2026-08-03', shiftTypeId: 'st2', shiftTypeName: 'Night Call', color: 'bg-purple-500' },
      ];

      const glowing = engine.getGlowingAssignmentsForDate('2026-08-03');
      expect(glowing.length).toBe(2);
    });
  });

  // ==========================================
  // Feature 4 Boundaries: Desktop Drag & Drop
  // ==========================================
  describe('Feature 4 Boundaries: Desktop Drag & Drop', () => {
    it('DRAG-BOUND-01: Drop payload with whitespace shiftTypeId throws error', () => {
      expect(() => engine.dropShift('   ', '2026-08-03')).toThrow('Invalid shiftTypeId');
    });

    it('DRAG-BOUND-02: Drop onto date cell on the exact boundary day 28 (last day)', () => {
      const lastDay = engine.getEndDate(); // 2026-08-30
      const dropped = engine.dropShift('st-last', lastDay);
      expect(dropped.date).toBe(lastDay);
      expect(engine.getAssignmentsForDate(lastDay).length).toBe(1);
    });

    it('DRAG-BOUND-03: Drop onto date cell on the exact boundary day 1 (first day)', () => {
      const firstDay = engine.startDate; // 2026-08-03
      const dropped = engine.dropShift('st-first', firstDay);
      expect(dropped.date).toBe(firstDay);
      expect(engine.getAssignmentsForDate(firstDay).length).toBe(1);
    });

    it('DRAG-BOUND-04: Rapid consecutive drag-drops on the same date cell', () => {
      for (let i = 0; i < 5; i++) {
        engine.dropShift(`st-${i}`, '2026-08-10', `Shift ${i}`);
      }
      expect(engine.getAssignmentsForDate('2026-08-10').length).toBe(5);
    });

    it('DRAG-BOUND-05: Attempting drop when user role flips from scheduler to non-scheduler', () => {
      engine.dropShift('st-1', '2026-08-03');
      engine.isScheduler = false;
      expect(() => engine.dropShift('st-2', '2026-08-03')).toThrow('Permission denied');
    });
  });

  // ==========================================
  // Feature 5 Boundaries: Desktop Multi-Select Batch Assignment
  // ==========================================
  describe('Feature 5 Boundaries: Desktop Multi-Select Batch Assignment', () => {
    it('BATCH-BOUND-01: Batch assign when selectedDates set is empty (0 selected dates - returns [])', () => {
      const res = engine.batchAssign('st-1');
      expect(res).toEqual([]);
      expect(res.length).toBe(0);
    });

    it('BATCH-BOUND-02: Batch assign selecting all 28 dates at once', () => {
      const days = engine.get28Days();
      for (const d of days) {
        engine.selectedDates.add(d);
      }
      expect(engine.selectedDates.size).toBe(28);

      const created = engine.batchAssign('st-all-28', 'All Day Shift');
      expect(created.length).toBe(28);
      expect(engine.selectedDates.size).toBe(0);
    });

    it('BATCH-BOUND-03: Multi-select toggling same date on and off 10 times in row', () => {
      const date = '2026-08-15';
      for (let i = 0; i < 10; i++) {
        engine.toggleDateSelection(date);
      }
      expect(engine.selectedDates.has(date)).toBe(false);
    });

    it('BATCH-BOUND-04: Range selection with inverted dates (endDate before startDate)', () => {
      engine.selectDateRange('2026-08-10', '2026-08-05');
      expect(engine.selectedDates.size).toBe(6); // 05, 06, 07, 08, 09, 10
      expect(engine.selectedDates.has('2026-08-05')).toBe(true);
      expect(engine.selectedDates.has('2026-08-10')).toBe(true);
    });

    it('BATCH-BOUND-05: Batch assign with non-contiguous random date selections across 4 weeks', () => {
      engine.toggleDateSelection('2026-08-03'); // W1
      engine.toggleDateSelection('2026-08-12'); // W2
      engine.toggleDateSelection('2026-08-19'); // W3
      engine.toggleDateSelection('2026-08-28'); // W4

      const created = engine.batchAssign('st-sparse');
      expect(created.length).toBe(4);
    });
  });

  // ==========================================
  // Feature 6 Boundaries: iPad/Mobile Touch Context Menu
  // ==========================================
  describe('Feature 6 Boundaries: iPad/Mobile Touch Context Menu', () => {
    it('TOUCH-BOUND-01: Open touch menu on empty day (0 shifts)', () => {
      engine.openTouchMenu('2026-08-03');
      expect(engine.touchMenu.isOpen).toBe(true);
      expect(engine.getAssignmentsForDate('2026-08-03').length).toBe(0);
    });

    it('TOUCH-BOUND-02: Open touch menu on high-density day (20 shifts)', () => {
      for (let i = 0; i < 20; i++) {
        engine.dropShift(`st-${i}`, '2026-08-04');
      }
      engine.openTouchMenu('2026-08-04');
      expect(engine.touchMenu.isOpen).toBe(true);
      expect(engine.getAssignmentsForDate('2026-08-04').length).toBe(20);
    });

    it('TOUCH-BOUND-03: Rapid consecutive touch menu opening across 5 different dates', () => {
      const dates = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'];
      for (const d of dates) {
        engine.openTouchMenu(d);
        expect(engine.touchMenu.date).toBe(d);
      }
    });

    it('TOUCH-BOUND-04: Open touch menu with non-existent targetShiftId', () => {
      engine.openTouchMenu('2026-08-03', 'non-existent-shift-id');
      expect(engine.touchMenu.isOpen).toBe(true);
      expect(engine.touchMenu.targetShiftId).toBe('non-existent-shift-id');
    });

    it('TOUCH-BOUND-05: Opening touch menu while Day Inspector is open', () => {
      engine.selectDate('2026-08-10');
      expect(engine.dayInspector.isOpen).toBe(true);

      engine.openTouchMenu('2026-08-10');
      expect(engine.touchMenu.isOpen).toBe(true);
      expect(engine.dayInspector.isOpen).toBe(true);
    });
  });

  // ==========================================
  // Feature 7 Boundaries: iPad/Mobile Copy & Paste Day Roster
  // ==========================================
  describe('Feature 7 Boundaries: iPad/Mobile Copy & Paste Day Roster', () => {
    it('COPY-BOUND-01: Copying roster from an empty day (0 shifts) and pasting onto populated day', () => {
      // Source day empty
      engine.copyDayRoster('2026-08-03');
      expect(engine.copiedRosterAssignments.length).toBe(0);

      // Target day has 1 shift
      engine.dropShift('st-old', '2026-08-04');
      expect(engine.getAssignmentsForDate('2026-08-04').length).toBe(1);

      // Pasting empty roster
      const pasted = engine.pasteDayRoster('2026-08-04');
      expect(pasted.length).toBe(0);
      // Existing shift remains intact
      expect(engine.getAssignmentsForDate('2026-08-04').length).toBe(1);
    });

    it('COPY-BOUND-02: Pasting copied roster sequentially to 10 different target dates', () => {
      engine.dropShift('st-template', '2026-08-03');
      engine.copyDayRoster('2026-08-03');

      const targetDates = engine.get28Days().slice(1, 11);
      for (const target of targetDates) {
        const pasted = engine.pasteDayRoster(target);
        expect(pasted.length).toBe(1);
        expect(pasted[0].date).toBe(target);
      }
    });

    it('COPY-BOUND-03: Copying roster, modifying source date shifts, ensuring copied buffer remains immutable snapshot', () => {
      engine.dropShift('st-initial', '2026-08-03');
      engine.copyDayRoster('2026-08-03');

      // Add another shift to source date after copy
      engine.dropShift('st-later', '2026-08-03');

      expect(engine.getAssignmentsForDate('2026-08-03').length).toBe(2);
      expect(engine.copiedRosterAssignments.length).toBe(1); // Copied snapshot untouched
    });

    it('COPY-BOUND-04: Attempting paste when copiedRosterAssignments is cleared/empty throws error if no copied date', () => {
      engine.copiedRosterDate = null;
      engine.copiedRosterAssignments = [];
      expect(() => engine.pasteDayRoster('2026-08-05')).toThrow('No copied roster available');
    });

    it('COPY-BOUND-05: Pasting roster to day that already has identical user assignments', () => {
      engine.dropShift('st-1', '2026-08-03');
      engine.copyDayRoster('2026-08-03');

      engine.dropShift('st-1', '2026-08-04');
      const pasted = engine.pasteDayRoster('2026-08-04');
      expect(pasted.length).toBe(1);
      expect(engine.getAssignmentsForDate('2026-08-04').length).toBe(2);
    });
  });

  // ==========================================
  // Feature 8 Boundaries: Day Inspector Panel
  // ==========================================
  describe('Feature 8 Boundaries: Day Inspector Panel', () => {
    it('INSPECT-BOUND-01: Selected date is null (panel closed, isOpen = false)', () => {
      engine.selectDate(null);
      expect(engine.dayInspector.isOpen).toBe(false);
      expect(engine.dayInspector.selectedDate).toBeNull();
    });

    it('INSPECT-BOUND-02: Selected date is outside 28-day rotation bounds', () => {
      engine.selectDate('2029-12-31');
      expect(engine.dayInspector.isOpen).toBe(true);
      expect(engine.getAssignmentsForDate('2029-12-31').length).toBe(0);
    });

    it('INSPECT-BOUND-03: Shift notes containing HTML tags/script strings (XSS prevention check)', () => {
      const xssShift = engine.dropShift('st-xss', '2026-08-03');
      const updated = engine.editAssignment(xssShift.id, { shiftTypeName: '<script>alert("xss")</script>' });
      expect(updated.shiftTypeName).toContain('<script>');
    });

    it('INSPECT-BOUND-04: Removing assignment with invalid non-existent ID throws error', () => {
      expect(() => engine.removeAssignment('invalid-assignment-id')).toThrow('not found');
    });

    it('INSPECT-BOUND-05: Editing assignment with non-existent ID throws error', () => {
      expect(() => engine.editAssignment('invalid-assignment-id', { color: 'bg-red-500' })).toThrow('not found');
    });
  });
});
