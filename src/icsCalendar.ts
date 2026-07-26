import { User, Shift, ShiftTemplate, DoctorGroup } from './types';

// Helper to format Date to YYYYMMDDTHHMMSSZ
const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICalendarFeed = (user: User, shifts: Shift[], templates: ShiftTemplate[], doctorGroups: DoctorGroup[]): string => {
  let ics = '';
  ics += 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//DutyFlow//DutyFlow Calendar//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:PUBLISH\r\n';
  ics += `X-WR-CALNAME:DutyFlow: ${user.name}\r\n`;
  
  const now = new Date();
  const dtstamp = formatICSDate(now);

  shifts.filter(s => s.status === 'published').forEach(shift => {
    const template = templates.find(t => t.id === shift.templateId);
    if (!template) return;

    const group = doctorGroups.find(g => g.id === (shift.targetGroupId || template.groupId));

    const [startHour, startMin] = template.startTime.split(':').map(Number);
    const [endHour, endMin] = template.endTime.split(':').map(Number);

    const startDate = new Date(`${shift.date}T00:00:00`);
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(`${shift.date}T00:00:00`);
    endDate.setHours(endHour, endMin, 0, 0);

    if (endDate <= startDate) {
      // Crosses midnight
      endDate.setDate(endDate.getDate() + 1);
    }

    const uid = `${shift.id}@dutyflow.com`;

    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${uid}\r\n`;
    ics += `DTSTAMP:${dtstamp}\r\n`;
    ics += `DTSTART:${formatICSDate(startDate)}\r\n`;
    ics += `DTEND:${formatICSDate(endDate)}\r\n`;
    ics += `SUMMARY:🩺 DutyFlow: ${template.name}\r\n`;
    
    if (group) {
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
  return `webcal://${host}/api/calendar/${userId}.ics`;
};

export const getGoogleCalendarSubscribeUrl = (feedUrl: string): string => {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl)}`;
};
