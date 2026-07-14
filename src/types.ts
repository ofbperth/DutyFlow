export type Role = 'admin' | 'scheduler' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  isVirtual: boolean;
  googleCalendarId: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  color: string; // Tailwind bg-class or hex, we will use slate/teal/emerald color names
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string; // Tailwind background color class
  departmentId: string;
}

export type ShiftStatus = 'draft' | 'published';

export interface Shift {
  id: string;
  userId: string; // real or virtual
  date: string; // YYYY-MM-DD
  templateId: string;
  status: ShiftStatus;
  departmentId: string;
  assignedBy: string;
  googleCalendarEventId?: string | null;
}

export type AvailabilityStatus = 'available' | 'unavailable' | 'preferred';

export interface Availability {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  notes?: string;
}

export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ShiftSwap {
  id: string;
  requestingUserId: string;
  requestingShiftId: string;
  targetUserId: string;
  targetShiftId: string | null; // null if they are just asking someone to cover, or a specific shift if swapping
  status: SwapStatus;
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface SchedulePeriod {
  id: string; // 'current' or specific
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}
