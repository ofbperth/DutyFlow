import { runner, describe, it, expect } from './test-framework.ts';
import { getShiftShortCode, getSafeUserName, isShiftInExportScope } from '../src/utils/pdfExport.ts';
import { Shift, ShiftTemplate, User } from '../src/types.ts';
import fs from 'fs';
import path from 'path';

describe('Milestone 7: UI/UX Refactoring & Enhancements Unit Tests', () => {

  it('M7-PDF-01: getShiftShortCode returns expected ASCII codes for standard shift templates', () => {
    const weekdayTemp: ShiftTemplate = { id: 'temp-group-weekday', name: 'เวรวันธรรมดา', startTime: '08:00', endTime: '16:00', color: '#3b82f6', groupId: 'group-icu' };
    const holidayTemp: ShiftTemplate = { id: 'temp-group-holiday', name: 'เวรวันหยุด', startTime: '08:00', endTime: '16:00', color: '#ef4444', groupId: 'group-icu' };
    const morningTemp: ShiftTemplate = { id: 'temp-morning', name: 'เช้า', startTime: '08:00', endTime: '16:00', color: '#10b981', groupId: 'group-icu' };
    const afternoonTemp: ShiftTemplate = { id: 'temp-afternoon', name: 'บ่าย', startTime: '16:00', endTime: '24:00', color: '#f59e0b', groupId: 'group-icu' };
    const nightTemp: ShiftTemplate = { id: 'temp-night', name: 'ดึก', startTime: '00:00', endTime: '08:00', color: '#6366f1', groupId: 'group-icu' };

    expect(getShiftShortCode(weekdayTemp)).toBe('WD');
    expect(getShiftShortCode(holidayTemp)).toBe('HD');
    expect(getShiftShortCode(morningTemp)).toBe('M');
    expect(getShiftShortCode(afternoonTemp)).toBe('A');
    expect(getShiftShortCode(nightTemp)).toBe('N');
  });

  it('M7-PDF-02: getSafeUserName sanitizes Thai names to safe ASCII handle or fallback', () => {
    const thaiUser: User = { id: 'u123', name: 'นพ. สมชาย ใจดี', email: 'somchai@hospital.com', role: 'user', isVirtual: false, createdAt: '2026-01-01' };
    const asciiUser: User = { id: 'u456', name: 'Dr. John Smith', email: 'john@hospital.com', role: 'user', isVirtual: false, createdAt: '2026-01-01' };

    expect(getSafeUserName(thaiUser)).toBe('Dr. Somchai');
    expect(getSafeUserName(asciiUser)).toBe('Dr. John Smith');
  });

  it('M7-PDF-03: getShiftShortCode returns fallback for unknown templates without crashing', () => {
    expect(getShiftShortCode(undefined)).toBe('');
    const customTemp: ShiftTemplate = { id: 'temp-custom', name: 'CUSTOM_SHIFT', startTime: '08:00', endTime: '12:00', color: '#888888', groupId: 'group-icu' };
    expect(getShiftShortCode(customTemp)).toBe('CUS');
  });

  it('M7-PDF-04: an explicit cross-group target is not included through its home-group template', () => {
    const template: ShiftTemplate = { id: 't-home', name: 'Home shift', startTime: '08:00', endTime: '16:00', color: '#888888', groupId: 'group-home' };
    const crossGroupShift: Shift = { id: 's-cross', userId: 'other-user', templateId: template.id, targetGroupId: 'group-other', date: '2026-08-01', status: 'published', assignedBy: 'admin' };

    expect(isShiftInExportScope(crossGroupShift, template, 'current-user', 'group-home')).toBe(false);
  });

  it('M7-RULES-01: self-promoted schedulers are limited to own-group shifts', () => {
    const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

    expect(rules.includes("affectedKeys().hasOnly(['role'])")).toBe(true);
    expect(rules.includes('allow create, update: if isAdmin() || isOwnGroupShift(request.resource.data);')).toBe(true);
    expect(rules.includes('allow delete: if isAdmin() || isOwnGroupShift(resource.data);')).toBe(true);
    expect(rules.includes('match /shiftTemplates/{templateId=**} {\n      allow read: if true;\n      allow write: if isAdmin();')).toBe(true);
    expect(rules.includes('match /config/{configId=**} {\n      allow read: if isAuthenticated();\n      allow write: if isAdmin();')).toBe(true);
    expect(rules.includes('match /doctorGroups/{groupId=**} {\n      allow read: if true;\n      allow write: if isAdmin();')).toBe(true);
  });

});
