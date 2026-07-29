import { describe, it, expect, beforeEach } from './test-framework.ts';
import { CalendarStateEngine } from './calendar-model.ts';

describe('Tier 4: Real-World Application Scenarios Test Suite', () => {
  let engine: CalendarStateEngine;

  beforeEach(() => {
    engine = new CalendarStateEngine({
      startDate: '2026-08-03',
      currentUserId: 'user-alice',
      isScheduler: true,
    });
  });

  it('SCENARIO-01: Full 28-Day Monthly Roster Setup Workflow', () => {
    const days = engine.get28Days();
    expect(days.length).toBe(28);

    // 1. Identify Weekdays (20 days) vs Weekends (8 days)
    const weekdays: string[] = [];
    const weekends: string[] = [];

    const cells = engine.buildGridCells();
    for (const cell of cells) {
      if (cell.dayOfWeek === 0 || cell.dayOfWeek === 6) {
        weekends.push(cell.date);
      } else {
        weekdays.push(cell.date);
      }
    }

    expect(weekdays.length).toBe(20);
    expect(weekends.length).toBe(8);

    // 2. Batch assign Weekday Regular Shifts
    for (const wDay of weekdays) {
      engine.toggleDateSelection(wDay);
    }
    const weekdayShifts = engine.batchAssign('st-weekday-regular', 'Regular Day Shift', 'bg-blue-600');
    expect(weekdayShifts.length).toBe(20);

    // 3. Drag & drop Weekend On-Call Shifts for all 8 weekend dates
    const weekendShifts = [];
    for (const weDay of weekends) {
      const dropped = engine.dropShift('st-weekend-call', weDay, 'Weekend Call Shift', 'bg-red-500');
      weekendShifts.push(dropped);
    }
    expect(weekendShifts.length).toBe(8);

    // 4. Verify complete 28-day coverage (every single date has at least 1 shift)
    for (const date of days) {
      const assignments = engine.getAssignmentsForDate(date);
      expect(assignments.length).toBeGreaterThan(0);
    }
    expect(engine.assignments.length).toBe(28);
  });

  it('SCENARIO-02: Shift Swap & Roster Re-balancing Workload Scenario', () => {
    const mondayW1 = '2026-08-03';
    const mondayW2 = '2026-08-10';
    const mondayW3 = '2026-08-17';
    const mondayW4 = '2026-08-24';

    // 1. Setup balanced roster on Monday W1 (Day 1)
    engine.dropShift('st-er-lead', mondayW1, 'ER Team Lead', 'bg-red-600');
    engine.dropShift('st-er-nurse', mondayW1, 'ER Triage Nurse', 'bg-blue-500');
    engine.dropShift('st-er-oncall', mondayW1, 'ER On Call', 'bg-yellow-500');

    expect(engine.getAssignmentsForDate(mondayW1).length).toBe(3);

    // 2. Copy Day 1 roster using mobile/iPad touch context menu workflow
    engine.openTouchMenu(mondayW1);
    engine.copyDayRoster(mondayW1);
    engine.closeTouchMenu();

    expect(engine.copiedRosterDate).toBe(mondayW1);
    expect(engine.copiedRosterAssignments.length).toBe(3);

    // 3. Paste copied roster to Mondays of W2, W3, W4
    const pastedW2 = engine.pasteDayRoster(mondayW2);
    const pastedW3 = engine.pasteDayRoster(mondayW3);
    const pastedW4 = engine.pasteDayRoster(mondayW4);

    expect(pastedW2.length).toBe(3);
    expect(pastedW3.length).toBe(3);
    expect(pastedW4.length).toBe(3);

    // 4. Verify all 4 Mondays have identical shift counts and types via Day Inspector
    for (const mDate of [mondayW1, mondayW2, mondayW3, mondayW4]) {
      engine.selectDate(mDate);
      expect(engine.dayInspector.isOpen).toBe(true);
      const inspectorRoster = engine.getAssignmentsForDate(engine.dayInspector.selectedDate!);
      expect(inspectorRoster.length).toBe(3);
      expect(inspectorRoster.map((r) => r.shiftTypeName).sort()).toEqual(['ER On Call', 'ER Team Lead', 'ER Triage Nurse']);
    }
  });

  it('SCENARIO-03: Multi-Device Roster Management End-to-End Flow', () => {
    // Phase 1: Desktop Batch Assign for Week 1 (Days 1 to 5)
    engine.selectDateRange('2026-08-03', '2026-08-07');
    engine.batchAssign('st-morning', 'Morning Shift', 'bg-emerald-500');
    expect(engine.assignments.length).toBe(5);

    // Phase 2: Switch to Mobile View - Open Touch Menu on Day 5 and edit notes via Inspector
    engine.openTouchMenu('2026-08-07');
    engine.selectDate('2026-08-07');

    const day5Assignment = engine.getAssignmentsForDate('2026-08-07')[0];
    engine.editAssignment(day5Assignment.id, { shiftTypeName: 'Morning (Lead Supervisor)' });
    expect(engine.getAssignmentsForDate('2026-08-07')[0].shiftTypeName).toBe('Morning (Lead Supervisor)');

    // Phase 3: Mobile Copy Roster from Day 5 and Paste onto Day 14
    engine.copyDayRoster('2026-08-07');
    engine.pasteDayRoster('2026-08-16');
    expect(engine.getAssignmentsForDate('2026-08-16')[0].shiftTypeName).toBe('Morning (Lead Supervisor)');

    // Phase 4: Toggle View Switcher to Matrix view to inspect monthly load
    engine.setViewMode('matrix');
    expect(engine.viewMode).toBe('matrix');
    expect(engine.assignments.length).toBe(6);

    // Phase 5: Toggle back to Calendar View - verify zero state corruption
    engine.setViewMode('calendar');
    expect(engine.viewMode).toBe('calendar');
    expect(engine.assignments.length).toBe(6);
  });

  it('SCENARIO-04: User Personal Roster Inspection & Highlight Verification', () => {
    engine.currentUserId = 'user-alice';

    // Scheduler assigns 10 shifts to Alice across the 28-day schedule
    const days = engine.get28Days();
    const aliceDates = [days[0], days[2], days[4], days[7], days[9], days[11], days[14], days[16], days[18], days[21]];
    const bobDates = [days[1], days[3], days[5], days[8], days[10], days[12], days[15], days[17], days[19], days[22]];

    for (const d of aliceDates) {
      engine.assignments.push({
        id: `alice-${d}`,
        userId: 'user-alice',
        userName: 'Alice',
        date: d,
        shiftTypeId: 'st-duty',
        shiftTypeName: 'Main Duty',
        color: 'bg-blue-500',
        isCurrentUser: true,
      });
    }

    for (const d of bobDates) {
      engine.assignments.push({
        id: `bob-${d}`,
        userId: 'user-bob',
        userName: 'Bob',
        date: d,
        shiftTypeId: 'st-duty',
        shiftTypeName: 'Main Duty',
        color: 'bg-green-500',
        isCurrentUser: false,
      });
    }

    // 1. Verify glowing highlights for Alice on all her assigned dates
    for (const d of aliceDates) {
      const glowing = engine.getGlowingAssignmentsForDate(d);
      expect(glowing.length).toBe(1);
      expect(glowing[0].userId).toBe('user-alice');
    }

    // 2. Verify NO glowing highlights on Bob's assigned dates for Alice
    for (const d of bobDates) {
      const glowing = engine.getGlowingAssignmentsForDate(d);
      expect(glowing.length).toBe(0);
    }

    // 3. Alice selects one of her dates to view Day Inspector details
    engine.selectDate(aliceDates[0]);
    expect(engine.dayInspector.isOpen).toBe(true);
    const inspectorRoster = engine.getAssignmentsForDate(engine.dayInspector.selectedDate!);
    expect(inspectorRoster[0].userName).toBe('Alice');
  });

  it('SCENARIO-05: Emergency Roster Overhaul & Rotation Reset Scenario', () => {
    // 1. Scheduler selects all 28 dates and applies emergency baseline shift
    const days = engine.get28Days();
    for (const d of days) {
      engine.selectedDates.add(d);
    }
    const emergencyShifts = engine.batchAssign('st-emergency', 'Emergency Standby', 'bg-red-700');
    expect(emergencyShifts.length).toBe(28);

    // 2. Open Day Inspector on Day 1 (2026-08-03) and remove emergency standby to replace with ICU Specialist
    engine.selectDate(days[0]);
    const day1EmergencyId = engine.getAssignmentsForDate(days[0])[0].id;
    engine.removeAssignment(day1EmergencyId);
    expect(engine.getAssignmentsForDate(days[0]).length).toBe(0);

    const icuShift = engine.dropShift('st-icu-spec', days[0], 'ICU Specialist', 'bg-purple-800');
    expect(engine.getAssignmentsForDate(days[0])[0].id).toBe(icuShift.id);

    // 3. Copy corrected Day 1 roster and paste to all Weekend dates
    engine.copyDayRoster(days[0]);

    const weekendDates = engine.buildGridCells().filter(c => c.dayOfWeek === 0 || c.dayOfWeek === 6).map(c => c.date);
    for (const weDate of weekendDates) {
      engine.pasteDayRoster(weDate);
    }

    // 4. Verify weekend dates now contain the ICU Specialist shift
    for (const weDate of weekendDates) {
      const roster = engine.getAssignmentsForDate(weDate);
      const containsICU = roster.some(r => r.shiftTypeName === 'ICU Specialist');
      expect(containsICU).toBe(true);
    }
  });
});
