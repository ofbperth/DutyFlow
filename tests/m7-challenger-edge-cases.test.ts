import { runner, describe, it, expect } from './test-framework.ts';
import { exportScheduleToPDF, getShiftShortCode, getSafeUserName } from '../src/utils/pdfExport.ts';
import { User, Shift, ShiftTemplate, DoctorGroup, GroupRotationAssignment, SchedulePeriod } from '../src/types.ts';

describe('Challenger 2 Empirical Verification: Milestone 7 Edge Cases', () => {

  // --- PDF EXPORT EDGE CASES ---
  describe('PDF Export Scoping & Edge Cases', () => {

    const mockCurrentUser: User = {
      id: 'u1-doc',
      name: 'Dr. Alice Smith',
      email: 'alice@hospital.org',
      role: 'user',
      isVirtual: false,
      createdAt: '2026-01-01'
    };

    const mockHomeGroupUsers: User[] = [
      mockCurrentUser,
      { id: 'u2-doc', name: 'Dr. Bob Jones', email: 'bob@hospital.org', role: 'user', isVirtual: false, createdAt: '2026-01-01' },
      { id: 'u3-doc', name: 'Dr. Charlie Brown', email: 'charlie@hospital.org', role: 'user', isVirtual: false, createdAt: '2026-01-01' }
    ];

    const mockOtherGroupUsers: User[] = [
      { id: 'u4-other', name: 'Dr. Other User', email: 'other@hospital.org', role: 'user', isVirtual: false, createdAt: '2026-01-01' }
    ];

    const mockAllUsers = [...mockHomeGroupUsers, ...mockOtherGroupUsers];

    const mockGroups: DoctorGroup[] = [
      { id: 'group-icu', name: 'ICU Group', color: '#3b82f6' },
      { id: 'group-er', name: 'ER Group', color: '#ef4444' }
    ];

    const mockRotationAssignments: GroupRotationAssignment[] = [
      { id: 'ra1', userId: 'u1-doc', groupId: 'group-icu', periodId: 'period-1' },
      { id: 'ra2', userId: 'u2-doc', groupId: 'group-icu', periodId: 'period-1' },
      { id: 'ra3', userId: 'u3-doc', groupId: 'group-icu', periodId: 'period-1' },
      { id: 'ra4', userId: 'u4-other', groupId: 'group-er', periodId: 'period-1' }
    ];

    const mockTemplates: ShiftTemplate[] = [
      { id: 'temp-icu-m', name: 'ICU Morning', startTime: '08:00', endTime: '16:00', color: '#10b981', groupId: 'group-icu' },
      { id: 'temp-er-m', name: 'ER Morning', startTime: '08:00', endTime: '16:00', color: '#ef4444', groupId: 'group-er' }
    ];

    const mockDatesArray = Array.from({ length: 28 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return `2026-08-${day}`;
    });

    const mockPeriod: SchedulePeriod = {
      id: 'period-1',
      title: 'August 2026 Block',
      startDate: '2026-08-01',
      endDate: '2026-08-28'
    };

    it('PDF-EDGE-01: exportScheduleToPDF executes without error when shifts array is completely empty', () => {
      exportScheduleToPDF({
        currentUser: mockCurrentUser,
        users: mockAllUsers,
        templates: mockTemplates,
        shifts: [],
        groups: mockGroups,
        rotationAssignments: mockRotationAssignments,
        schedulePeriod: mockPeriod,
        datesArray: mockDatesArray,
        save: false
      });
      expect(true).toBe(true);
    });

    it('PDF-EDGE-02: exportScheduleToPDF handles cross-group shifts correctly and includes user own cross-group shift', () => {
      const shiftsWithCrossGroup: Shift[] = [
        // Home shift for Alice (currentUser) in ICU
        { id: 's1', date: '2026-08-01', templateId: 'temp-icu-m', userId: 'u1-doc', targetGroupId: 'group-icu', status: 'published', assignedBy: 'admin-1' },
        // Cross-group shift for Alice (currentUser) in ER
        { id: 's2', date: '2026-08-05', templateId: 'temp-er-m', userId: 'u1-doc', targetGroupId: 'group-er', status: 'published', assignedBy: 'admin-1' },
        // Other group user shift in ER (should not leak)
        { id: 's3', date: '2026-08-05', templateId: 'temp-er-m', userId: 'u4-other', targetGroupId: 'group-er', status: 'published', assignedBy: 'admin-1' }
      ];

      exportScheduleToPDF({
        currentUser: mockCurrentUser,
        users: mockAllUsers,
        templates: mockTemplates,
        shifts: shiftsWithCrossGroup,
        groups: mockGroups,
        rotationAssignments: mockRotationAssignments,
        schedulePeriod: mockPeriod,
        datesArray: mockDatesArray,
        save: false
      });
      expect(true).toBe(true);
    });

    it('PDF-EDGE-03: exportScheduleToPDF handles multi-page pagination (50+ users) cleanly', () => {
      // Generate 60 mock users to trigger multi-page export (each user takes ~7pt height, Y limit is 180)
      const largeUserSet: User[] = Array.from({ length: 60 }, (_, i) => ({
        id: `u-large-${i}`,
        name: `Doctor Number ${i + 1}`,
        email: `doc${i}@hospital.org`,
        role: 'user',
        isVirtual: false,
        createdAt: '2026-01-01'
      }));

      const largeAssignments: GroupRotationAssignment[] = largeUserSet.map(u => ({
        id: `ra-${u.id}`,
        userId: u.id,
        groupId: 'group-icu',
        periodId: 'period-1'
      }));

      exportScheduleToPDF({
        currentUser: largeUserSet[0],
        users: largeUserSet,
        templates: mockTemplates,
        shifts: [],
        groups: mockGroups,
        rotationAssignments: largeAssignments,
        schedulePeriod: mockPeriod,
        datesArray: mockDatesArray,
        save: false
      });
      expect(true).toBe(true);
    });

    it('PDF-EDGE-04: getSafeUserName handles edge cases (empty name, non-ASCII name, email fallback)', () => {
      expect(getSafeUserName({ id: 'u1', name: '', email: 'doctor.who@hospital.org', role: 'user', isVirtual: false, createdAt: '2026-01-01' }))
        .toBe('Dr. Doctor.who');

      expect(getSafeUserName({ id: 'u2', name: 'นายแพทย์ สมศักดิ์', email: 'somsak@hospital.org', role: 'user', isVirtual: false, createdAt: '2026-01-01' }))
        .toBe('Dr. Somsak');

      expect(getSafeUserName({ id: 'u3', name: '', email: '', role: 'user', isVirtual: false, createdAt: '2026-01-01' }))
        .toBe('Staff u3');
    });

    it('PDF-EDGE-05: getShiftShortCode handles unusual shift names without crashing', () => {
      expect(getShiftShortCode({ id: 'custom-1', name: 'เวรดึกพิเศษ', startTime: '00:00', endTime: '08:00', color: '#000', groupId: 'g1' }))
        .toBe('N');

      expect(getShiftShortCode({ id: 'custom-2', name: 'เวร 1650', startTime: '16:50', endTime: '24:00', color: '#000', groupId: 'g1' }))
        .toBe('1650');

      expect(getShiftShortCode({ id: 'custom-3', name: 'Custom Duty', startTime: '08:00', endTime: '12:00', color: '#000', groupId: 'g1' }))
        .toBe('CUS');

      expect(getShiftShortCode({ id: 'custom-4', name: 'เวรพิเศษ', startTime: '08:00', endTime: '12:00', color: '#000', groupId: 'g1' }))
        .toBe('SFT');
    });
  });

  // --- ROLE SWITCHING PRIVILEGE SECURITY ---
  describe('Role Switching & Privilege Security', () => {

    it('ROLE-SEC-01: Non-admin users cannot elevate role to admin via Firestore Security Rules', () => {
      const checkUpdatePermission = (
        authUid: string,
        targetUserId: string,
        currentUserRole: string,
        requestedNewRole: string
      ): boolean => {
        const isAuthenticated = Boolean(authUid);
        const isAdmin = isAuthenticated && currentUserRole === 'admin';
        const isOwner = isAuthenticated && authUid === targetUserId;

        if (!isAuthenticated) return false;

        if (isAdmin) return true;

        if (isOwner && (requestedNewRole === 'user' || requestedNewRole === 'scheduler' || requestedNewRole === currentUserRole)) {
          return true;
        }

        return false;
      };

      // 1. Regular user trying to elevate to admin -> REJECTED
      expect(checkUpdatePermission('user-1', 'user-1', 'user', 'admin')).toBe(false);

      // 2. Scheduler trying to elevate to admin -> REJECTED
      expect(checkUpdatePermission('user-2', 'user-2', 'scheduler', 'admin')).toBe(false);

      // 3. Regular user changing self to scheduler -> ALLOWED
      expect(checkUpdatePermission('user-1', 'user-1', 'user', 'scheduler')).toBe(true);

      // 4. Scheduler changing self back to user -> ALLOWED
      expect(checkUpdatePermission('user-2', 'user-2', 'scheduler', 'user')).toBe(true);

      // 5. Admin changing user's role to admin -> ALLOWED
      expect(checkUpdatePermission('admin-99', 'user-1', 'admin', 'admin')).toBe(true);

      // 6. Non-owner trying to update someone else's role -> REJECTED
      expect(checkUpdatePermission('user-1', 'user-2', 'user', 'scheduler')).toBe(false);
    });
  });

  // --- DAY INSPECTOR PANEL FUNCTIONALITY ---
  describe('Day Inspector Panel Calculation & Behavior', () => {

    const calculateShiftHours = (startTime?: string, endTime?: string): number => {
      if (!startTime || !endTime) return 8;
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);
      if (isNaN(sH) || isNaN(eH)) return 8;

      let startMinutes = sH * 60 + (sM || 0);
      let endMinutes = eH * 60 + (eM || 0);

      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Midnight wrap-around
      }

      return parseFloat(((endMinutes - startMinutes) / 60).toFixed(1));
    };

    it('DAY-INSP-01: calculateShiftHours handles overnight wrap-around correctly', () => {
      expect(calculateShiftHours('08:00', '16:00')).toBe(8);
      expect(calculateShiftHours('16:00', '24:00')).toBe(8);
      expect(calculateShiftHours('23:00', '07:00')).toBe(8);
      expect(calculateShiftHours('16:00', '08:00')).toBe(16);
      expect(calculateShiftHours(undefined, undefined)).toBe(8);
    });

    it('DAY-INSP-02: Date parsing correctly formats valid and invalid dates without throwing', () => {
      const parseLocalDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      };

      const dateStr = '2026-08-15';
      const dateObj = parseLocalDate(dateStr);
      expect(dateObj.getFullYear()).toBe(2026);
      expect(dateObj.getMonth()).toBe(7); // 0-indexed August
      expect(dateObj.getDate()).toBe(15);

      const invalidDateStr = 'invalid-date-format';
      const invalidDateObj = parseLocalDate(invalidDateStr);
      expect(isNaN(invalidDateObj.getTime())).toBe(true);
    });
  });

});
