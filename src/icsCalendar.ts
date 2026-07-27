import { Shift, ShiftTemplate, DoctorGroup, User } from './types';

// Helper to format Date to YYYYMMDDTHHMMSS (Local Time for iCal with TZID)
const formatICSDateLocal = (dateStr: string, timeStr: string): string => {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = (timeStr || '00:00').replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
};

// Helper to calculate end date string for overnight shifts
const getNextDayDateStr = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
};

export const generateICalendarFeed = (
  user: User,
  userShifts: Shift[],
  templates: ShiftTemplate[],
  groups: DoctorGroup[]
): string => {
  let ics = '';
  ics += 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//DutyFlow//DutyFlow Calendar//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:PUBLISH\r\n';
  ics += `X-WR-CALNAME:DutyFlow: ${user.name}\r\n`;
  ics += 'X-WR-TIMEZONE:Asia/Bangkok\r\n';
  ics += 'BEGIN:VTIMEZONE\r\n';
  ics += 'TZID:Asia/Bangkok\r\n';
  ics += 'X-LIC-LOCATION:Asia/Bangkok\r\n';
  ics += 'BEGIN:STANDARD\r\n';
  ics += 'TZOFFSETFROM:+0700\r\n';
  ics += 'TZOFFSETTO:+0700\r\n';
  ics += 'TZNAME:GMT+7\r\n';
  ics += 'DTSTART:19700101T000000\r\n';
  ics += 'END:STANDARD\r\n';
  ics += 'END:VTIMEZONE\r\n';

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  userShifts.forEach((shift) => {
    const template = templates.find((t) => t.id === shift.templateId);
    const templateName = template ? template.name : 'Shift';
    const startTime = template ? (template.startTime || '08:00') : '08:00';
    const endTime = template ? (template.endTime || '16:00') : '16:00';

    const group = groups.find((g) => g.id === (shift.targetGroupId || (template ? template.groupId : '')));

    let endDateStr = shift.date;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
      endDateStr = getNextDayDateStr(shift.date);
    }

    const dtStartStr = formatICSDateLocal(shift.date, startTime);
    const dtEndStr = formatICSDateLocal(endDateStr, endTime);
    const uid = `${shift.id}@dutyflow.com`;

    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${uid}\r\n`;
    ics += `DTSTAMP:${dtstamp}\r\n`;
    ics += `DTSTART;TZID=Asia/Bangkok:${dtStartStr}\r\n`;
    ics += `DTEND;TZID=Asia/Bangkok:${dtEndStr}\r\n`;
    ics += `SUMMARY:🩺 DutyFlow: ${templateName}\r\n`;

    if (group && group.name) {
      ics += `LOCATION:${group.name}\r\n`;
    }

    let description = `DutyFlow Shift: ${templateName}`;
    if (shift.notes) {
      description += `\\nNotes: ${shift.notes.replace(/\r?\n/g, '\\n')}`;
    }
    ics += `DESCRIPTION:${description}\r\n`;
    ics += 'SEQUENCE:0\r\n';
    ics += 'STATUS:CONFIRMED\r\n';
    ics += 'END:VEVENT\r\n';
  });

  ics += 'END:VCALENDAR\r\n';
  return ics;
};

export const downloadICSFile = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
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
  const httpsUrl = feedUrl.replace(/^webcal:\/\//, 'https://');
  return `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(httpsUrl)}`;
};

export const getWebcalSubscribeUrl = (feedUrl: string): string => {
  return feedUrl.replace(/^https?:\/\//, 'webcal://');
};
