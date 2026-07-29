import { describe, it, expect, beforeEach } from './test-framework.ts';
import { CalendarStateEngine } from './calendar-model.ts';

describe('Tier 3: Cross-Feature Combinations Test Suite', () => {
  let engine: CalendarStateEngine;

  beforeEach(() => {
    engine = new CalendarStateEngine({
      startDate: '2026-08-03',
      currentUserId: 'user-alice',
      isScheduler: true,
    });
  });

  it('CROSS-01: View switching from Calendar to Matrix while a date is selected preserves selected date & Day Inspector state', () => {
    engine.selectDate('2026-08-10');
    expect(engine.dayInspector.isOpen).toBe(true);
    expect(engine.dayInspector.selectedDate).toBe('2026-08-10');

    engine.setViewMode('matrix');
    expect(engine.viewMode).toBe('matrix');
    expect(engine.selectedDate).toBe('2026-08-10');
    expect(engine.dayInspector.isOpen).toBe(true);

    engine.setViewMode('calendar');
    expect(engine.viewMode).toBe('calendar');
    expect(engine.selectedDate).toBe('2026-08-10');
  });

  it('CROSS-02: Copying day roster via touch menu, toggling view mode to Matrix and back retains copied roster state', () => {
    engine.dropShift('st-icu', '2026-08-03', 'ICU Shift');
    engine.openTouchMenu('2026-08-03');
    engine.copyDayRoster('2026-08-03');
    engine.closeTouchMenu();

    expect(engine.copiedRosterDate).toBe('2026-08-03');

    engine.setViewMode('matrix');
    expect(engine.copiedRosterDate).toBe('2026-08-03');

    engine.setViewMode('calendar');
    expect(engine.copiedRosterDate).toBe('2026-08-03');

    const pasted = engine.pasteDayRoster('2026-08-15');
    expect(pasted.length).toBe(1);
    expect(pasted[0].date).toBe('2026-08-15');
  });

  it('CROSS-03: Multi-selecting 5 dates with Day Inspector open for one of the dates, batch-assigning updates Day Inspector', () => {
    engine.selectDate('2026-08-05');
    expect(engine.dayInspector.isOpen).toBe(true);
    expect(engine.getAssignmentsForDate('2026-08-05').length).toBe(0);

    engine.selectDateRange('2026-08-03', '2026-08-07');
    expect(engine.selectedDates.size).toBe(5);

    engine.batchAssign('st-call', 'On Call');

    const inspectorAssignments = engine.getAssignmentsForDate(engine.dayInspector.selectedDate!);
    expect(inspectorAssignments.length).toBe(1);
    expect(inspectorAssignments[0].shiftTypeName).toBe('On Call');
  });

  it('CROSS-04: Dragging and dropping a shift onto a day cell while Day Inspector is open for that date updates inspector', () => {
    engine.selectDate('2026-08-12');
    expect(engine.getAssignmentsForDate('2026-08-12').length).toBe(0);

    engine.dropShift('st-er', '2026-08-12', 'ER Duty');

    const inspectorAssignments = engine.getAssignmentsForDate(engine.dayInspector.selectedDate!);
    expect(inspectorAssignments.length).toBe(1);
    expect(inspectorAssignments[0].shiftTypeName).toBe('ER Duty');
  });

  it('CROSS-05: Copying a day roster and performing Multi-Select Batch Assign maintains independent copied roster state', () => {
    engine.dropShift('st-ward', '2026-08-03', 'Ward Shift');
    engine.copyDayRoster('2026-08-03');

    engine.toggleDateSelection('2026-08-10');
    engine.toggleDateSelection('2026-08-11');
    engine.batchAssign('st-clinic', 'Clinic Duty');

    expect(engine.copiedRosterDate).toBe('2026-08-03');
    expect(engine.copiedRosterAssignments.length).toBe(1);
    expect(engine.copiedRosterAssignments[0].shiftTypeName).toBe('Ward Shift');
  });

  it('CROSS-06: Glowing user shift highlight updates dynamically when a shift is assigned to current user via Drag & Drop', () => {
    engine.currentUserId = 'user-alice';
    expect(engine.getGlowingAssignmentsForDate('2026-08-04').length).toBe(0);

    const dropped = engine.dropShift('st-day', '2026-08-04');
    expect(engine.isCurrentUserAssignment(dropped)).toBe(true);

    const glowing = engine.getGlowingAssignmentsForDate('2026-08-04');
    expect(glowing.length).toBe(1);
    expect(glowing[0].id).toBe(dropped.id);
  });

  it('CROSS-07: Glowing user shift highlight updates dynamically when assigned to current user via Batch Assign', () => {
    engine.currentUserId = 'user-batch';
    engine.toggleDateSelection('2026-08-05');
    engine.toggleDateSelection('2026-08-06');

    engine.batchAssign('st-batch', 'Batch Night');

    const glowingDay1 = engine.getGlowingAssignmentsForDate('2026-08-05');
    const glowingDay2 = engine.getGlowingAssignmentsForDate('2026-08-06');

    expect(glowingDay1.length).toBe(1);
    expect(glowingDay2.length).toBe(1);
  });

  it('CROSS-08: Pasting copied roster onto target date while Day Inspector is open for target date updates inspector', () => {
    engine.dropShift('st-icu', '2026-08-03', 'ICU Shift');
    engine.copyDayRoster('2026-08-03');

    engine.selectDate('2026-08-10');
    expect(engine.getAssignmentsForDate('2026-08-10').length).toBe(0);

    engine.pasteDayRoster('2026-08-10');

    const inspectorAssignments = engine.getAssignmentsForDate(engine.dayInspector.selectedDate!);
    expect(inspectorAssignments.length).toBe(1);
    expect(inspectorAssignments[0].shiftTypeName).toBe('ICU Shift');
  });

  it('CROSS-09: Toggling View Switcher during multi-select date state preserves date selection buffer', () => {
    engine.toggleDateSelection('2026-08-03');
    engine.toggleDateSelection('2026-08-04');
    expect(engine.selectedDates.size).toBe(2);

    engine.setViewMode('matrix');
    expect(engine.selectedDates.size).toBe(2);

    engine.setViewMode('calendar');
    expect(engine.selectedDates.size).toBe(2);
  });

  it('CROSS-10: Removing a shift assignment from Day Inspector panel updates glowing highlight on calendar cell', () => {
    engine.currentUserId = 'user-alice';
    const shift = engine.dropShift('st-day', '2026-08-05', 'Day Shift');
    expect(engine.getGlowingAssignmentsForDate('2026-08-05').length).toBe(1);

    engine.selectDate('2026-08-05');
    engine.removeAssignment(shift.id);

    expect(engine.getGlowingAssignmentsForDate('2026-08-05').length).toBe(0);
  });

  it('CROSS-11: Drag & drop shift onto date cell makes shift immediately available in Touch Context Menu options', () => {
    const dropped = engine.dropShift('st-er', '2026-08-08', 'Emergency Shift');
    engine.openTouchMenu('2026-08-08', dropped.id);

    expect(engine.touchMenu.isOpen).toBe(true);
    expect(engine.touchMenu.targetShiftId).toBe(dropped.id);
  });

  it('CROSS-12: Batch assigning shifts across a 7-day range, then toggling View Switcher shows assigned shifts in Matrix view', () => {
    engine.selectDateRange('2026-08-03', '2026-08-09');
    engine.batchAssign('st-week', 'Weekly Shift');

    engine.setViewMode('matrix');
    expect(engine.viewMode).toBe('matrix');

    const weekAssignments = engine.assignments.filter((a) => a.shiftTypeId === 'st-week');
    expect(weekAssignments.length).toBe(7);
  });
});
