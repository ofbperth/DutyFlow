const PROJECT_ID = 'dutyflow-502613';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper to format Date to YYYYMMDDTHHMMSS (Floating Local Time for iCal)
const formatICSDateLocal = (dateStr: string, timeStr: string): string => {
  const cleanDate = dateStr.replace(/-/g, ''); // "20260727"
  const cleanTime = (timeStr || '00:00').replace(/:/g, '') + '00'; // "170000"
  return `${cleanDate}T${cleanTime}`;
};

// Helper to calculate end date string for overnight shifts
const getNextDayDateStr = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
};

// Helper to extract fields from Firestore REST API document format
const parseFirestoreDoc = (doc: any) => {
  if (!doc || !doc.fields) return null;
  const fields = doc.fields;
  const result: Record<string, any> = {
    id: doc.name ? doc.name.split('/').pop() : ''
  };

  for (const key of Object.keys(fields)) {
    const val = fields[key];
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = Number(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
    else if (val.nullValue !== undefined) result[key] = null;
  }
  return result;
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

    // Fetch user, shifts, templates, and doctor groups with pageSize=1000 to prevent pagination truncation
    const [userRes, shiftsRes, templatesRes, groupsRes] = await Promise.all([
      fetch(`${FIRESTORE_BASE}/users/${userId}`).catch(() => null),
      fetch(`${FIRESTORE_BASE}/shifts?pageSize=1000`).catch(() => null),
      fetch(`${FIRESTORE_BASE}/shiftTemplates?pageSize=1000`).catch(() => null),
      fetch(`${FIRESTORE_BASE}/doctorGroups?pageSize=1000`).catch(() => null),
    ]);

    let userName = 'DutyFlow User';
    if (userRes && userRes.ok) {
      const userData = await userRes.json();
      const parsedUser = parseFirestoreDoc(userData);
      if (parsedUser && parsedUser.name) userName = parsedUser.name;
    }

    const targetUserIdLower = userId.toLowerCase();
    const shifts: any[] = [];
    if (shiftsRes && shiftsRes.ok) {
      const data = await shiftsRes.json();
      if (data.documents && Array.isArray(data.documents)) {
        data.documents.forEach((d: any) => {
          const parsed = parseFirestoreDoc(d);
          if (
            parsed &&
            parsed.userId &&
            parsed.userId.toLowerCase() === targetUserIdLower &&
            parsed.status &&
            parsed.status.toLowerCase() === 'published'
          ) {
            shifts.push(parsed);
          }
        });
      }
    }

    const templates: any[] = [];
    if (templatesRes && templatesRes.ok) {
      const data = await templatesRes.json();
      if (data.documents && Array.isArray(data.documents)) {
        data.documents.forEach((d: any) => {
          const parsed = parseFirestoreDoc(d);
          if (parsed) templates.push(parsed);
        });
      }
    }

    const doctorGroups: any[] = [];
    if (groupsRes && groupsRes.ok) {
      const data = await groupsRes.json();
      if (data.documents && Array.isArray(data.documents)) {
        data.documents.forEach((d: any) => {
          const parsed = parseFirestoreDoc(d);
          if (parsed) doctorGroups.push(parsed);
        });
      }
    }

    // Generate iCal feed string using Floating Local Time
    let ics = '';
    ics += 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//DutyFlow//DutyFlow Calendar//EN\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += `X-WR-CALNAME:DutyFlow: ${userName}\r\n`;
    ics += 'X-WR-TIMEZONE:Asia/Bangkok\r\n';

    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    shifts.forEach((shift) => {
      const template = templates.find((t) => t.id === shift.templateId);
      if (!template) return;

      const group = doctorGroups.find((g) => g.id === (shift.targetGroupId || template.groupId));

      const startTime = template.startTime || '08:00';
      const endTime = template.endTime || '16:00';

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      let endDateStr = shift.date;
      // Check if end time is before or equal to start time (overnight shift)
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
      ics += `SUMMARY:🩺 DutyFlow: ${template.name || 'Shift'}\r\n`;

      if (group && group.name) {
        ics += `LOCATION:${group.name}\r\n`;
      }

      let description = `DutyFlow Shift: ${template.name || 'Shift'}`;
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
    return res.status(500).send('Internal server error');
  }
}
