import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Helper to format Date to YYYYMMDDTHHMMSS (Floating Local Time for iCal)
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

export default async function handler(req: any, res: any) {
  try {
    // Extract userId from query or path and strip .ics extension
    let userId = (req.query.userId as string) || '';
    if (!userId && req.url) {
      const parts = req.url.split('?')[0].split('/');
      userId = parts[parts.length - 1] || '';
    }
    userId = userId.replace(/\.ics$/, '').trim();

    if (!userId) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('User ID required');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    // Fetch all shifts, templates, and groups without composite index requirement
    const [shiftsSnap, templatesSnap, groupsSnap] = await Promise.all([
      getDocs(collection(db, 'shifts')).catch(err => {
        console.error('Error fetching shifts collection:', err);
        return null;
      }),
      getDocs(collection(db, 'shiftTemplates')).catch(err => {
        console.error('Error fetching shiftTemplates collection:', err);
        return null;
      }),
      getDocs(collection(db, 'doctorGroups')).catch(err => {
        console.error('Error fetching doctorGroups collection:', err);
        return null;
      })
    ]);

    const allShifts: any[] = shiftsSnap ? shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const templates: any[] = templatesSnap ? templatesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const doctorGroups: any[] = groupsSnap ? groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

    const targetLower = userId.toLowerCase();
    
    // Filter shifts for target user and published status in JS memory
    const userShifts = allShifts.filter((shift: any) => {
      if (!shift || !shift.userId) return false;
      const shiftUserIdStr = shift.userId.toString().trim().toLowerCase();
      const statusStr = shift.status ? shift.status.toString().trim().toLowerCase() : 'published';
      return shiftUserIdStr === targetLower && statusStr === 'published';
    });

    // Debug endpoint flag
    if (req.query.debug === 'true') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        searchedUserId: userId,
        totalShiftsInDatabase: allShifts.length,
        matchedUserShiftsCount: userShifts.length,
        matchedShifts: userShifts,
        templatesCount: templates.length,
        groupsCount: doctorGroups.length
      });
    }

    // Generate iCal feed string using Floating Local Time
    let ics = '';
    ics += 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//DutyFlow//DutyFlow Calendar//EN\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += `X-WR-CALNAME:DutyFlow Schedule\r\n`;
    ics += 'X-WR-TIMEZONE:Asia/Bangkok\r\n';

    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    userShifts.forEach((shift) => {
      const template = templates.find((t) => t.id === shift.templateId);
      const templateName = template ? template.name : 'Shift';
      const startTime = template ? (template.startTime || '08:00') : '08:00';
      const endTime = template ? (template.endTime || '16:00') : '16:00';

      const group = doctorGroups.find((g) => g.id === (shift.targetGroupId || (template ? template.groupId : '')));

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
      ics += `DTSTART:${dtStartStr}\r\n`;
      ics += `DTEND:${dtEndStr}\r\n`;
      ics += `SUMMARY:🩺 DutyFlow: ${templateName}\r\n`;

      if (group && group.name) {
        ics += `LOCATION:${group.name}\r\n`;
      }

      let description = `DutyFlow Shift: ${templateName}`;
      if (shift.notes) {
        description += `\\nNotes: ${shift.notes.replace(/\r?\n/g, '\\n')}`;
      }
      ics += `DESCRIPTION:${description}\r\n`;
      ics += 'END:VEVENT\r\n';
    });

    ics += 'END:VCALENDAR\r\n';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="dutyflow-${userId}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(ics);
  } catch (err: any) {
    console.error('Error generating calendar feed:', err);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send(`Internal server error: ${err.message || err}`);
  }
}
