import jsPDF from 'jspdf';
import { User, Shift, ShiftTemplate, SchedulePeriod, DoctorGroup, GroupRotationAssignment, CROSS_GROUP_RULES } from '../types';

export interface ExportPDFParams {
  currentUser: User;
  users: User[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  groups: DoctorGroup[];
  rotationAssignments: GroupRotationAssignment[];
  schedulePeriod: SchedulePeriod | null;
  datesArray: string[];
  exportGroupId?: string;
  save?: boolean;
}

/**
 * Maps shift template to a safe ASCII short code for jsPDF rendering.
 */
export const getShiftShortCode = (template?: ShiftTemplate): string => {
  if (!template) return '';
  const id = template.id || '';
  const name = template.name || '';

  if (id === 'temp-group-weekday' || name.includes('ธรรมดา') || name.toLowerCase().includes('weekday')) {
    return 'WD';
  }
  if (id === 'temp-group-holiday' || name.includes('หยุด') || name.toLowerCase().includes('holiday')) {
    return 'HD';
  }
  if (name.includes('เช้า') || name.toLowerCase().includes('morning')) return 'M';
  if (name.includes('บ่าย') || name.toLowerCase().includes('afternoon')) return 'A';
  if (name.includes('ดึก') || name.toLowerCase().includes('night')) return 'N';
  if (name.includes('1650')) return '1650';
  if (name.includes('สระบุรี')) return 'SRB';

  const asciiName = name.replace(/[^\x00-\x7F]/g, '').trim();
  if (asciiName.length > 0) {
    return asciiName.substring(0, 3).toUpperCase();
  }
  return 'SFT';
};

/**
 * Formats user name safely for jsPDF Helvetica standard font.
 */
export const getSafeUserName = (user: User): string => {
  const name = user.name || '';
  const asciiName = name.replace(/[^\x00-\x7F]/g, '').trim();
  if (asciiName.length >= 2) {
    return asciiName.substring(0, 16);
  }
  if (user.email) {
    const handle = user.email.split('@')[0];
    return `Dr. ${handle.charAt(0).toUpperCase() + handle.slice(1)}`.substring(0, 16);
  }
  return `Staff ${user.id.substring(0, 4)}`;
};

export const isShiftInExportScope = (
  shift: Shift,
  template: ShiftTemplate | undefined,
  currentUserId: string,
  homeGroupId: string
): boolean => {
  // An explicit target always wins. Falling back to the template's group is
  // only valid for legacy shifts that have no targetGroupId.
  const effectiveTargetGroupId = shift.targetGroupId ?? template?.groupId;
  const isImplicitSharedShift = !shift.targetGroupId && (template?.groupId === 'group-universal' || template?.isPooled);
  const isHomeGroupShift = effectiveTargetGroupId === homeGroupId || isImplicitSharedShift;

  if (isHomeGroupShift) return true;
  if (shift.userId !== currentUserId || !effectiveTargetGroupId) return false;

  const permittedCrossGroups = Object.entries(CROSS_GROUP_RULES)
    .filter(([, allowed]) => allowed.includes(homeGroupId))
    .map(([targetId]) => targetId);
  return permittedCrossGroups.includes(effectiveTargetGroupId);
};

/**
 * Exports the selected group for an admin, or the viewer's scoped schedule.
 */
export const exportScheduleToPDF = ({
  currentUser,
  users,
  templates,
  shifts,
  groups,
  rotationAssignments,
  schedulePeriod,
  datesArray,
  exportGroupId,
  save = true
}: ExportPDFParams): void => {
  const periodId = schedulePeriod?.id || 'current';
  const periodTitle = schedulePeriod?.title || 'Schedule Period';
  const periodRange = schedulePeriod ? `${schedulePeriod.startDate} to ${schedulePeriod.endDate}` : '';

  const selectedGroup = currentUser.role === 'admin'
    ? groups.find(group => group.id === exportGroupId)
    : undefined;
  if (exportGroupId && !selectedGroup) {
    throw new Error('Select a valid group to export.');
  }

  const getRotationGroupId = (userId: string) => rotationAssignments.find(
    a => a.userId === userId && (a.periodId === periodId || !a.periodId)
  )?.groupId;
  const scopeGroupId = selectedGroup?.id ?? getRotationGroupId(currentUser.id) ?? '';
  const groupName = groups.find(group => group.id === scopeGroupId)?.name ?? 'Duty Schedule';

  const getTargetGroupId = (shift: Shift) =>
    shift.targetGroupId ?? templates.find(template => template.id === shift.templateId)?.groupId;
  const periodShifts = shifts.filter(shift => datesArray.includes(shift.date));
  const groupShifts = selectedGroup ? periodShifts.filter(shift => {
    const targetGroupId = getTargetGroupId(shift);
    return targetGroupId === selectedGroup.id ||
      (targetGroupId === 'group-universal' && getRotationGroupId(shift.userId) === selectedGroup.id);
  }) : null;
  if (groupShifts?.length === 0) {
    throw new Error('No shifts found for this group in the active rotation.');
  }

  const homeGroupUsers = users.filter(user => getRotationGroupId(user.id) === scopeGroupId);
  const allowedHomeGroupsForTarget = CROSS_GROUP_RULES[scopeGroupId] || [];
  const crossGroupStaff = users.filter(user => {
    if (groupShifts) return groupShifts.some(shift => shift.userId === user.id);
    const homeGroupId = getRotationGroupId(user.id);
    return !!homeGroupId && homeGroupId !== scopeGroupId &&
      allowedHomeGroupsForTarget.includes(homeGroupId) &&
      periodShifts.some(shift => shift.userId === user.id && getTargetGroupId(shift) === scopeGroupId);
  });

  const exportUsersMap = new Map([...homeGroupUsers, ...crossGroupStaff].map(user => [user.id, user]));
  if (!selectedGroup && !exportUsersMap.has(currentUser.id)) {
    exportUsersMap.set(currentUser.id, currentUser);
  }
  if (groupShifts && !groupShifts.some(shift => exportUsersMap.has(shift.userId))) {
    throw new Error('No staff records found for this group’s shifts.');
  }
  const exportUsers = Array.from(exportUsersMap.values());

  // 5. Initialize PDF document (A4 Landscape)
  const JsPDFDoc = (jsPDF as any).jsPDF || jsPDF;
  const doc = new JsPDFDoc('landscape');
  const pageMargin = 14;
  const tableWidth = 269;
  const staffColWidth = 38;
  const numDays = datesArray.length || 28;
  const dayColWidth = (tableWidth - staffColWidth) / numDays;

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`DutyFlow: ${groupName} Duty Schedule`, pageMargin, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rotation: ${periodTitle} (${periodRange})`, pageMargin, 23);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | User: ${getSafeUserName(currentUser)}`, pageMargin, 28);

  // Helper to draw table header
  const drawTableHeader = (startY: number): number => {
    doc.setFillColor(30, 41, 59); // Dark slate header
    doc.rect(pageMargin, startY, tableWidth, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Staff Member', pageMargin + 2, startY + 6);

    datesArray.forEach((dateStr, index) => {
      const parts = dateStr.split('-').map(Number);
      const dayNum = String(parts[2]);
      const xPos = pageMargin + staffColWidth + (index * dayColWidth);
      doc.text(dayNum, xPos + (dayColWidth / 4), startY + 6);
    });

    doc.setTextColor(50, 50, 50);
    return startY + 9;
  };

  let currentY = drawTableHeader(33);

  // 6. Draw Table Rows
  exportUsers.forEach((u, uIdx) => {
    if (currentY > 180) {
      doc.addPage();
      currentY = drawTableHeader(15);
    }

    const isMe = u.id === currentUser.id;

    // Background highlight
    if (isMe) {
      doc.setFillColor(239, 246, 255); // Light blue tint for current user
      doc.rect(pageMargin, currentY, tableWidth, 7, 'F');
    } else if (uIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // Alternating light gray
      doc.rect(pageMargin, currentY, tableWidth, 7, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isMe ? 37 : 50, isMe ? 99 : 50, isMe ? 235 : 50);
    const displayName = `${getSafeUserName(u)}${isMe ? ' (Me)' : ''}`;
    doc.text(displayName.substring(0, 18), pageMargin + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    // Get shifts for user u
    const userShifts = (groupShifts ?? periodShifts).filter(s => {
      if (s.userId !== u.id) return false;
      if (groupShifts) return true;
      const template = templates.find(t => t.id === s.templateId);
      return isShiftInExportScope(s, template, currentUser.id, scopeGroupId);
    });
    const staffGroupId = getRotationGroupId(u.id);

    datesArray.forEach((dateStr, dIdx) => {
      const shift = userShifts.find(s => s.date === dateStr);
      if (shift) {
        const template = templates.find(t => t.id === shift.templateId);
        let code = getShiftShortCode(template) || 'SFT';
        const isCrossGroupShift = selectedGroup
          ? !!staffGroupId && staffGroupId !== selectedGroup.id && selectedGroup.id !== 'group-universal'
          : shift.targetGroupId && shift.targetGroupId !== scopeGroupId;
        if (isCrossGroupShift) {
          code += '*'; // Mark cross-group shift
        }
        const xPos = pageMargin + staffColWidth + (dIdx * dayColWidth);
        doc.text(code, xPos + 1, currentY + 5);
      }
    });

    currentY += 7;
  });

  // 7. Legend Footer
  currentY += 4;
  if (currentY > 195) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Legend: WD = Weekday Shift | HD = Holiday Shift | M = Morning | A = Afternoon | N = Night | * = Cross-Group Shift', pageMargin, currentY);

  // 8. Save PDF
  const cleanTitle = periodTitle.replace(/\s+/g, '_');
  const cleanGroup = groupName.replace(/\s+/g, '_');
  if (save) {
    doc.save(`DutyFlow_Schedule_${cleanGroup}_${cleanTitle}.pdf`);
  }
};
