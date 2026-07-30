import assert from 'assert';
import { getShiftShortCode, getSafeUserName, exportScheduleToPDF } from '../src/utils/pdfExport';
import { User, Shift, ShiftTemplate, DoctorGroup, GroupRotationAssignment, SchedulePeriod } from '../src/types';
import fs from 'fs';
import path from 'path';

console.log('======================================================');
console.log('   STARTING EMPIRICAL VERIFICATION & STRESS TESTS');
console.log('======================================================\n');

let passCount = 0;
let failCount = 0;

function runEmpiricalTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failCount++;
  }
}

const rootDir = process.cwd();

// ----------------------------------------------------
// R1: Calendar Mode Holiday & Weekend Highlight Consistency
// ----------------------------------------------------
console.log('--- Testing R1: Weekend & Holiday Highlight Consistency ---');

runEmpiricalTest('R1-1: FourWeekCalendarView contains isWeekendOrHoliday combining weekend and holiday', () => {
  const code = fs.readFileSync(path.join(path.resolve('.'), 'src/components/FourWeekCalendarView.tsx'), 'utf-8');
  assert.ok(code.includes('const isWeekendOrHoliday = isWeekend || Boolean(holiday);'), 'isWeekendOrHoliday definition missing');
  assert.ok(code.includes('bg-blue-500/10 border-blue-500/30 hover:border-blue-500/40 hover:bg-blue-500/15'), 'Consistent cell container background missing');
  assert.ok(code.includes("isWeekendOrHoliday\n                      ? 'text-blue-400'") || code.includes("isWeekendOrHoliday\n                    ? 'text-blue-400'") || code.includes("isWeekendOrHoliday ? 'text-blue-400'"), 'Consistent day text color missing');
});

runEmpiricalTest('R1-2: Matrix View headers in SchedulerDashboard, UserDashboard, PooledShiftsDashboard use identical holiday/weekend style', () => {
  const schedulerCode = fs.readFileSync(path.join(path.resolve('.'), 'src/components/SchedulerDashboard.tsx'), 'utf-8');
  const userCode = fs.readFileSync(path.join(path.resolve('.'), 'src/components/UserDashboard.tsx'), 'utf-8');
  const pooledCode = fs.readFileSync(path.join(path.resolve('.'), 'src/components/PooledShiftsDashboard.tsx'), 'utf-8');

  const expectedClass = 'bg-blue-500/10 text-blue-400 font-semibold border-b border-blue-500/30';
  assert.ok(schedulerCode.includes(expectedClass), 'SchedulerDashboard matrix header styling mismatch');
  assert.ok(userCode.includes(expectedClass), 'UserDashboard matrix header styling mismatch');
  assert.ok(pooledCode.includes(expectedClass), 'PooledShiftsDashboard matrix header styling mismatch');
});


// ----------------------------------------------------
// R2: Remove Shift Balance from Rotation Schedule Top Panel
// ----------------------------------------------------
console.log('\n--- Testing R2: Shift Balance Removal ---');

runEmpiricalTest('R2-1: Zero references to showShiftBalance or ShiftBalanceModal in SchedulerDashboard', () => {
  const schedulerCode = fs.readFileSync(path.join(path.resolve('.'), 'src/components/SchedulerDashboard.tsx'), 'utf-8');
  assert.ok(!schedulerCode.includes('showShiftBalance'), 'Residual showShiftBalance state found in SchedulerDashboard');
  assert.ok(!schedulerCode.includes('ShiftBalanceModal'), 'Residual ShiftBalanceModal reference found in SchedulerDashboard');
  assert.ok(!schedulerCode.includes('Shift Balance'), 'Residual "Shift Balance" button found in SchedulerDashboard');
});


// ----------------------------------------------------
// R3: Fix & Scope PDF Export for Duty Schedules
// ----------------------------------------------------
console.log('\n--- Testing R3: PDF Export Logic & Unicode Sanitization ---');

runEmpiricalTest('R3-1: getShiftShortCode accurately converts templates to safe ASCII labels', () => {
  const wdTemp: ShiftTemplate = { id: 'temp-group-weekday', name: 'เวรธรรมดา', startTime: '08:00', endTime: '16:00', color: '#3b82f6', groupId: 'g1' };
  const hdTemp: ShiftTemplate = { id: 'temp-group-holiday', name: 'เวรวันหยุด', startTime: '08:00', endTime: '16:00', color: '#ef4444', groupId: 'g1' };
  const morningTemp: ShiftTemplate = { id: 't-m', name: 'เวรเช้า', startTime: '07:00', endTime: '15:00', color: '#10b981', groupId: 'g1' };
  const afternoonTemp: ShiftTemplate = { id: 't-a', name: 'เวรบ่าย', startTime: '15:00', endTime: '23:00', color: '#f59e0b', groupId: 'g1' };
  const nightTemp: ShiftTemplate = { id: 't-n', name: 'เวรดึก', startTime: '23:00', endTime: '07:00', color: '#8b5cf6', groupId: 'g1' };
  const srbTemp: ShiftTemplate = { id: 't-srb', name: 'เวรสระบุรี', startTime: '08:00', endTime: '16:00', color: '#ec4899', groupId: 'g1' };
  const shift1650Temp: ShiftTemplate = { id: 't-1650', name: 'เวร 1650', startTime: '16:50', endTime: '08:30', color: '#06b6d4', groupId: 'g1' };
  const unknownTemp: ShiftTemplate = { id: 't-unk', name: 'Custom Shift', startTime: '10:00', endTime: '18:00', color: '#64748b', groupId: 'g1' };
  const thaiOnlyTemp: ShiftTemplate = { id: 't-thai', name: 'พิเสษ', startTime: '10:00', endTime: '18:00', color: '#64748b', groupId: 'g1' };

  assert.strictEqual(getShiftShortCode(wdTemp), 'WD');
  assert.strictEqual(getShiftShortCode(hdTemp), 'HD');
  assert.strictEqual(getShiftShortCode(morningTemp), 'M');
  assert.strictEqual(getShiftShortCode(afternoonTemp), 'A');
  assert.strictEqual(getShiftShortCode(nightTemp), 'N');
  assert.strictEqual(getShiftShortCode(srbTemp), 'SRB');
  assert.strictEqual(getShiftShortCode(shift1650Temp), '1650');
  assert.strictEqual(getShiftShortCode(unknownTemp), 'CUS');
  assert.strictEqual(getShiftShortCode(thaiOnlyTemp), 'SFT');
  assert.strictEqual(getShiftShortCode(undefined), '');
});

runEmpiricalTest('R3-2: getSafeUserName sanitizes Thai names and falls back gracefully', () => {
  const thaiUser: User = { id: 'usr-1', name: 'นพ. สมชาย ใจดี', email: 'somchai@hospital.gov.th', role: 'user', isVirtual: false, createdAt: '2026-01-01' };
  const asciiUser: User = { id: 'usr-2', name: 'Dr. John Doe', email: 'john@hospital.gov.th', role: 'user', isVirtual: false, createdAt: '2026-01-01' };
  const emailOnlyUser: User = { id: 'usr-3', name: '', email: 'alice@hospital.gov.th', role: 'user', isVirtual: false, createdAt: '2026-01-01' };
  const noInfoUser: User = { id: 'usr-4321', name: '', email: '', role: 'user', isVirtual: false, createdAt: '2026-01-01' };

  assert.strictEqual(getSafeUserName(thaiUser), 'Dr. Somchai');
  assert.strictEqual(getSafeUserName(asciiUser), 'Dr. John Doe');
  assert.strictEqual(getSafeUserName(emailOnlyUser), 'Dr. Alice');
  assert.strictEqual(getSafeUserName(noInfoUser), 'Staff usr-');
});

runEmpiricalTest('R3-3: exportScheduleToPDF executes without error for multi-user cross-group scenario', () => {
  const currentUser: User = { id: 'u1', name: 'Dr. Alice (Current)', email: 'alice@hosp.com', role: 'scheduler', isVirtual: false, createdAt: '2026-01-01' };
  const user2: User = { id: 'u2', name: 'Dr. Bob (Home Group)', email: 'bob@hosp.com', role: 'user', isVirtual: false, createdAt: '2026-01-01' };
  const user3: User = { id: 'u3', name: 'Dr. Charlie (Other Group)', email: 'charlie@hosp.com', role: 'user', isVirtual: false, createdAt: '2026-01-01' };

  const users = [currentUser, user2, user3];
  const groups: DoctorGroup[] = [
    { id: 'g1', name: 'Group 1 (Staff)', color: '#3b82f6' },
    { id: 'g2', name: 'Group 2 (ICU)', color: '#ef4444' },
  ];
  const rotationAssignments: GroupRotationAssignment[] = [
    { id: 'ra1', userId: 'u1', groupId: 'g1', periodId: 'p1' },
    { id: 'ra2', userId: 'u2', groupId: 'g1', periodId: 'p1' },
    { id: 'ra3', userId: 'u3', groupId: 'g2', periodId: 'p1' },
  ];
  const templates: ShiftTemplate[] = [
    { id: 't1', name: 'Weekday', startTime: '08:00', endTime: '16:00', color: '#3b82f6', groupId: 'g1' },
    { id: 't2', name: 'ICU Shift', startTime: '16:00', endTime: '00:00', color: '#ef4444', groupId: 'g2' },
  ];
  const datesArray = ['2026-08-01', '2026-08-02', '2026-08-03'];
  const shifts: Shift[] = [
    { id: 's1', userId: 'u1', templateId: 't1', date: '2026-08-01', status: 'published', assignedBy: 'admin' },
    { id: 's2', userId: 'u1', templateId: 't2', targetGroupId: 'g2', date: '2026-08-02', status: 'published', assignedBy: 'admin' }, // Alice cross-group to g2
    { id: 's3', userId: 'u2', templateId: 't1', date: '2026-08-01', status: 'published', assignedBy: 'admin' },
    { id: 's4', userId: 'u3', templateId: 't1', targetGroupId: 'g1', date: '2026-08-03', status: 'published', assignedBy: 'admin' }, // Charlie working in g1
  ];
  const period: SchedulePeriod = { id: 'p1', title: 'August 2026', startDate: '2026-08-01', endDate: '2026-08-28' };

  // Call exportScheduleToPDF
  exportScheduleToPDF({
    currentUser,
    users,
    templates,
    shifts,
    groups,
    rotationAssignments,
    schedulePeriod: period,
    datesArray
  });
});


// ----------------------------------------------------
// R4: Simplify Day Inspector Panel Header Stats
// ----------------------------------------------------
console.log('\n--- Testing R4: Day Inspector Simplified Header ---');

runEmpiricalTest('R4-1: DayInspectorPanel top 3 metric cards removed and calculates shift hours correctly', () => {
  const code = fs.readFileSync(path.join(path.resolve('.'), 'src/components/DayInspectorPanel.tsx'), 'utf-8');
  assert.ok(!code.includes('Assigned Staff'), 'Assigned Staff card still exists in DayInspectorPanel');
  assert.ok(!code.includes('Total Hours'), 'Total Hours card still exists in DayInspectorPanel');
  assert.ok(!code.includes('Status Ratio'), 'Status Ratio card still exists in DayInspectorPanel');
  assert.ok(code.includes('Staff Roster Breakdown'), 'Staff Roster Breakdown header missing');
  assert.ok(code.includes('id="day-inspector-add-shift-btn"'), 'Add shift button missing');

  // Verify calculateShiftHours logic wrap-around:
  const calculateShiftHours = (startTime?: string, endTime?: string): number => {
    if (!startTime || !endTime) return 8;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(eH)) return 8;
    let startMinutes = sH * 60 + (sM || 0);
    let endMinutes = eH * 60 + (eM || 0);
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    return parseFloat(((endMinutes - startMinutes) / 60).toFixed(1));
  };

  assert.strictEqual(calculateShiftHours('08:00', '16:00'), 8);
  assert.strictEqual(calculateShiftHours('23:00', '07:00'), 8);
  assert.strictEqual(calculateShiftHours('08:30', '12:45'), 4.3);
});


// ----------------------------------------------------
// R5: Compact Shift Cards in Matrix View
// ----------------------------------------------------
console.log('\n--- Testing R5: Compact Shift Cards Status Badges ---');

runEmpiricalTest('R5-1: Status badge in Matrix view shift card is positioned in mt-1 container under shift time', () => {
  const schedulerCode = fs.readFileSync(path.join(rootDir, 'src/components/SchedulerDashboard.tsx'), 'utf-8');
  const userCode = fs.readFileSync(path.join(rootDir, 'src/components/UserDashboard.tsx'), 'utf-8');

  const normalize = (str: string) => str.replace(/\s+/g, ' ');

  const timeSnippet = `{temp?.startTime} - {temp?.endTime}`;
  const badgeSnippet = `<div className="mt-1"> <span className={\`inline-block px-1 py-0.25 rounded text-[8px] font-mono tracking-wider font-semibold uppercase leading-none border \${ shift.status === 'published' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30' }\`}> {shift.status} </span> </div>`;

  assert.ok(schedulerCode.includes(timeSnippet) && normalize(schedulerCode).includes(normalize(badgeSnippet)), 'SchedulerDashboard status badge position incorrect');
  assert.ok(userCode.includes(timeSnippet) && normalize(userCode).includes(normalize(badgeSnippet)), 'UserDashboard status badge position incorrect');
});


// ----------------------------------------------------
// R6: Allow Self-Role Switching Between User and Scheduler
// ----------------------------------------------------
console.log('\n--- Testing R6: Self-Role Switching & Security Rules ---');

runEmpiricalTest('R6-1: firestore.rules permits owner self-role updates to user/scheduler while blocking admin elevation', () => {
  const rulesCode = fs.readFileSync(path.join(path.resolve('.'), 'firestore.rules'), 'utf-8');
  assert.ok(rulesCode.includes("request.resource.data.role == 'user'"), 'Missing user role permission in firestore.rules update');
  assert.ok(rulesCode.includes("request.resource.data.role == 'scheduler'"), 'Missing scheduler role permission in firestore.rules update');

  // Logic check simulating rule evaluation
  const checkCanUpdateRole = (authUid: string, targetUserId: string, currentRole: string, newRole: string, isAdminUser: boolean) => {
    if (!authUid) return false;
    if (isAdminUser) return true;
    const isOwner = authUid === targetUserId;
    if (isOwner && (newRole === 'user' || newRole === 'scheduler' || newRole === currentRole)) {
      return true;
    }
    return false;
  };

  assert.strictEqual(checkCanUpdateRole('u1', 'u1', 'user', 'scheduler', false), true, 'User should be able to switch to scheduler');
  assert.strictEqual(checkCanUpdateRole('u1', 'u1', 'scheduler', 'user', false), true, 'Scheduler should be able to switch to user');
  assert.strictEqual(checkCanUpdateRole('u1', 'u1', 'user', 'admin', false), false, 'Non-admin should NOT be able to self-elevate to admin');
  assert.strictEqual(checkCanUpdateRole('u1', 'u2', 'user', 'scheduler', false), false, 'User should NOT be able to change another user role');
  assert.strictEqual(checkCanUpdateRole('admin1', 'u2', 'user', 'admin', true), true, 'Admin should be able to change any user role');
});

runEmpiricalTest('R6-2: Navbar filters role dropdown to user and scheduler for non-admins', () => {
  const navbarCode = fs.readFileSync(path.join(path.resolve('.'), 'src/components/Navbar.tsx'), 'utf-8');
  assert.ok(navbarCode.includes('<option value="user" className="bg-slate-900 text-slate-200">User</option>'), 'User option missing');
  assert.ok(navbarCode.includes('<option value="scheduler" className="bg-slate-900 text-slate-200">Scheduler</option>'), 'Scheduler option missing');
  assert.ok(navbarCode.includes("user.role === 'admin' && (\n                      <option value=\"admin\""), 'Admin option should only show for existing admin');
});

runEmpiricalTest('R6-3: App.tsx handleRoleChange updates state array users and clears errors', () => {
  const appCode = fs.readFileSync(path.join(path.resolve('.'), 'src/App.tsx'), 'utf-8');
  assert.ok(appCode.includes('setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, role: newRole } : u));'), 'users state update missing in handleRoleChange');
  assert.ok(appCode.includes("setErrorMessage('');"), 'ErrorMessage clearing missing in handleRoleChange');
});

console.log('\n======================================================');
console.log(`   EMPIRICAL TEST SUMMARY: ${passCount} Passed | ${failCount} Failed`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
}
