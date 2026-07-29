import { CalendarStateEngine } from './calendar-model.ts';
import { expect } from './test-framework.ts';

console.log('======================================================');
console.log('       DUTYFLOW ADVERSARIAL STRESS HARNESS            ');
console.log('======================================================\n');

let totalStressTests = 0;
let passedStressTests = 0;
let failedStressTests = 0;

function runStress(name: string, fn: () => void) {
  totalStressTests++;
  try {
    fn();
    passedStressTests++;
    console.log(`  ✓ STRESS: ${name}`);
  } catch (err: any) {
    failedStressTests++;
    console.log(`  ✗ STRESS: ${name}`);
    console.log(`    Error: ${err.message || err}`);
  }
}

// 1. Invalid Dates & Formats
runStress('Throws error on invalid startDate string', () => {
  const engine = new CalendarStateEngine({ startDate: 'not-a-date' });
  expect(() => engine.get28Days()).toThrow('Invalid startDate format');
});

runStress('Handles leap year leap day (Feb 29, 2028)', () => {
  const engine = new CalendarStateEngine({ startDate: '2028-02-15' });
  const days = engine.get28Days();
  expect(days).toContain('2028-02-29');
  expect(days).toContain('2028-03-01');
  expect(days.length).toBe(28);
});

runStress('Throws error when dropping shift with whitespace or empty shiftTypeId', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  const targetDate = engine.get28Days()[0];
  expect(() => engine.dropShift('', targetDate)).toThrow('Invalid shiftTypeId');
  expect(() => engine.dropShift('   ', targetDate)).toThrow('Invalid shiftTypeId');
});

runStress('Throws error when dropping shift to out of bounds date', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  expect(() => engine.dropShift('shift-1', '2099-01-01')).toThrow('out of bounds');
});

runStress('Throws error when invalid ViewMode is set', () => {
  const engine = new CalendarStateEngine();
  expect(() => engine.setViewMode('gantt' as any)).toThrow('Invalid ViewMode');
});

// 2. Empty Rosters & Mass Volume Stress
runStress('Handles 0 assignments across all days cleanly', () => {
  const engine = new CalendarStateEngine({ assignments: [] });
  const cells = engine.buildGridCells();
  expect(cells.length).toBe(28);
  expect(cells.every(c => c.assignments.length === 0)).toBe(true);
});

runStress('Mass scale: 10,000 assignments per date cell performance', () => {
  const dates = new CalendarStateEngine({ startDate: '2026-08-03' }).get28Days();
  const massAssignments = [];
  for (let i = 0; i < 10000; i++) {
    massAssignments.push({
      id: `m-${i}`,
      userId: `u-${i % 50}`,
      userName: `User ${i % 50}`,
      date: dates[0],
      shiftTypeId: 'day',
      shiftTypeName: 'Day Shift',
      color: 'blue'
    });
  }
  const start = Date.now();
  const engine = new CalendarStateEngine({ assignments: massAssignments });
  const day0Shifts = engine.getAssignmentsForDate(dates[0]);
  const duration = Date.now() - start;
  expect(day0Shifts.length).toBe(10000);
  expect(duration).toBeLessThan(100); // must execute under 100ms
});

runStress('ID Uniqueness test under rapid drag & drop (1,000 drops)', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  const targetDate = engine.get28Days()[0];
  const ids = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const created = engine.dropShift('shift-type-1', targetDate);
    if (ids.has(created.id)) {
      throw new Error(`Duplicate assignment ID detected: ${created.id}`);
    }
    ids.add(created.id);
  }
  expect(ids.size).toBe(1000);
});

// 3. Rapid View Toggles & Concurrency State
runStress('Rapid view mode toggle (10,000 iterations)', () => {
  const engine = new CalendarStateEngine();
  const start = Date.now();
  for (let i = 0; i < 10000; i++) {
    engine.setViewMode(i % 2 === 0 ? 'matrix' : 'calendar');
  }
  const duration = Date.now() - start;
  expect(engine.viewMode).toBe('calendar');
  expect(duration).toBeLessThan(100);
});

// 4. Multi-Select Range Inversion & Boundary Selection
runStress('Inverted date range select (endDate < startDate)', () => {
  const engine = new CalendarStateEngine();
  const days = engine.get28Days();
  // Select day 10 down to day 3
  engine.selectDateRange(days[10], days[3]);
  expect(engine.selectedDates.size).toBe(8); // days 3,4,5,6,7,8,9,10
  expect(engine.selectedDates.has(days[3])).toBe(true);
  expect(engine.selectedDates.has(days[10])).toBe(true);
});

runStress('Throws error when selectDateRange has non-existent dates', () => {
  const engine = new CalendarStateEngine();
  const days = engine.get28Days();
  expect(() => engine.selectDateRange('1999-01-01', days[5])).toThrow('Invalid range selection');
});

// 5. Copy & Paste Day Roster Immutability & Permission Edge Cases
runStress('Copied roster buffer immutability under source date mutation', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  const days = engine.get28Days();
  const source = days[0];
  const target = days[1];
  
  engine.dropShift('shift-1', source, 'Morning Shift');
  engine.copyDayRoster(source);
  
  // Mutate source assignments after copy
  engine.assignments[0].shiftTypeName = 'MUTATED SHIFT';
  
  // Paste onto target
  const pasted = engine.pasteDayRoster(target);
  expect(pasted[0].shiftTypeName).toBe('Morning Shift');
});

runStress('Throws error on self-paste (targetDate === copiedRosterDate)', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  const day = engine.get28Days()[0];
  engine.dropShift('shift-1', day);
  engine.copyDayRoster(day);
  expect(() => engine.pasteDayRoster(day)).toThrow('Cannot paste day roster onto the same source date');
});

runStress('Throws error on paste when non-scheduler permission', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  const days = engine.get28Days();
  engine.dropShift('shift-1', days[0]);
  engine.copyDayRoster(days[0]);
  engine.isScheduler = false; // flip permission
  expect(() => engine.pasteDayRoster(days[1])).toThrow('Permission denied');
});

// 6. User Highlight Normalization & Special Characters
runStress('User highlight handles mixed case & surrounding whitespace in user ID', () => {
  const engine = new CalendarStateEngine({ currentUserId: '  UsEr-99  ' });
  const assignment = {
    id: 'a1',
    userId: 'user-99',
    userName: 'John Doe',
    date: '2026-08-03',
    shiftTypeId: 'day',
    shiftTypeName: 'Day',
    color: 'blue'
  };
  expect(engine.isCurrentUserAssignment(assignment)).toBe(true);
});

runStress('User highlight handles special characters in user ID', () => {
  const specialId = 'user#123@domain.com<script>';
  const engine = new CalendarStateEngine({ currentUserId: specialId });
  const assignment = {
    id: 'a2',
    userId: specialId,
    userName: 'Jane',
    date: '2026-08-03',
    shiftTypeId: 'night',
    shiftTypeName: 'Night',
    color: 'red'
  };
  expect(engine.isCurrentUserAssignment(assignment)).toBe(true);
});

// 7. Day Inspector Actions & XSS Prevention
runStress('Editing assignment throws error for non-existent assignmentId', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  expect(() => engine.editAssignment('non-existent-id', { shiftTypeName: 'New' })).toThrow('not found');
});

runStress('Removing assignment throws error for non-existent assignmentId', () => {
  const engine = new CalendarStateEngine({ isScheduler: true });
  expect(() => engine.removeAssignment('ghost-id')).toThrow('not found');
});

console.log('\n======================================================');
console.log(`STRESS RESULTS: Total: ${totalStressTests} | Passed: ${passedStressTests} | Failed: ${failedStressTests}`);
console.log('======================================================\n');

if (failedStressTests > 0) {
  process.exit(1);
}
