import { Shift, ShiftTemplate, Department, User } from './types';
import { saveShift } from './firebase';

export interface SyncTask {
  id: string; // unique ID for task
  shiftId: string;
  action: 'create' | 'update' | 'delete';
  calendarId: string;
  accessToken?: string;
  retryCount: number;
  lastError?: string;
  timestamp: number;
}

// Helper to calculate end date (handles midnight-crossing shifts)
export function getShiftDateRange(date: string, template: ShiftTemplate) {
  const startDateTime = `${date}T${template.startTime}:00`;
  let endDate = date;

  if (template.endTime < template.startTime) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString().split('T')[0];
  }
  const endDateTime = `${endDate}T${template.endTime}:00`;

  return { startDateTime, endDateTime };
}

// Send event to Google Calendar API
export async function googleCalendarRequest(
  task: Omit<SyncTask, 'id' | 'retryCount' | 'timestamp'>,
  shift: Shift,
  template: ShiftTemplate,
  dept: Department
): Promise<string | null> {
  const { action, calendarId, accessToken } = task;
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  if (action === 'delete') {
    if (!shift.googleCalendarEventId) return null;
    const url = `${baseUrl}/${shift.googleCalendarEventId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Delete failed with status ${res.status}: ${await res.text()}`);
    }
    return null;
  }

  // Create or Update payload
  const { startDateTime, endDateTime } = getShiftDateRange(shift.date, template);

  const payload = {
    summary: `🩺 DutyFlow: ${template.name}`,
    description: `Assigned Hospital Shift\nWard: ${dept.name}\nTime: ${template.startTime} - ${template.endTime}\nAssigned via DutyFlow platform.`,
    colorId: dept.id === 'dept-er' ? '11' : dept.id === 'dept-icu' ? '3' : dept.id === 'dept-peds' ? '4' : '5', // Google Calendar colors (11=Teal, 3=Grape, 4=Flamingo, 5=Banana)
    start: {
      dateTime: startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
  };

  const isUpdate = action === 'update' && shift.googleCalendarEventId;
  const url = isUpdate ? `${baseUrl}/${shift.googleCalendarEventId}` : baseUrl;
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`${method} failed with status ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.id; // Returns the Google Event ID
}

// Local Storage Sync Queue Management
const QUEUE_KEY = 'dutyflow_sync_queue';

export function getSyncQueue(): SyncTask[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncTask[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToSyncQueue(task: Omit<SyncTask, 'id' | 'retryCount' | 'timestamp'>) {
  const queue = getSyncQueue();
  const newTask: SyncTask = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    retryCount: 0,
    timestamp: Date.now()
  };
  queue.push(newTask);
  saveSyncQueue(queue);
}

// Process the Sync Queue synchronously with state reporting
export async function processSyncQueue(
  accessToken: string,
  shifts: Shift[],
  templates: ShiftTemplate[],
  departments: Department[],
  onTaskSuccess?: (taskId: string) => void,
  onTaskFailure?: (taskId: string, error: string) => void
): Promise<{ successCount: number; failureCount: number }> {
  const queue = getSyncQueue();
  if (queue.length === 0) return { successCount: 0, failureCount: 0 };

  const remainingTasks: SyncTask[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const task of queue) {
    const currentShift = shifts.find(s => s.id === task.shiftId);
    const currentTemplate = currentShift ? templates.find(t => t.id === currentShift.templateId) : null;
    const currentDept = currentShift ? departments.find(d => d.id === currentShift.departmentId) : null;

    // If shift deleted or template missing, and it's not a deletion task, skip it
    if (task.action !== 'delete' && (!currentShift || !currentTemplate || !currentDept)) {
      if (onTaskSuccess) onTaskSuccess(task.id);
      successCount++;
      continue;
    }

    try {
      // Execute
      const eventId = await googleCalendarRequest(
        { ...task, accessToken },
        currentShift!,
        currentTemplate!,
        currentDept!
      );

      // Update shift in database with the google event ID if created
      if (task.action === 'create' && eventId && currentShift) {
        currentShift.googleCalendarEventId = eventId;
        await saveShift(currentShift);
      }

      successCount++;
      if (onTaskSuccess) onTaskSuccess(task.id);
    } catch (err: any) {
      console.error('Failed to sync task:', task, err);
      task.retryCount++;
      task.lastError = err.message || String(err);

      if (task.retryCount < 3) {
        remainingTasks.push(task); // Retry later
      } else {
        failureCount++;
        if (onTaskFailure) onTaskFailure(task.id, task.lastError || 'Max retries exceeded');
      }
    }
  }

  saveSyncQueue(remainingTasks);
  return { successCount, failureCount };
}
