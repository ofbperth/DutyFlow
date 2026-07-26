export type Role = 'admin' | 'scheduler' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVirtual: boolean;
  createdAt: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string; // Tailwind background color class
  groupId: string;
  isPooled?: boolean;
}

export type ShiftStatus = 'draft' | 'published';

export interface Shift {
  id: string;
  userId: string; // real or virtual
  date: string; // YYYY-MM-DD
  templateId: string;
  status: ShiftStatus;
  assignedBy: string;
  notes?: string;
  targetGroupId?: string; // Target department/group for cross-group shifts
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

export interface DoctorGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  weekdayShiftTime?: string; // e.g. "17:00-07:00"
  holidayShiftTime?: string; // e.g. "10:00-07:00"
  isUniversal?: boolean;
}

export interface GroupRotationAssignment {
  id: string;
  periodId: string;
  groupId: string;
  userId: string;
  displayOrder?: number;
}

// Cross-group shift permission rules: targetGroupId -> list of allowed homeGroupIds
export const CROSS_GROUP_RULES: Record<string, string[]> = {
  'group-1650': ['group-nvmdown', 'group-nvm23-asd11'],
  'group-icu8s': ['group-rcu'],
  'group-icu8n': ['group-ccu'],
  'group-icu3': ['group-nvm23-asd11']
};

export const getAllowedTargetGroupIdsForHomeGroup = (homeGroupId: string): string[] => {
  const allowed: string[] = ['group-pooled'];
  if (homeGroupId !== 'group-saraburi' && homeGroupId !== 'group-1650') {
    allowed.push('group-universal');
  }
  if (homeGroupId === 'group-saraburi') {
    allowed.push('group-saraburi');
  }
  if (homeGroupId === 'group-1650' || homeGroupId === 'group-nvmdown' || homeGroupId === 'group-nvm23-asd11') {
    allowed.push('group-1650');
  }
  if (homeGroupId === 'group-nvm23-asd11' || homeGroupId === 'group-icu3') {
    allowed.push('group-icu3');
  }
  if (homeGroupId === 'group-rcu' || homeGroupId === 'group-icu8s') {
    allowed.push('group-icu8s');
  }
  if (homeGroupId === 'group-ccu' || homeGroupId === 'group-icu8n') {
    allowed.push('group-icu8n');
  }
  return allowed;
};


