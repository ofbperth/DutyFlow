import { describe, it, expect } from './test-framework.ts';
import {
  getAllowedTargetGroupIdsForHomeGroup,
  NON_UNIVERSAL_GROUPS,
  CROSS_GROUP_RULES,
  ShiftTemplate,
  DoctorGroup,
  User,
  GroupRotationAssignment,
  Shift
} from '../src/types.ts';
import * as fs from 'fs';
import * as path from 'path';

// Mock Data for Testing
const mockGroups: DoctorGroup[] = [
  { id: 'group-saraburi', name: 'สระบุรี', color: '#ec4899', isUniversal: false },
  { id: 'group-1650', name: 'เวร1650', color: '#a855f7', isUniversal: false },
  { id: 'group-icu8s', name: 'ICU8S', color: '#06b6d4' },
  { id: 'group-icu8n', name: 'ICU8N', color: '#0ea5e9' },
  { id: 'group-icu3', name: 'ICU3', color: '#3b82f6' },
  { id: 'group-ccu', name: 'CCU', color: '#6366f1' },
  { id: 'group-rcu', name: 'RCU', color: '#8b5cf6' },
  { id: 'group-nvm23-asd11', name: 'NVM23 ASD11', color: '#d946ef' },
  { id: 'group-nvmdown', name: 'NVMล่าง', color: '#f43f5e' },
  { id: 'group-84-72-9', name: '84 & 72/9', color: '#10b981' },
  { id: 'group-nvm22', name: 'NVM22', color: '#84cc16' },
  { id: 'group-nvm21', name: 'NVM21', color: '#eab308' },
  { id: 'group-nvm20', name: 'NVM20', color: '#f97316' },
  { id: 'group-nvm19', name: 'NVM19', color: '#ef4444' },
  { id: 'group-universal', name: 'Universal', color: '#d946ef', isUniversal: true }
];

const mockTemplates: ShiftTemplate[] = [
  { id: 't-weekday', name: 'เวรวันธรรมดา', startTime: '17:00', endTime: '07:00', color: '#3b82f6', groupId: 'group-universal' },
  { id: 't-holiday', name: 'เวรวันหยุด', startTime: '10:00', endTime: '07:00', color: '#eab308', groupId: 'group-universal' },
  { id: 't-saraburi-1', name: 'เวรบน', startTime: '16:30', endTime: '08:30', color: '#ec4899', groupId: 'group-saraburi' },
  { id: 't-1650-1', name: '1650 เช้า', startTime: '07:00', endTime: '18:00', color: '#f97316', groupId: 'group-1650' },
  { id: 't-icu8s-1', name: 'เวร ICU8S', startTime: '17:00', endTime: '07:00', color: '#06b6d4', groupId: 'group-icu8s' },
  { id: 't-icu8n-1', name: 'เวร ICU8N', startTime: '17:00', endTime: '07:00', color: '#0ea5e9', groupId: 'group-icu8n' },
  { id: 't-icu3-1', name: 'เวร ICU3', startTime: '17:00', endTime: '07:00', color: '#3b82f6', groupId: 'group-icu3' },
  { id: 't-pooled-1', name: 'เวรเจาะเลือด', startTime: '06:00', endTime: '08:00', color: '#f43f5e', groupId: 'group-pooled', isPooled: true }
];

function filterTemplatesForUserGroup(
  myGroupId: string,
  templates: ShiftTemplate[],
  groups: DoctorGroup[]
): ShiftTemplate[] {
  const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(myGroupId, groups);
  return templates.filter(t => !!t.isPooled || allowedGroupIds.includes(t.groupId));
}

function filterDoctorsForScheduleGroup(
  g: DoctorGroup,
  users: User[],
  rotationAssignments: GroupRotationAssignment[],
  shifts: Shift[],
  datesArray: string[],
  templates: ShiftTemplate[]
) {
  const homeUsers = users.filter(u => {
    const assignment = rotationAssignments.find(a => a.userId === u.id);
    return assignment && assignment.groupId === g.id;
  });

  const allowedHomeGroupsForTarget = CROSS_GROUP_RULES[g.id] || [];
  const outerUsers = users.filter(u => {
    const assignment = rotationAssignments.find(a => a.userId === u.id);
    const homeGroupId = assignment?.groupId;
    if (!homeGroupId || homeGroupId === g.id) return false;
    if (!allowedHomeGroupsForTarget.includes(homeGroupId)) return false;

    return shifts.some(s => {
      if (s.userId !== u.id || !datesArray.includes(s.date)) return false;
      const targetId = s.targetGroupId || templates.find(t => t.id === s.templateId)?.groupId;
      return targetId === g.id;
    });
  });

  return {
    homeUsers,
    outerUsers,
    allDisplayedUsers: [...homeUsers, ...outerUsers]
  };
}

describe('Milestone 5: Universal Group-Scoped Shift Template & Schedule Filtering', () => {

  // =========================================================================
  // Requirement 1 (R1): Universal & Group-Specific Shift Template Scoping
  // =========================================================================
  describe('Requirement 1 (R1): Universal & Group-Specific Shift Template Scoping', () => {
    it('R1-TPL-01: Home Group Template Isolation', () => {
      // Saraburi group user
      const saraburiTemps = filterTemplatesForUserGroup('group-saraburi', mockTemplates, mockGroups);
      const saraburiIds = saraburiTemps.map(t => t.id);
      expect(saraburiIds).toContain('t-saraburi-1');
      expect(saraburiIds).toContain('t-pooled-1');
      expect(saraburiIds.includes('t-weekday')).toBe(false);
      expect(saraburiIds.includes('t-holiday')).toBe(false);
      expect(saraburiIds.includes('t-1650-1')).toBe(false);
      expect(saraburiIds.includes('t-icu8s-1')).toBe(false);

      // 1650 group user
      const g1650Temps = filterTemplatesForUserGroup('group-1650', mockTemplates, mockGroups);
      const g1650Ids = g1650Temps.map(t => t.id);
      expect(g1650Ids).toContain('t-1650-1');
      expect(g1650Ids).toContain('t-pooled-1');
      expect(g1650Ids.includes('t-weekday')).toBe(false);
      expect(g1650Ids.includes('t-holiday')).toBe(false);
      expect(g1650Ids.includes('t-saraburi-1')).toBe(false);
      expect(g1650Ids.includes('t-icu8s-1')).toBe(false);
    });

    it('R1-TPL-02: Cross-Group Target Template Access', () => {
      // RCU doctor (can target ICU8S)
      const rcuTemps = filterTemplatesForUserGroup('group-rcu', mockTemplates, mockGroups);
      const rcuIds = rcuTemps.map(t => t.id);
      expect(rcuIds).toContain('t-icu8s-1');
      expect(rcuIds).toContain('t-weekday');
      expect(rcuIds).toContain('t-holiday');
      expect(rcuIds).toContain('t-pooled-1');
      expect(rcuIds.includes('t-saraburi-1')).toBe(false);
      expect(rcuIds.includes('t-1650-1')).toBe(false);

      // CCU doctor (can target ICU8N)
      const ccuTemps = filterTemplatesForUserGroup('group-ccu', mockTemplates, mockGroups);
      const ccuIds = ccuTemps.map(t => t.id);
      expect(ccuIds).toContain('t-icu8n-1');
      expect(ccuIds.includes('t-icu8s-1')).toBe(false);

      // NVM23 ASD11 doctor (can target 1650 and ICU3)
      const nvm23Temps = filterTemplatesForUserGroup('group-nvm23-asd11', mockTemplates, mockGroups);
      const nvm23Ids = nvm23Temps.map(t => t.id);
      expect(nvm23Ids).toContain('t-1650-1');
      expect(nvm23Ids).toContain('t-icu3-1');
    });

    it('R1-TPL-03: Universal & Pooled Shift Template Inclusion', () => {
      // Standard group NVM22 doctor
      const nvm22Temps = filterTemplatesForUserGroup('group-nvm22', mockTemplates, mockGroups);
      const nvm22Ids = nvm22Temps.map(t => t.id);
      expect(nvm22Ids).toContain('t-weekday');
      expect(nvm22Ids).toContain('t-holiday');
      expect(nvm22Ids).toContain('t-pooled-1');
      expect(nvm22Ids.includes('t-saraburi-1')).toBe(false);
      expect(nvm22Ids.includes('t-1650-1')).toBe(false);
    });

    it('R1-TPL-04: Universal Doctor Group Coverage', () => {
      const allGroupIds = mockGroups.map(g => g.id).filter(id => id !== 'group-universal');
      for (const groupId of allGroupIds) {
        const temps = filterTemplatesForUserGroup(groupId, mockTemplates, mockGroups);
        const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(groupId, mockGroups);
        
        // Every returned template's groupId must be allowed or pooled
        for (const t of temps) {
          const isAllowed = t.isPooled || allowedGroupIds.includes(t.groupId);
          expect(isAllowed).toBe(true);
        }
      }
    });
  });

  // =========================================================================
  // Requirement 2 (R2): Group-Scoped Schedule & Shift View
  // =========================================================================
  describe('Requirement 2 (R2): Group-Scoped Schedule & Shift View', () => {
    const testUsers: User[] = [
      { id: 'u-icu8s-1', name: 'Dr. ICU8S 1', email: '', role: 'user', isVirtual: false, createdAt: '' },
      { id: 'u-icu8s-2', name: 'Dr. ICU8S 2', email: '', role: 'user', isVirtual: false, createdAt: '' },
      { id: 'u-rcu-1', name: 'Dr. RCU 1', email: '', role: 'user', isVirtual: false, createdAt: '' },
      { id: 'u-saraburi-1', name: 'Dr. Saraburi 1', email: '', role: 'user', isVirtual: false, createdAt: '' }
    ];

    const testAssignments: GroupRotationAssignment[] = [
      { id: 'a1', periodId: 'p1', groupId: 'group-icu8s', userId: 'u-icu8s-1' },
      { id: 'a2', periodId: 'p1', groupId: 'group-icu8s', userId: 'u-icu8s-2' },
      { id: 'a3', periodId: 'p1', groupId: 'group-rcu', userId: 'u-rcu-1' },
      { id: 'a4', periodId: 'p1', groupId: 'group-saraburi', userId: 'u-saraburi-1' }
    ];

    const testShifts: Shift[] = [
      // RCU doctor covering ICU8S shift
      { id: 's1', userId: 'u-rcu-1', date: '2026-08-05', templateId: 't-icu8s-1', status: 'published', assignedBy: 'admin', targetGroupId: 'group-icu8s' },
      // Saraburi doctor with shift targeting ICU8S (not allowed in CROSS_GROUP_RULES)
      { id: 's2', userId: 'u-saraburi-1', date: '2026-08-05', templateId: 't-icu8s-1', status: 'published', assignedBy: 'admin', targetGroupId: 'group-icu8s' }
    ];

    const datesArray = ['2026-08-05'];
    const icu8sGroup = mockGroups.find(g => g.id === 'group-icu8s')!;

    it('R2-SCHED-01: Home Group Doctor Display', () => {
      const res = filterDoctorsForScheduleGroup(icu8sGroup, testUsers, testAssignments, testShifts, datesArray, mockTemplates);
      const homeUserIds = res.homeUsers.map(u => u.id);
      expect(homeUserIds).toContain('u-icu8s-1');
      expect(homeUserIds).toContain('u-icu8s-2');
      expect(homeUserIds.includes('u-rcu-1')).toBe(false);
    });

    it('R2-SCHED-02: Cross-Group Outer Doctor Display', () => {
      const res = filterDoctorsForScheduleGroup(icu8sGroup, testUsers, testAssignments, testShifts, datesArray, mockTemplates);
      const outerUserIds = res.outerUsers.map(u => u.id);
      expect(outerUserIds).toContain('u-rcu-1');
    });

    it('R2-SCHED-03: Non-Allowed Outer Doctor Exclusion', () => {
      const res = filterDoctorsForScheduleGroup(icu8sGroup, testUsers, testAssignments, testShifts, datesArray, mockTemplates);
      const outerUserIds = res.outerUsers.map(u => u.id);
      expect(outerUserIds.includes('u-saraburi-1')).toBe(false);
    });

    it('R2-SCHED-04: Dynamic Filtering Across All Groups', () => {
      for (const g of mockGroups) {
        const res = filterDoctorsForScheduleGroup(g, testUsers, testAssignments, testShifts, datesArray, mockTemplates);
        // Home users must only contain doctors assigned to group g
        for (const u of res.homeUsers) {
          const assign = testAssignments.find(a => a.userId === u.id);
          expect(assign?.groupId).toBe(g.id);
        }
        // Outer users must only contain doctors from home groups listed in CROSS_GROUP_RULES[g.id]
        const allowedHomeGroups = CROSS_GROUP_RULES[g.id] || [];
        for (const u of res.outerUsers) {
          const assign = testAssignments.find(a => a.userId === u.id);
          expect(allowedHomeGroups.includes(assign?.groupId || '')).toBe(true);
        }
      }
    });
  });

  // =========================================================================
  // Requirement 3 (R3): Hardcode Elimination & Dynamic Permission Helpers
  // =========================================================================
  describe('Requirement 3 (R3): Hardcode Elimination & Dynamic Permission Helpers', () => {
    it('R3-PERM-01: Central Helper Logic Verification', () => {
      // Verify NON_UNIVERSAL_GROUPS export
      expect(NON_UNIVERSAL_GROUPS.has('group-saraburi')).toBe(true);
      expect(NON_UNIVERSAL_GROUPS.has('group-1650')).toBe(true);
      expect(NON_UNIVERSAL_GROUPS.has('group-icu8s')).toBe(false);

      // Test helper output for Saraburi
      const saraburiAllowed = getAllowedTargetGroupIdsForHomeGroup('group-saraburi', mockGroups);
      expect(saraburiAllowed).toEqual(['group-saraburi', 'group-pooled']);

      // Test helper output for 1650
      const g1650Allowed = getAllowedTargetGroupIdsForHomeGroup('group-1650', mockGroups);
      expect(g1650Allowed).toEqual(['group-1650', 'group-pooled']);

      // Test helper output for RCU (cross group to ICU8S)
      const rcuAllowed = getAllowedTargetGroupIdsForHomeGroup('group-rcu', mockGroups);
      expect(rcuAllowed.sort()).toEqual(['group-rcu', 'group-pooled', 'group-universal', 'group-icu8s'].sort());

      // Test helper output for NVMล่าง (cross group to 1650)
      const nvmdownAllowed = getAllowedTargetGroupIdsForHomeGroup('group-nvmdown', mockGroups);
      expect(nvmdownAllowed.sort()).toEqual(['group-nvmdown', 'group-pooled', 'group-universal', 'group-1650'].sort());

      // Test helper output for NVM23 ASD11 (cross group to 1650 & ICU3)
      const nvm23Allowed = getAllowedTargetGroupIdsForHomeGroup('group-nvm23-asd11', mockGroups);
      expect(nvm23Allowed.sort()).toEqual(['group-nvm23-asd11', 'group-pooled', 'group-universal', 'group-1650', 'group-icu3'].sort());
    });

    it('R3-PERM-02: AST / Static Code Inspection Test for Hardcode Elimination', () => {
      const schedulerPath = path.join(process.cwd(), 'src', 'components', 'SchedulerDashboard.tsx');
      const typesPath = path.join(process.cwd(), 'src', 'types.ts');

      const schedulerContent = fs.readFileSync(schedulerPath, 'utf-8');
      const typesContent = fs.readFileSync(typesPath, 'utf-8');

      // Check SchedulerDashboard.tsx for hardcoded special-casing
      expect(schedulerContent.includes("myGroupId === 'group-saraburi'")).toBe(false);
      expect(schedulerContent.includes("userGroupId === 'group-saraburi'")).toBe(false);
      expect(schedulerContent.includes("['เวรวันธรรมดา', 'เวรวันหยุด']")).toBe(false);

      // Check types.ts for hardcoded group if branches in getAllowedTargetGroupIdsForHomeGroup
      expect(typesContent.includes("if (homeGroupId === 'group-saraburi')")).toBe(false);
      expect(typesContent.includes("if (homeGroupId === 'group-1650'")).toBe(false);

      // Check that NON_UNIVERSAL_GROUPS is exported in types.ts
      expect(typesContent.includes('export const NON_UNIVERSAL_GROUPS')).toBe(true);
    });

    it('R3-PERM-03: Parameterized Coverage Across All 15 Doctor Groups', () => {
      const expectedTargetGroups: Record<string, string[]> = {
        'group-saraburi': ['group-saraburi', 'group-pooled'],
        'group-1650': ['group-1650', 'group-pooled'],
        'group-icu8s': ['group-icu8s', 'group-pooled', 'group-universal'],
        'group-icu8n': ['group-icu8n', 'group-pooled', 'group-universal'],
        'group-icu3': ['group-icu3', 'group-pooled', 'group-universal'],
        'group-ccu': ['group-ccu', 'group-pooled', 'group-universal', 'group-icu8n'],
        'group-rcu': ['group-rcu', 'group-pooled', 'group-universal', 'group-icu8s'],
        'group-nvm23-asd11': ['group-nvm23-asd11', 'group-pooled', 'group-universal', 'group-1650', 'group-icu3'],
        'group-nvmdown': ['group-nvmdown', 'group-pooled', 'group-universal', 'group-1650'],
        'group-84-72-9': ['group-84-72-9', 'group-pooled', 'group-universal'],
        'group-nvm22': ['group-nvm22', 'group-pooled', 'group-universal'],
        'group-nvm21': ['group-nvm21', 'group-pooled', 'group-universal'],
        'group-nvm20': ['group-nvm20', 'group-pooled', 'group-universal'],
        'group-nvm19': ['group-nvm19', 'group-pooled', 'group-universal'],
        'group-universal': ['group-universal', 'group-pooled']
      };

      const groupIds = Object.keys(expectedTargetGroups);
      expect(groupIds.length).toBe(15);

      for (const [groupId, expectedAllowed] of Object.entries(expectedTargetGroups)) {
        const allowed = getAllowedTargetGroupIdsForHomeGroup(groupId, mockGroups);
        expect(allowed.sort()).toEqual([...expectedAllowed].sort());
      }
    });
  });
});
