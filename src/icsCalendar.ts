import { User, Shift, ShiftTemplate, DoctorGroup } from './types';

// Helper to format Date to YYYYMMDDTHHMMSS (Floating Local Time)
const formatICSDateLocal = (dateStr: string, timeStr: string): string => {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = (timeStr || '00:00').replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
};

// Helper to calculate next day string for overnight shifts
const getNextDayDateStr = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
};

export const generateICalendarFeed = (user: User, shifts: Shift[], templates: ShiftTemplate[], doctorGroups: DoctorGroup[]): string => {
  let ics = '';
  ics += 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//DutyFlow//DutyFlow Calendar//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:PUBLISH\r\n';
  ics += `X-WR-CALNAME:DutyFlow: ${user.name}\r\n`;
  ics += 'X-WR-TIMEZONE:Asia/Bangkok\r\n';
  
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  shifts.filter(s => s.status === 'published').forEach(shift => {
    const template = templates.find(t => t.id === shift.templateId);
    if (!template) return;

    const group = doctorGroups.find(g => g.id === (shift.targetGroupId || template.groupId));

    const startTime = template.startTime || '08:00';
    const endTime = template.endTime || '16:00';

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let endDateStr = shift.date;
    if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
      endDateStr = getNextDayDateStr(shift.date);
    }

    const dtStartStr = formatICSDateLocal(shift.date, startTime);
    const dtEndStr = formatICSDateLocal(endDateStr, endTime);
    const uid = `${shift.id}@dutyflow.com`;

    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${uid}\r\n`;
    ics += `DTSTAMP:${dtstamp}\r\n`;
    ics += `DTSTART:${dtStartStr}\r\n`;
    ics += `DTEND:${dtEndStr}\r\n`;
    ics += `SUMMARY:🩺 DutyFlow: ${template.name}\r\n`;
    
    if (group && group.name) {
      ics += `LOCATION:${group.name}\r\n`;
    }
    
    let description = `DutyFlow Shift: ${template.name}`;
    if (shift.notes) {
      description += `\\nNotes: ${shift.notes.replace(/\r?\n/g, '\\n')}`;
    }
    ics += `DESCRIPTION:${description}\r\n`;
    ics += 'END:VEVENT\r\n';
  });

  ics += 'END:VCALENDAR\r\n';
  return ics;
};

export const downloadICSFile = (filename: string, icsContent: string): void => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getICalFeedUrl = (userId: string): string => {
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${host}/api/calendar/${userId}.ics`;
};

export const getGoogleCalendarSubscribeUrl = (feedUrl: string): string => {
  return feedUrl.replace(/^https?:\/\//, 'webcal://');
};
