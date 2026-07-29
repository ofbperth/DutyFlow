import { ShiftAssignment, ViewMode } from '../src/types.ts';

export interface CalendarGridCell {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  weekIndex: number; // 0 to 3
  columnIndex: number; // 0 to 6
  assignments: ShiftAssignment[];
  isToday?: boolean;
}

export interface TouchMenuState {
  isOpen: boolean;
  date: string | null;
  targetShiftId?: string | null;
}

export interface DayInspectorState {
  isOpen: boolean;
  selectedDate: string | null;
}

export class CalendarStateEngine {
  public startDate: string;
  public assignments: ShiftAssignment[];
  public currentUserId: string | null;
  public viewMode: ViewMode;
  public selectedDate: string | null;
  public isScheduler: boolean;
  public selectedDates: Set<string>;
  public copiedRosterDate: string | null;
  public copiedRosterAssignments: ShiftAssignment[];
  public touchMenu: TouchMenuState;
  public dayInspector: DayInspectorState;

  constructor(options: {
    startDate?: string;
    assignments?: ShiftAssignment[];
    currentUserId?: string | null;
    viewMode?: ViewMode;
    selectedDate?: string | null;
    isScheduler?: boolean;
  } = {}) {
    this.startDate = options.startDate || '2026-08-03'; // Default Monday
    this.assignments = options.assignments ? [...options.assignments] : [];
    this.currentUserId = options.currentUserId !== undefined ? options.currentUserId : 'user-1';
    this.viewMode = options.viewMode || 'calendar';
    this.selectedDate = options.selectedDate || null;
    this.isScheduler = options.isScheduler !== undefined ? options.isScheduler : true;
    this.selectedDates = new Set<string>();
    this.copiedRosterDate = null;
    this.copiedRosterAssignments = [];
    this.touchMenu = { isOpen: false, date: null, targetShiftId: null };
    const hasSelectedDate = Boolean(options.selectedDate);
    this.dayInspector = { isOpen: hasSelectedDate, selectedDate: hasSelectedDate ? options.selectedDate! : null };
  }

  // --- Grid Layout Math & Helpers ---
  public get28Days(): string[] {
    const dates: string[] = [];
    const base = new Date(this.startDate);
    if (isNaN(base.getTime())) {
      throw new Error(`Invalid startDate format: ${this.startDate}`);
    }
    for (let i = 0; i < 28; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  }

  public getEndDate(): string {
    const days = this.get28Days();
    return days[27];
  }

  public buildGridCells(): CalendarGridCell[] {
    const dates = this.get28Days();
    return dates.map((date, index) => {
      const weekIndex = Math.floor(index / 7);
      const columnIndex = index % 7;
      const cellAssignments = this.getAssignmentsForDate(date);
      const d = new Date(date);
      return {
        date,
        dayOfWeek: d.getDay(),
        weekIndex,
        columnIndex,
        assignments: cellAssignments,
      };
    });
  }

  public checkZeroHorizontalScrollConstraint(containerWidthPx: number, cellMinWidthPx: number = 100): {
    fits: boolean;
    colWidthPx: number;
  } {
    // Grid has 7 equal columns
    const colWidthPx = containerWidthPx / 7;
    const fits = colWidthPx >= cellMinWidthPx && containerWidthPx > 0;
    return { fits, colWidthPx };
  }

  public getAssignmentsForDate(date: string): ShiftAssignment[] {
    return this.assignments.filter((a) => a.date === date);
  }

  // --- View Switcher ---
  public setViewMode(mode: ViewMode): void {
    if (mode !== 'calendar' && mode !== 'matrix') {
      throw new Error(`Invalid ViewMode: ${mode}`);
    }
    this.viewMode = mode;
  }

  // --- Date Selection & Day Inspector ---
  public selectDate(date: string | null): void {
    this.selectedDate = date;
    if (date) {
      this.dayInspector = { isOpen: true, selectedDate: date };
    } else {
      this.dayInspector = { isOpen: false, selectedDate: null };
    }
  }

  public closeDayInspector(): void {
    this.dayInspector = { isOpen: false, selectedDate: null };
    this.selectedDate = null;
  }

  // --- Glowing User Highlights ---
  public isCurrentUserAssignment(assignment: ShiftAssignment): boolean {
    if (!this.currentUserId) return false;
    return assignment.userId.toLowerCase().trim() === this.currentUserId.toLowerCase().trim() || assignment.isCurrentUser === true;
  }

  public getGlowingAssignmentsForDate(date: string): ShiftAssignment[] {
    return this.getAssignmentsForDate(date).filter((a) => this.isCurrentUserAssignment(a));
  }

  // --- Desktop Drag & Drop ---
  public dropShift(shiftTypeId: string, date: string, shiftTypeName: string = 'Shift', color: string = 'bg-blue-500'): ShiftAssignment {
    if (!this.isScheduler) {
      throw new Error('Permission denied: Only schedulers can drag & drop shifts.');
    }
    const days = this.get28Days();
    if (!days.includes(date)) {
      throw new Error(`Target date ${date} is out of bounds for current 28-day rotation.`);
    }
    if (!shiftTypeId || shiftTypeId.trim() === '') {
      throw new Error('Invalid shiftTypeId: Cannot drop empty shift type.');
    }

    const newAssignment: ShiftAssignment = {
      id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: this.currentUserId || 'user-unassigned',
      userName: 'Assigned Staff',
      date,
      shiftTypeId,
      shiftTypeName,
      color,
      isCurrentUser: this.currentUserId !== null,
    };
    this.assignments.push(newAssignment);
    return newAssignment;
  }

  // --- Desktop Multi-Select Batch Assignment ---
  public toggleDateSelection(date: string): void {
    if (this.selectedDates.has(date)) {
      this.selectedDates.delete(date);
    } else {
      this.selectedDates.add(date);
    }
  }

  public selectDateRange(startDate: string, endDate: string): void {
    const days = this.get28Days();
    const startIdx = days.indexOf(startDate);
    const endIdx = days.indexOf(endDate);
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Invalid range selection: start or end date not found in current 28-day rotation.');
    }
    const min = Math.min(startIdx, endIdx);
    const max = Math.max(startIdx, endIdx);
    for (let i = min; i <= max; i++) {
      this.selectedDates.add(days[i]);
    }
  }

  public batchAssign(shiftTypeId: string, shiftTypeName: string = 'Batch Shift', color: string = 'bg-purple-500'): ShiftAssignment[] {
    if (!this.isScheduler) {
      throw new Error('Permission denied: Only schedulers can perform batch assignment.');
    }
    if (this.selectedDates.size === 0) {
      return [];
    }
    if (!shiftTypeId || shiftTypeId.trim() === '') {
      throw new Error('Invalid shiftTypeId for batch assign.');
    }

    const created: ShiftAssignment[] = [];
    const dates = Array.from(this.selectedDates);
    for (const date of dates) {
      const assignment: ShiftAssignment = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: 'user-batch',
        userName: 'Batch User',
        date,
        shiftTypeId,
        shiftTypeName,
        color,
      };
      this.assignments.push(assignment);
      created.push(assignment);
    }
    this.selectedDates.clear();
    return created;
  }

  // --- iPad / Mobile Touch Context Menu ---
  public openTouchMenu(date: string, targetShiftId?: string | null): void {
    const days = this.get28Days();
    if (!days.includes(date)) {
      throw new Error(`Cannot open touch menu for out-of-bounds date ${date}`);
    }
    this.touchMenu = { isOpen: true, date, targetShiftId: targetShiftId || null };
  }

  public closeTouchMenu(): void {
    this.touchMenu = { isOpen: false, date: null, targetShiftId: null };
  }

  // --- iPad / Mobile Copy & Paste Day Roster ---
  public copyDayRoster(sourceDate: string): ShiftAssignment[] {
    const days = this.get28Days();
    if (!days.includes(sourceDate)) {
      throw new Error(`Cannot copy roster: Source date ${sourceDate} is out of bounds.`);
    }
    const sourceAssignments = this.getAssignmentsForDate(sourceDate);
    this.copiedRosterDate = sourceDate;
    this.copiedRosterAssignments = sourceAssignments.map((a) => ({ ...a }));
    return this.copiedRosterAssignments;
  }

  public pasteDayRoster(targetDate: string): ShiftAssignment[] {
    if (!this.isScheduler) {
      throw new Error('Permission denied: Only schedulers can paste day roster.');
    }
    if (!this.copiedRosterDate) {
      throw new Error('No copied roster available to paste.');
    }
    if (targetDate === this.copiedRosterDate) {
      throw new Error('Cannot paste day roster onto the same source date.');
    }
    const days = this.get28Days();
    if (!days.includes(targetDate)) {
      throw new Error(`Target date ${targetDate} is out of bounds.`);
    }

    const pasted: ShiftAssignment[] = [];
    for (const sourceItem of this.copiedRosterAssignments) {
      const newItem: ShiftAssignment = {
        ...sourceItem,
        id: `pasted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: targetDate,
      };
      this.assignments.push(newItem);
      pasted.push(newItem);
    }
    return pasted;
  }

  // --- Day Inspector Actions ---
  public removeAssignment(assignmentId: string): void {
    if (!this.isScheduler) {
      throw new Error('Permission denied: Only schedulers can remove shift assignments.');
    }
    const index = this.assignments.findIndex((a) => a.id === assignmentId);
    if (index === -1) {
      throw new Error(`Assignment with ID ${assignmentId} not found.`);
    }
    this.assignments.splice(index, 1);
  }

  public editAssignment(assignmentId: string, updates: Partial<ShiftAssignment>): ShiftAssignment {
    if (!this.isScheduler) {
      throw new Error('Permission denied: Only schedulers can edit shift assignments.');
    }
    const assignment = this.assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      throw new Error(`Assignment with ID ${assignmentId} not found.`);
    }
    Object.assign(assignment, updates);
    return assignment;
  }
}
