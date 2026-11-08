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

// Use browser font shaping for Thai and other scripts Helvetica cannot render.
const drawCalendarText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number) => {
  const canvas = /[^\x20-\x7E]/.test(text) && typeof document !== 'undefined'
    ? document.createElement('canvas')
    : null;
  const context = canvas?.getContext('2d');
  if (canvas && context) {
    const pixelsPerMm = 12;
    const fontSize = doc.getFontSize() * 25.4 / 72 * pixelsPerMm;
    const font = `${doc.getFont().fontStyle === 'bold' ? 'bold ' : ''}${fontSize}px Tahoma, "Noto Sans Thai", sans-serif`;
    const baseline = Math.ceil(fontSize * 1.3);
    context.font = font;
    canvas.width = Math.min(Math.ceil(context.measureText(text).width) + 2, Math.floor(maxWidth * pixelsPerMm));
    canvas.height = Math.ceil(fontSize * 1.8);
    context.font = font;
    context.fillStyle = doc.getTextColor();
    context.fillText(text, 1, baseline, canvas.width - 2);
    doc.addImage(canvas, 'PNG', x, y - baseline / pixelsPerMm, canvas.width / pixelsPerMm, canvas.height / pixelsPerMm, undefined, 'FAST');
    return;
  }

  const printable = text.replace(/[^\x20-\x7E]/g, '?');
  const width = doc.getTextWidth(printable);
  if (width > maxWidth) {
    doc.saveGraphicsState();
    doc.text(printable, x, y, { horizontalScale: maxWidth / width });
    doc.restoreGraphicsState();
    return;
  }
  doc.text(printable, x, y);
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
  const entriesByDate = new Map<string, { name: string; code: string }[]>();
  for (const shift of groupShifts ?? periodShifts) {
    const staff = exportUsersMap.get(shift.userId);
    if (!staff) continue;
    const template = templates.find(item => item.id === shift.templateId);
    if (!groupShifts && !isShiftInExportScope(shift, template, currentUser.id, scopeGroupId)) continue;

    const staffGroupId = getRotationGroupId(staff.id);
    const isCrossGroup = selectedGroup
      ? staffGroupId && staffGroupId !== selectedGroup.id && selectedGroup.id !== 'group-universal'
      : shift.targetGroupId && shift.targetGroupId !== scopeGroupId;
    const entry = {
      name: staff.name?.trim().replace(/\s+/g, ' ') || getSafeUserName(staff),
      code: (getShiftShortCode(template) || 'SFT') + (isCrossGroup ? '*' : '')
    };
    const dayEntries = entriesByDate.get(shift.date) ?? [];
    dayEntries.push(entry);
    entriesByDate.set(shift.date, dayEntries);
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLabels = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayMs = 86_400_000;
  const weeks = new Map<number, (string | undefined)[]>();
  for (const date of datesArray) {
    const utcDate = new Date(`${date}T00:00:00Z`);
    const weekday = utcDate.getUTCDay();
    const sunday = utcDate.getTime() - weekday * dayMs;
    const week = weeks.get(sunday) ?? Array<string | undefined>(7).fill(undefined);
    week[weekday] = date;
    weeks.set(sunday, week);
  }

  const JsPDFDoc = (jsPDF as any).jsPDF || jsPDF;
  const doc: jsPDF = new JsPDFDoc('landscape');
  const pageMargin = 14;
  const calendarWidth = doc.internal.pageSize.getWidth() - pageMargin * 2;
  const cellWidth = calendarWidth / 7;
  const calendarTop = 32;
  const headerHeight = 8;
  const calendarBottom = 188;
  const dateHeight = 8;
  const entryHeight = 4.6;
  const cellPadding = 2.5;
  const minWeekHeight = 34;
  const weekCapacity = Math.floor((calendarBottom - calendarTop - headerHeight - dateHeight - cellPadding) / entryHeight);

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    drawCalendarText(doc, `DutyFlow: ${groupName} Duty Schedule`, pageMargin, 16, calendarWidth);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    drawCalendarText(doc, `Rotation: ${periodTitle} (${periodRange})`, pageMargin, 23, calendarWidth);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | User: ${getSafeUserName(currentUser)}`, pageMargin, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    weekdays.forEach((weekday, index) => {
      const x = pageMargin + index * cellWidth;
      doc.setFillColor(index === 0 || index === 6 ? '#92400e' : '#1e293b');
      doc.rect(x, calendarTop, cellWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(weekday, x + cellWidth / 2, calendarTop + 5.5, { align: 'center' });
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('WD = Weekday | HD = Holiday | M = Morning | A = Afternoon | N = Night | * = Cross-group | Shaded = Sat/Sun', pageMargin, 195);
    doc.text(String(doc.getNumberOfPages()), pageMargin + calendarWidth, 195, { align: 'right' });
    return calendarTop + headerHeight;
  };

  let y = drawPageHeader();
  const sortedWeeks = [...weeks.entries()].sort(([left], [right]) => left - right);
  for (const [, week] of sortedWeeks) {
    const entries = week.map(date => date ? entriesByDate.get(date) ?? [] : []);
    const entryCount = Math.max(...entries.map(dayEntries => dayEntries.length));

    // Keep normal weeks together. Repeat the dates if a dense week spans pages.
    for (let offset = 0; offset < Math.max(1, entryCount); offset += weekCapacity) {
      const rowEntries = Math.min(weekCapacity, entryCount - offset);
      const height = Math.max(minWeekHeight, dateHeight + rowEntries * entryHeight + cellPadding);
      if (y + height > calendarBottom) {
        doc.addPage();
        y = drawPageHeader();
      }

      week.forEach((date, column) => {
        const x = pageMargin + column * cellWidth;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.setFillColor(!date ? '#f1f5f9' : column === 0 || column === 6 ? '#fef3c7' : '#ffffff');
        doc.rect(x, y, cellWidth, height, 'FD');
        if (!date) return;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const dateLabel = dayLabels.format(new Date(`${date}T00:00:00Z`));
        doc.text(offset ? `${dateLabel} (cont.)` : dateLabel, x + cellPadding, y + 5.6);

        entries[column].slice(offset, offset + weekCapacity).forEach(({ name, code }, index) => {
          const baseline = y + dateHeight + (index + 1) * entryHeight - 1;
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 64, 175);
          const codeWidth = doc.getTextWidth(code);
          doc.text(code, x + cellWidth - cellPadding, baseline, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          drawCalendarText(doc, name, x + cellPadding, baseline, cellWidth - 3 * cellPadding - codeWidth);
        });
      });
      y += height;
    }
  }

  const cleanTitle = periodTitle.replace(/\s+/g, '_');
  const cleanGroup = groupName.replace(/\s+/g, '_');
  if (save) {
    doc.save(`DutyFlow_Schedule_${cleanGroup}_${cleanTitle}.pdf`);
  }
};
