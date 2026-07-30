import type React from 'react';

export type Role = 'admin' | 'scheduler' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  // Server-enforced scheduler scope. Only admins may assign or change this value.
  homeGroupId?: string;
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

export const NON_UNIVERSAL_GROUPS = new Set<string>(['group-saraburi', 'group-1650']);

export const getAllowedTargetGroupIdsForHomeGroup = (
  homeGroupId: string,
  groups?: DoctorGroup[]
): string[] => {
  const allowed = new Set<string>();

  if (homeGroupId) {
    allowed.add(homeGroupId);
  }
  allowed.add('group-pooled');

  const isNonUniversal = groups
    ? groups.find(g => g.id === homeGroupId)?.isUniversal === false || NON_UNIVERSAL_GROUPS.has(homeGroupId)
    : NON_UNIVERSAL_GROUPS.has(homeGroupId);

  if (!isNonUniversal) {
    allowed.add('group-universal');
  }

  for (const [targetGroupId, allowedHomeGroups] of Object.entries(CROSS_GROUP_RULES)) {
    if (allowedHomeGroups.includes(homeGroupId)) {
      allowed.add(targetGroupId);
    }
  }

  return Array.from(allowed);
};

// 4-Week Calendar & Adaptive Scheduling Contracts
export type ViewMode = 'calendar' | 'matrix';

export interface ShiftAssignment {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  shiftTypeId: string;
  shiftTypeName: string;
  color: string;
  isCurrentUser?: boolean;
  startTime?: string;
  endTime?: string;
  status?: ShiftStatus;
  notes?: string;
  targetGroupId?: string;
}

export interface FourWeekCalendarViewProps {
  startDate: string; // First day of 28-day rotation
  assignments: ShiftAssignment[];
  currentUserId?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  // Adaptive Controls Props
  isScheduler?: boolean;
  onDropShift?: (shiftTypeId: string, date: string) => void;
  onBatchAssign?: (dates: string[], shiftTypeId: string) => void;
  onOpenBatchAssign?: () => void;
  onCopyDayRoster?: (sourceDate: string) => void;
  onPasteDayRoster?: (targetDate: string) => void;
  copiedRosterDate?: string | null;
  // Extended Adaptive Props
  selectedDates?: string[];
  onToggleSelectDate?: (date: string) => void;
  onContextMenuDate?: (date: string, e: React.MouseEvent | React.TouchEvent) => void;
  holidays?: Holiday[];
}

export interface DayInspectorPanelProps {
  selectedDate: string | null;
  assignments: ShiftAssignment[];
  users?: User[];
  templates?: ShiftTemplate[];
  groups?: DoctorGroup[];
  holidays?: Holiday[];
  isOpen: boolean;
  onClose: () => void;
  isScheduler?: boolean;
  onAddAssignment?: (date: string) => void;
  onEditAssignment?: (assignmentId: string, notes?: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
}

export interface TouchContextMenuProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onInspectRoster: (date: string) => void;
  onAddShift?: (date: string) => void;
  onCopyRoster?: (date: string) => void;
  onPasteRoster?: (date: string) => void;
  onClearRoster?: (date: string) => void;
  canPaste?: boolean;
  isScheduler?: boolean;
}

export interface BatchAssignModalProps {
  selectedDates: string[];
  templates: ShiftTemplate[];
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (dates: string[], templateId: string, userId?: string) => Promise<void>;
}
