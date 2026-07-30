import fs from 'fs';
import path from 'path';

interface RequirementResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string[];
}

const results: RequirementResult[] = [];

// R1: Test drag & drop shift template onto calendar cell and verify staff selection modal prompt triggers
function testR1(): RequirementResult {
  const details: string[] = [];
  const dashboardPath = path.resolve('src/components/SchedulerDashboard.tsx');
  const calendarPath = path.resolve('src/components/FourWeekCalendarView.tsx');

  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
  const calendarContent = fs.readFileSync(calendarPath, 'utf-8');

  // Check drop handler in calendar view
  const hasCalendarDrop = calendarContent.includes('onDropShift') && calendarContent.includes('handleDropOnCell');
  details.push(`FourWeekCalendarView handles cell drop via handleDropOnCell: ${hasCalendarDrop}`);

  // Check handleCalendarDropShift implementation
  const dropHandlerMatch = dashboardContent.includes('handleCalendarDropShift');
  details.push(`SchedulerDashboard contains handleCalendarDropShift: ${dropHandlerMatch}`);

  // Check if handleCalendarDropShift opens staff selection modal or directly assigns to currentUser
  const directAssignsUser = dashboardContent.includes('userId: currentUser.id') && dashboardContent.includes('saveShift(newShift)');
  const triggersStaffModal = dashboardContent.includes('setAssigningCell') && dashboardContent.includes('handleCalendarDropShift');

  details.push(`handleCalendarDropShift assigns shift directly to currentUser.id: ${directAssignsUser}`);
  details.push(`handleCalendarDropShift triggers staff selection modal (setAssigningCell): ${triggersStaffModal}`);

  const passed = hasCalendarDrop && triggersStaffModal;
  return {
    id: 'R1',
    name: 'Drag & Drop Shift Template onto Calendar Cell Staff Selection Prompt',
    status: passed ? 'PASS' : 'FAIL',
    details
  };
}

// R2: Test upper control panel "Batch Assign" button in SchedulerDashboard.tsx and verify BatchAssignModal opens
function testR2(): RequirementResult {
  const details: string[] = [];
  const dashboardPath = path.resolve('src/components/SchedulerDashboard.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

  // Find id="scheduler-controls" section
  const controlsMatch = dashboardContent.slice(
    dashboardContent.indexOf('id="scheduler-controls"'),
    dashboardContent.indexOf('id="scheduler-workspace"')
  );

  const batchBtnInControls = controlsMatch.includes('Batch Assign') || controlsMatch.includes('setShowBatchModal');
  details.push(`Upper control panel (id="scheduler-controls") contains "Batch Assign" button: ${batchBtnInControls}`);

  // Check floating bar batch assign button
  const floatingBarMatch = dashboardContent.includes('id="floating-batch-action-bar"');
  const batchBtnInFloating = floatingBarMatch && dashboardContent.includes('setShowBatchModal(true)');
  details.push(`Floating bottom bar (id="floating-batch-action-bar") contains "Batch Assign" button: ${batchBtnInFloating}`);

  const modalRendered = dashboardContent.includes('<BatchAssignModal') && dashboardContent.includes('isOpen={showBatchModal}');
  details.push(`BatchAssignModal rendered when showBatchModal is true: ${modalRendered}`);

  const passed = batchBtnInControls && modalRendered;
  return {
    id: 'R2',
    name: 'Upper Control Panel "Batch Assign" Button Opens BatchAssignModal',
    status: passed ? 'PASS' : 'FAIL',
    details
  };
}

// R3: Test relocation of "Manage Group" button to AdminDashboard.tsx and verify absence in SchedulerDashboard.tsx
function testR3(): RequirementResult {
  const details: string[] = [];
  const schedulerPath = path.resolve('src/components/SchedulerDashboard.tsx');
  const adminPath = path.resolve('src/components/AdminDashboard.tsx');

  const schedulerContent = fs.readFileSync(schedulerPath, 'utf-8');
  const adminContent = fs.readFileSync(adminPath, 'utf-8');

  const schedulerHasManageGroups = schedulerContent.includes('Manage Groups') || schedulerContent.includes('setShowGroupManager');
  details.push(`SchedulerDashboard contains "Manage Groups" button / GroupManagerModal state: ${schedulerHasManageGroups}`);

  const adminHasManageGroups = adminContent.includes('Manage Group') || adminContent.includes('GroupManagerModal');
  details.push(`AdminDashboard contains "Manage Groups" button / GroupManagerModal: ${adminHasManageGroups}`);

  const passed = !schedulerHasManageGroups && adminHasManageGroups;
  return {
    id: 'R3',
    name: 'Relocation of "Manage Group" Button to AdminDashboard.tsx',
    status: passed ? 'PASS' : 'FAIL',
    details
  };
}

// R4: Test modal container styling across all popups for fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm
function testR4(): RequirementResult {
  const details: string[] = [];
  const componentsDir = path.resolve('src/components');
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

  const modalFiles: { file: string; line: number; classes: string; hasBackdropBlur: boolean }[] = [];

  for (const file of files) {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      if (line.includes('fixed inset-0') && (line.includes('z-50') || line.includes('bg-'))) {
        const hasBackdropBlur = line.includes('backdrop-blur-sm');
        modalFiles.push({
          file,
          line: idx + 1,
          classes: line.trim(),
          hasBackdropBlur
        });
      }
    });
  }

  const totalModals = modalFiles.length;
  const compliantModals = modalFiles.filter(m => m.hasBackdropBlur).length;
  const nonCompliantModals = modalFiles.filter(m => !m.hasBackdropBlur);

  details.push(`Total modal containers identified across components: ${totalModals}`);
  details.push(`Modals with backdrop-blur-sm: ${compliantModals}`);
  details.push(`Modals missing backdrop-blur-sm: ${nonCompliantModals.length}`);

  nonCompliantModals.forEach(m => {
    details.push(`  - ${m.file}:${m.line} -> ${m.classes}`);
  });

  const passed = totalModals > 0 && compliantModals === totalModals;
  return {
    id: 'R4',
    name: 'Modal Container Backdrop Blur Styling Standard',
    status: passed ? 'PASS' : 'FAIL',
    details
  };
}

console.log('Running Empirical Verification Suite for Requirements R1 - R4...\n');

const r1 = testR1();
const r2 = testR2();
const r3 = testR3();
const r4 = testR4();

results.push(r1, r2, r3, r4);

results.forEach(r => {
  console.log(`[${r.status}] ${r.id}: ${r.name}`);
  r.details.forEach(d => console.log(`    ${d}`));
  console.log('');
});

const allPassed = results.every(r => r.status === 'PASS');
console.log(`VERDICT: ${allPassed ? 'PASS' : 'FAIL'}`);
