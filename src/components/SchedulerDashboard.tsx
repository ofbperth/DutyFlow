import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  FileDown,
  Users,
  Check,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw,
  BarChart3,
  FileText,
  Filter
} from 'lucide-react';
import { User, Shift, ShiftTemplate, Availability, Holiday, SchedulePeriod, DoctorGroup, GroupRotationAssignment, CROSS_GROUP_RULES, getAllowedTargetGroupIdsForHomeGroup, ViewMode, ShiftAssignment } from '../types';
import FourWeekCalendarView from './FourWeekCalendarView';
import TouchContextMenu from './TouchContextMenu';
import BatchAssignModal from './BatchAssignModal';
import DayInspectorPanel from './DayInspectorPanel';
import AssignShiftModal from './AssignShiftModal';
import jsPDF from 'jspdf';
import { saveShift, deleteShift, checkDoubleShift, saveDoctorGroup, deleteDoctorGroup, updateUserGroupAssignment } from '../firebase';

interface SchedulerDashboardProps {
  currentUser: User;
  users: User[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  availabilities: Availability[];
  holidays: Holiday[];
  schedulePeriod: SchedulePeriod | null;
  groups: DoctorGroup[];
  rotationAssignments: GroupRotationAssignment[];
  onRefresh: () => Promise<void>;
}

export default function SchedulerDashboard({
  currentUser,
  users,
  templates,
  shifts,
  availabilities,
  holidays,
  schedulePeriod,
  groups,
  rotationAssignments,
  onRefresh
}: SchedulerDashboardProps) {

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default to July 2026
  
  // Modal states for Rotations & Shift Assignments
  const [showShiftBalance, setShowShiftBalance] = useState(false);
  const [assignModalData, setAssignModalData] = useState<{ isOpen: boolean; selectedDate: string; shiftTypeId: string } | null>(null);

  // Modal State for Click-to-Assign
  const [assigningCell, setAssigningCell] = useState<{ userId: string; dateStr: string } | null>(null);
  const [activeShiftMenu, setActiveShiftMenu] = useState<Shift | null>(null);
  const [activeShiftNotes, setActiveShiftNotes] = useState<string>('');

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dragging states
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);

  // Loading states for actions & buttons
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isAssigningShiftKey, setIsAssigningShiftKey] = useState<string | null>(null); // format: `${userId}_${dateStr}`
  const [isRemovingShiftId, setIsRemovingShiftId] = useState<string | null>(null);

  // Confirmation/Warning States to avoid iframe window.confirm blocking
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [conflictCell, setConflictCell] = useState<{ userId: string; dateStr: string; templateId: string } | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [draftCountToPublish, setDraftCountToPublish] = useState(0);

  // Inline assignment state
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  // Filter state
  const [showOnlyInvolved, setShowOnlyInvolved] = useState(true);

  // 4-Week Calendar View state
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Adaptive Controls State
  const [copiedRosterDate, setCopiedRosterDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [touchMenuDate, setTouchMenuDate] = useState<string | null>(null);
  const [showTouchMenu, setShowTouchMenu] = useState<boolean>(false);

  React.useEffect(() => {
    if (assigningCell || activeShiftMenu || conflictCell || showPublishConfirm || assignModalData || showShiftBalance) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [assigningCell, activeShiftMenu, conflictCell, showPublishConfirm, assignModalData, showShiftBalance]);


  const handleOpenShiftMenu = (shift: Shift | null) => {
    setActiveShiftMenu(shift);
    setActiveShiftNotes(shift?.notes || '');
    setShowRemoveConfirm(false);
  };

  const handleSaveNote = async () => {
    if (!activeShiftMenu) return;
    try {
      const updatedShift = { ...activeShiftMenu, notes: activeShiftNotes };
      await saveShift(updatedShift);
      await onRefresh();
      triggerStatus('Shift note saved.');
      setActiveShiftMenu(updatedShift);
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to save note', 'error');
    }
  };

  const triggerStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Date Calculation Helpers
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateLocal = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates: string[] = [];
    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);
    
    let current = new Date(start.getTime());
    while (current <= end) {
      dates.push(formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const activePeriod = schedulePeriod || {
    id: 'current',
    title: 'July 2026 Rotation Cycle',
    startDate: '2026-07-01',
    endDate: '2026-07-14'
  };

  const datesArray = getDatesInRange(activePeriod.startDate, activePeriod.endDate);




  // HTML5 Drag & Drop handlers
  const handleDragStartTemplate = (templateId: string, e?: React.DragEvent) => {
    setDraggedTemplateId(templateId);
    if (e && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', templateId);
      e.dataTransfer.setData('shiftTypeId', templateId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (userId: string, dateStr: string) => {
    if (!draggedTemplateId) return;
    await assignShift(userId, dateStr, draggedTemplateId);
    setDraggedTemplateId(null);
  };

  // Calendar Cell Drag & Drop Shift Handler
  const handleCalendarDropShift = async (templateId: string, dateStr: string) => {
    if (!templateId || templateId.trim() === '') {
      triggerStatus('Invalid shift template dropped.', 'error');
      return;
    }
    setAssignModalData({
      isOpen: true,
      selectedDate: dateStr,
      shiftTypeId: templateId
    });
  };

  // Multi-Select Date Selection Toggle
  const handleToggleSelectDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  // Multi-Select Batch Assignment Execution
  const handleBatchAssignShifts = async (dates: string[], templateId: string, userId?: string) => {
    if (!dates || dates.length === 0) return;
    const temp = templates.find(t => t.id === templateId);
    const targetUser = userId || currentUser.id;

    try {
      const promises = dates.map(d => {
        const newShift: Shift = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: targetUser,
          date: d,
          templateId,
          status: 'draft',
          assignedBy: currentUser.id,
          targetGroupId: temp?.groupId || 'group-universal'
        };
        return saveShift(newShift);
      });

      await Promise.all(promises);
      await onRefresh();
      setSelectedDates([]);
      triggerStatus(`Successfully assigned ${temp?.name || 'shift'} to ${dates.length} dates.`);
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to execute batch assign', 'error');
    }
  };

  // Copy Day Roster
  const handleCopyDayRoster = (sourceDate: string) => {
    const dayShifts = shifts.filter(s => s.date === sourceDate);
    setCopiedRosterDate(sourceDate);
    triggerStatus(`Copied day roster from ${sourceDate} (${dayShifts.length} shifts).`);
  };

  // Paste Day Roster
  const handlePasteDayRoster = async (targetDate: string) => {
    if (!copiedRosterDate) {
      triggerStatus('No copied roster available to paste.', 'error');
      return;
    }
    if (targetDate === copiedRosterDate) {
      triggerStatus('Cannot paste day roster onto the same source date.', 'error');
      return;
    }

    const sourceShifts = shifts.filter(s => s.date === copiedRosterDate);
    try {
      const promises = sourceShifts.map(s => {
        const newShift: Shift = {
          id: `pasted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: s.userId,
          date: targetDate,
          templateId: s.templateId,
          status: 'draft',
          assignedBy: currentUser.id,
          notes: s.notes,
          targetGroupId: s.targetGroupId
        };
        return saveShift(newShift);
      });

      await Promise.all(promises);
      await onRefresh();
      triggerStatus(`Pasted roster onto ${targetDate} (${sourceShifts.length} shifts).`);
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to paste day roster', 'error');
    }
  };

  // Clear Day Roster
  const handleClearDayRoster = async (dateStr: string) => {
    const targetShifts = shifts.filter(s => s.date === dateStr);
    if (targetShifts.length === 0) {
      triggerStatus(`No shifts to clear on ${dateStr}.`);
      return;
    }

    try {
      const promises = targetShifts.map(s => deleteShift(s.id));
      await Promise.all(promises);
      await onRefresh();
      triggerStatus(`Cleared all ${targetShifts.length} shift(s) on ${dateStr}.`);
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to clear day roster', 'error');
    }
  };

  // Touch Context Menu Trigger
  const handleContextMenuDate = (dateStr: string) => {
    setTouchMenuDate(dateStr);
    setShowTouchMenu(true);
  };

  // Core Shift Assignment Logic
  const assignShift = async (userId: string, dateStr: string, templateId: string, force = false) => {
    // Check Double Shift
    if (checkDoubleShift(shifts, userId, dateStr, templateId, templates)) {
      const u = users.find(u => u.id === userId);
      triggerStatus(`Double shift is prohibited in this hospital. Dr. ${u?.name} is already assigned to a shift on ${dateStr}.`, 'error');
      return;
    }

    // Check availability conflicts
    const avail = availabilities.find(a => a.userId === userId && a.date === dateStr);
    if (avail && avail.status === 'unavailable' && !force) {
      setConflictCell({ userId, dateStr, templateId });
      return;
    }

    setIsAssigningShiftKey(`${userId}_${dateStr}`);
    try {
      const temp = templates.find(t => t.id === templateId);
      const shiftId = `shift-${Date.now()}`;
      const newShift: Shift = {
        id: shiftId,
        userId,
        date: dateStr,
        templateId,
        status: 'draft', // Created as Draft by default
        assignedBy: currentUser.id,
        targetGroupId: temp?.groupId || 'group-universal'
      };

      await saveShift(newShift);
      await onRefresh();
      triggerStatus('Shift assigned to draft successfully.');
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to assign shift', 'error');
    } finally {
      setIsAssigningShiftKey(null);
    }
  };

  // Remove shift
  const handleRemoveShift = async (shift: Shift) => {
    setIsRemovingShiftId(shift.id);
    try {
      await deleteShift(shift.id);
      handleOpenShiftMenu(null);
      await onRefresh();
      triggerStatus('Shift assignment removed.');
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to remove shift', 'error');
    } finally {
      setIsRemovingShiftId(null);
    }
  };

  // Publish Schedule Trigger
  const handlePublishAll = () => {
    const draftShifts = shifts.filter(
      s => s.status === 'draft' &&
           s.date >= activePeriod.startDate &&
           s.date <= activePeriod.endDate
    );

    if (draftShifts.length === 0) {
      triggerStatus('No draft shifts found to publish for this rotation.', 'error');
      return;
    }

    setDraftCountToPublish(draftShifts.length);
    setShowPublishConfirm(true);
  };

  // Actual Publishing workflow run inside non-blocking modal confirmation
  const executePublishAll = async () => {
    const draftShifts = shifts.filter(
      s => s.status === 'draft' &&
           s.date >= activePeriod.startDate &&
           s.date <= activePeriod.endDate
    );


    if (draftShifts.length === 0) return;

    setIsPublishing(true);
    try {
      const promises = draftShifts.map(shift => {
        shift.status = 'published';
        return saveShift(shift);
      });
      await Promise.all(promises);

      await onRefresh();
      triggerStatus(`Successfully published ${draftShifts.length} shifts!`);
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to publish shifts', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF('landscape');

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`DutyFlow: Hospital Duty Schedule`, 14, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rotation: ${activePeriod.title} (${activePeriod.startDate} to ${activePeriod.endDate})`, 14, 28);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34);

      // Table Draw
      let currentY = 44;
      doc.setFontSize(8);

      // Header row
      doc.setFillColor(20, 30, 45); // Dark Slate background
      doc.rect(14, currentY, 270, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Staff Member', 16, currentY + 5);

      // Draw day indices (limit to fit page width or wrap)
      const colWidth = 230 / datesArray.length;
      datesArray.forEach((dateStr, index) => {
        const dateObj = parseLocalDate(dateStr);
        doc.text(String(dateObj.getDate()), 50 + (index * colWidth), currentY + 5);
      });

      currentY += 8;
      doc.setTextColor(50, 50, 50);

      // Rows for each user
      users.forEach((u, uIdx) => {
        // Alternating background
        if (uIdx % 2 === 1) {
          doc.setFillColor(245, 247, 250);
          doc.rect(14, currentY, 270, 7, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.text(u.name.substring(0, 15), 16, currentY + 5);
        doc.setFont('helvetica', 'normal');

        // Fill days
        datesArray.forEach((dateStr, dIdx) => {
          const shift = shifts.find(s => s.userId === u.id && s.date === dateStr);
          if (shift) {
            const temp = templates.find(t => t.id === shift.templateId);
            if (temp) {
              doc.text(temp.name.substring(0, 3), 50 + (dIdx * colWidth), currentY + 5);
            }
          }
        });

        currentY += 7;
        if (currentY > 185) {
          doc.addPage();
          currentY = 20;
        }
      });

      doc.save(`DutyFlow_Schedule_${activePeriod.title.replace(/\s+/g, '_')}.pdf`);
      triggerStatus('PDF exported successfully!');
    } catch (err: any) {
      console.error(err);
      triggerStatus('Failed to generate PDF document.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };


  // Group data
  const unassignedUsers = users.filter(u => {
    const assignment = rotationAssignments.find(a => a.userId === u.id);
    if (!assignment) return true;
    if (assignment.groupId === '' || assignment.groupId === 'unassigned') return true;
    const groupExists = groups.some(g => g.id === assignment.groupId);
    return !groupExists;
  });

  const groupsWithUsers = groups.map(g => {
    const homeUsers = users.filter(u => {
      const assignment = rotationAssignments.find(a => a.userId === u.id);
      return assignment && assignment.groupId === g.id;
    });

    const allowedHomeGroupsForTarget = CROSS_GROUP_RULES[g.id] || [];
    const outerUsers = users.filter(u => {
      const assignment = rotationAssignments.find(a => a.userId === u.id);
      const homeGroupId = assignment?.groupId;
      if (!homeGroupId || homeGroupId === g.id) return false;
      if (!allowedHomeGroupsForTarget.includes(homeGroupId)) return false;

      return shifts.some(s => {
        if (s.userId !== u.id || !datesArray.includes(s.date)) return false;
        const targetId = s.targetGroupId || templates.find(t => t.id === s.templateId)?.groupId;
        return targetId === g.id;
      });
    });

    return {
      group: g,
      users: [...homeUsers, ...outerUsers]
    };
  });

  const myInvolvedGroupIds = new Set(
    rotationAssignments.filter(a => a.userId === currentUser.id).map(a => a.groupId)
  );

  const isUserUnassigned = unassignedUsers.some(u => u.id === currentUser.id);
  const shouldShowUnassigned = !showOnlyInvolved || isUserUnassigned;

  const displayedGroupsWithUsers = groupsWithUsers.filter(g => 
    !showOnlyInvolved || myInvolvedGroupIds.has(g.group.id)
  );

  const myGroupId = rotationAssignments.find(a => a.userId === currentUser.id)?.groupId;

  let filteredDoctors: User[] = [];
  if (myGroupId) {
    const homeUsers = users.filter(u => {
      const assignment = rotationAssignments.find(a => a.userId === u.id);
      return assignment && assignment.groupId === myGroupId;
    });

    const allowedHomeGroupsForTarget = CROSS_GROUP_RULES[myGroupId] || [];
    const outerUsers = users.filter(u => {
      const assignment = rotationAssignments.find(a => a.userId === u.id);
      const homeGroupId = assignment?.groupId;
      if (!homeGroupId || homeGroupId === myGroupId) return false;
      if (!allowedHomeGroupsForTarget.includes(homeGroupId)) return false;

      return shifts.some(s => {
        if (s.userId !== u.id || !datesArray.includes(s.date)) return false;
        const targetId = s.targetGroupId || templates.find(t => t.id === s.templateId)?.groupId;
        return targetId === myGroupId;
      });
    });

    const combined = [...homeUsers, ...outerUsers];
    filteredDoctors = combined.filter((u, index, self) => self.findIndex(x => x.id === u.id) === index);
  } else {
    const groupDoctors = displayedGroupsWithUsers.flatMap(g => g.users);
    const uniqueGroupDoctors = groupDoctors.filter((u, index, self) => self.findIndex(x => x.id === u.id) === index);
    filteredDoctors = uniqueGroupDoctors.length > 0 ? uniqueGroupDoctors : users;
  }

  const filteredTemplates = templates.filter(t => {
    if (!myGroupId) return true;
    const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(myGroupId);

    if ((myGroupId === 'group-saraburi' || myGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
      return false;
    }

    const isAllowedForGroup =
      t.groupId === myGroupId ||
      t.groupId === 'group-pooled' ||
      !!t.isPooled ||
      allowedGroupIds.includes(t.groupId);
    
    const hasAssignedShift = shifts.some(
      s => s.templateId === t.id && datesArray.includes(s.date) && filteredDoctors.some(d => d.id === s.userId)
    );

    return isAllowedForGroup || hasAssignedShift;
  });


  const renderUserRow = (u: User, currentGroup?: DoctorGroup) => {
    const isCurrentUser = u.id === currentUser.id;
    const userShifts = shifts.filter(s => s.userId === u.id && datesArray.includes(s.date));
    const userAssignment = rotationAssignments.find(a => a.userId === u.id);
    const userHomeGroup = groups.find(g => g.id === userAssignment?.groupId);
    const isOuterDoctor = userHomeGroup && currentGroup && userHomeGroup.id !== currentGroup.id;
    const shiftTypeCounts: Record<string, number> = {};

    userShifts.forEach(s => {
      const t = templates.find(t => t.id === s.templateId);
      if (t) {
        const name = `${t.name} (${t.startTime}-${t.endTime})`;
        shiftTypeCounts[name] = (shiftTypeCounts[name] || 0) + 1;
      }
    });
    const totalShiftsCount = userShifts.length;
    const shiftTypeBreakdownTooltip = Object.entries(shiftTypeCounts)
      .map(([name, count]) => `${name}: ${count}`)
      .join('\n');

    return (
    <tr key={`${currentGroup?.id || 'unassigned'}-${u.id}`} className={`hover:bg-white/5 ${isCurrentUser ? 'bg-amber-500/5' : ''}`}>
      <td className="p-3 sticky left-0 bg-[#14112c]/95 backdrop-blur-md border-r border-white/10 font-medium text-slate-300 z-10">
        <div className="text-xs font-bold text-slate-200 flex items-center flex-wrap gap-1">
          <span>{u.name}</span>
          {isCurrentUser && (
            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded uppercase tracking-wider">(YOU)</span>
          )}
          {isOuterDoctor && (
            <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded" title={`Staff home group is ${userHomeGroup.name}`}>
              จาก {userHomeGroup.name}
            </span>
          )}
        </div>
        <div className="text-[9px] font-mono mt-0.5 flex items-center gap-1 text-slate-400 uppercase tracking-widest">
          {u.isVirtual ? (
            <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-1 rounded">VIRTUAL</span>
          ) : (
            <span className="text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-1 rounded">ACTIVE</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1" title={shiftTypeBreakdownTooltip}>
          <span className="text-[9px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 rounded">Total: {totalShiftsCount}</span>
          <span className="text-[9px] font-mono font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20 px-1 rounded cursor-help">Details</span>
        </div>
      </td>

      {datesArray.map(dateStr => {
        const shift = shifts.find(s => s.userId === u.id && s.date === dateStr);
        const avail = availabilities.find(a => a.userId === u.id && a.date === dateStr);
        let cellBorder = 'border-r border-white/5';
        let availTooltip = '';
        if (avail) {
          if (avail.status === 'unavailable') {
            cellBorder = 'border-r border-rose-500/20 bg-rose-500/10';
            availTooltip = `Unavailable${avail.notes ? `: ${avail.notes}` : ''}`;
          } else if (avail.status === 'preferred') {
            cellBorder = 'border-r border-blue-500/20 bg-blue-500/10';
            availTooltip = `Preferred Shift${avail.notes ? `: ${avail.notes}` : ''}`;
          }
        }
        const isAssigningThisCell = isAssigningShiftKey === `${u.id}_${dateStr}`;
        const isRemovingThisShift = shift && isRemovingShiftId === shift.id;
        return (
          <td
            key={dateStr}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(u.id, dateStr)}
            className={`p-1.5 text-center relative ${cellBorder}`}
            style={{ height: '54px' }}
            title={availTooltip || undefined}
          >
            {avail && avail.status === 'preferred' && (
              <div className="absolute top-1 right-1 text-blue-400 z-20 pointer-events-none" title={availTooltip}>
                <Sparkles className="h-3 w-3 fill-blue-400/40" />
              </div>
            )}
            {isAssigningThisCell || isRemovingThisShift ? (
              <div className="w-full h-full flex items-center justify-center">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              </div>
            ) : shift ? (
              (() => {
                const temp = templates.find(t => t.id === shift.templateId);
                const targetGroupId = shift.targetGroupId || temp?.groupId;
                const targetGroup = groups.find(g => g.id === targetGroupId);
                const isCrossGroupShift = targetGroupId && targetGroupId !== 'group-universal' && targetGroupId !== 'group-pooled' && userHomeGroup && targetGroupId !== userHomeGroup.id;
                return (
                  <div
                    onClick={() => handleOpenShiftMenu(shift)}
                    className="group relative rounded-lg p-1.5 text-[10px] text-left transition-colors hover:brightness-110 hover:border-white/40 cursor-pointer shadow-sm border flex flex-col justify-between"
                    style={{ backgroundColor: (temp?.color || '#333') + '20', borderColor: temp?.color || '#555', color: '#fff' }}
                    title={`${temp?.name || 'Shift'} (${temp?.startTime} - ${temp?.endTime}) - Group: ${targetGroup?.name || 'General'}`}
                  >
                    <div className="font-extrabold flex items-center justify-between gap-1 text-[10px]">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: temp?.color }} />
                        <span className="truncate">{temp?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {shift.notes && <FileText className="h-3 w-3 opacity-80 shrink-0" />}
                        <span className={`px-1 py-0.25 rounded text-[8px] font-mono tracking-wider font-semibold uppercase leading-none border ${
                          shift.status === 'published' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {shift.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] opacity-70 mt-0.5 font-mono tabular-nums">
                      {temp?.startTime} - {temp?.endTime}
                    </div>
                    {isCrossGroupShift && targetGroup && (
                      <div className="mt-1 text-[8px] font-extrabold px-1 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40 inline-flex items-center gap-0.5 self-start">
                        <span>🏷️</span>
                        <span>{targetGroup.name}</span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <button
                onClick={() => setAssigningCell({ userId: u.id, dateStr })}
                className="w-full h-full text-slate-500 hover:text-slate-300 flex items-center justify-center border border-dashed border-transparent hover:border-white/10 rounded-lg text-xs"
                title="Click to assign shift"
              >
                <Plus className="h-3.5 w-3.5 opacity-0 hover:opacity-100 transition-opacity" />
              </button>
            )}
            {!shift && !isAssigningThisCell && avail && (
              <div className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${avail.status === 'unavailable' ? 'bg-rose-500' : 'bg-emerald-500'}`} title={`Staff preference: ${availTooltip}`} />
            )}
          </td>
        );
      })}
    </tr>
  );
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto px-2 md:px-0 py-4" id="scheduler-dashboard-root">
      {/* Alert Banner */}
      {statusMsg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
          statusMsg.type === 'success'
            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`} id="scheduler-status-alert">
          {statusMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <h1 className="text-xl font-extrabold text-white font-display">Rotation Schedules</h1>
      </div>

      {/* Controller bar */}
      <div className="glass border border-white/10 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4" id="scheduler-controls">
        <div className="flex flex-wrap items-center gap-4">
          {/* Custom Rotation Period selector */}
          <div>
            <label className="block text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1 font-semibold">Active Rotation Period</label>
            <div className="flex flex-col bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-1.5 min-w-[200px]">
              <span className="text-xs font-bold text-slate-100 font-display">
                {activePeriod.title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activePeriod.startDate} to {activePeriod.endDate}
              </span>
            </div>
          </div>

          {/* Toggle Involved Groups Button */}
          <button
            type="button"
            onClick={() => setShowOnlyInvolved(!showOnlyInvolved)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              showOnlyInvolved
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10 hover:bg-emerald-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            id="toggle-involved-groups-btn"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>My Involved Groups Only</span>
            {showOnlyInvolved && (
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                ✓ Active
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher Toggle Buttons */}
          <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl" id="scheduler-view-switcher">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="scheduler-calendar-mode-btn"
            >
              📅 4-Week Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="scheduler-matrix-mode-btn"
            >
              📊 Matrix
            </button>
          </div>

          {/* Prominent Upper Panel Batch Assign Trigger */}
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/40 cursor-pointer transition-all hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            id="upper-panel-batch-assign-btn"
          >
            <Layers className="h-4 w-4" />
            <span>Batch Assign</span>
          </button>

          <button
            onClick={() => setShowShiftBalance(true)}
            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Shift Balance
          </button>
          <button
            disabled={isExportingPDF}
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            id="export-pdf-btn"
          >
            {isExportingPDF ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            {isExportingPDF ? 'Exporting PDF...' : 'Export Schedule (PDF)'}
          </button>

          {(currentUser.role === 'admin' || currentUser.role === 'scheduler') && (
            <>
              <button
                disabled={isPublishing}
                onClick={handlePublishAll}
                className="flex items-center gap-1.5 bg-blue-400 hover:bg-blue-300 active:bg-blue-500 disabled:bg-blue-950 disabled:text-blue-500 text-blue-950 px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                id="publish-schedule-btn"
              >
                {isPublishing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isPublishing ? 'Publishing...' : 'Publish Month Drafts'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workspace Grid Container */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6" id="scheduler-workspace">
        {/* Templates Sidebar */}
        <div className="xl:col-span-1 glass border border-white/10 rounded-2xl p-4 h-fit" id="templates-sidebar">
          <h2 className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2 font-semibold">
            Shift Templates
          </h2>
          <p className="text-[11px] text-slate-400 leading-normal mb-4">
            Drag templates from below onto a staff cell, or click on an empty cell in the scheduler matrix to assign duties.
          </p>

          <div className="space-y-4 max-h-80 xl:max-h-[600px] overflow-y-auto pr-1">
            {/* 1. General / Universal Templates */}
            {filteredTemplates.filter(t => !t.isPooled && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))).length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">General Templates</h3>
                <div className="space-y-1">
                  {filteredTemplates.filter(t => !t.isPooled && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))).map(t => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => handleDragStartTemplate(t.id)}
                      className="py-2 px-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="text-xs font-bold text-slate-200">{t.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums">{t.startTime} - {t.endTime}</div>
                      </div>
                      <div className="text-[9px] font-mono text-blue-400/80 uppercase tracking-widest font-bold">DRAG</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Group Specific Templates (Dynamically for all groups including สระบุรี, 1650, ICU, etc.) */}
            {groups.map(g => {
              const groupTemps = filteredTemplates.filter(t => !t.isPooled && t.groupId === g.id && !['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name));
              if (groupTemps.length === 0) return null;
              return (
                <div key={g.id}>
                  <h3 className="text-[10px] font-bold mt-3 mb-2 uppercase flex items-center gap-1.5" style={{ color: g.color || '#a855f7' }}>
                    <span>🏷️</span> {g.name} Templates
                  </h3>
                  <div className="space-y-1">
                    {groupTemps.map(t => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => handleDragStartTemplate(t.id)}
                        className="py-2 px-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/40 hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || g.color }} />
                            <span className="text-xs font-bold text-slate-200">{t.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums">{t.startTime} - {t.endTime}</div>
                        </div>
                        <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">DRAG</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 3. Special / Pooled Shifts */}
            {filteredTemplates.filter(t => t.isPooled || t.groupId === 'group-pooled').length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-amber-400 mt-3 mb-2 uppercase flex items-center gap-1.5">
                  <span>✨</span> Special / Pooled Shifts
                </h3>
                <div className="space-y-1">
                  {filteredTemplates.filter(t => t.isPooled || t.groupId === 'group-pooled').map(t => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => handleDragStartTemplate(t.id)}
                      className="py-2 px-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/40 hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="text-xs font-bold text-amber-200">{t.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums">{t.startTime} - {t.endTime}</div>
                      </div>
                      <div className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-bold">DRAG</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace Area (4-Week Calendar View vs Classic Matrix View) */}
        <div className="xl:col-span-3">
          {viewMode === 'calendar' ? (
            <FourWeekCalendarView
              startDate={activePeriod.startDate}
              assignments={shifts.map(s => {
                const user = users.find(u => u.id === s.userId);
                const template = templates.find(t => t.id === s.templateId);
                return {
                  id: s.id,
                  userId: s.userId,
                  userName: user?.name || 'Unknown Staff',
                  date: s.date,
                  shiftTypeId: s.templateId,
                  shiftTypeName: template?.name || 'Shift',
                  color: template?.color || '#3b82f6',
                  isCurrentUser: s.userId === currentUser.id,
                  startTime: template?.startTime,
                  endTime: template?.endTime,
                  status: s.status,
                  notes: s.notes,
                  targetGroupId: s.targetGroupId
                };
              })}
              currentUserId={currentUser.id}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSelectDate={(date) => setSelectedDate(date)}
              selectedDate={selectedDate}
              isScheduler={true}
              onDropShift={handleCalendarDropShift}
              onBatchAssign={handleBatchAssignShifts}
              onOpenBatchAssign={() => setShowBatchModal(true)}
              onCopyDayRoster={handleCopyDayRoster}
              onPasteDayRoster={handlePasteDayRoster}
              copiedRosterDate={copiedRosterDate}
              selectedDates={selectedDates}
              onToggleSelectDate={handleToggleSelectDate}
              onContextMenuDate={handleContextMenuDate}
              holidays={holidays}
            />
          ) : (
            <React.Fragment>
              <div className="sm:hidden text-[10px] text-slate-400 text-center mb-2 bg-white/5 py-1.5 rounded-lg border border-white/10">Swipe left/right to view full schedule</div>
              <div className="glass border border-white/10 rounded-2xl overflow-x-auto shadow-inner" id="schedule-matrix-container">
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="p-4 text-xs font-bold text-slate-200 w-44 sticky left-0 bg-[#14112c]/95 backdrop-blur-md z-10 border-r border-white/10">
                    Clinical Staff
                  </th>
                  {datesArray.map(dateStr => {
                    const isHoliday = holidays.some(h => h.date === dateStr);
                    const dateObj = parseLocalDate(dateStr);
                    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = dateObj.getDate();
                    const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun';

                    return (
                      <th
                        key={dateStr}
                        className={`p-2 text-center border-r border-white/10 min-w-12 ${
                          isHoliday
                            ? 'bg-blue-500/10 text-blue-400 font-semibold'
                            : isWeekend
                              ? 'bg-white/5 text-slate-400'
                              : 'text-slate-400'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-medium">{dayOfWeek}</div>
                        <div className="text-xs font-extrabold tabular-nums">{dayNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {displayedGroupsWithUsers.map(({ group, users: groupUsers }) => {
                  let totalGroupShifts = 0;
                  const shiftCounts: number[] = [];
                  
                  groupUsers.forEach(u => {
                    const uShifts = shifts.filter(s => s.userId === u.id && datesArray.includes(s.date));
                    totalGroupShifts += uShifts.length;
                    shiftCounts.push(uShifts.length);
                  });
                  
                  const avgShifts = groupUsers.length > 0 ? (totalGroupShifts / groupUsers.length).toFixed(1) : '0';
                  const maxShifts = shiftCounts.length > 0 ? Math.max(...shiftCounts) : 0;
                  const minShifts = shiftCounts.length > 0 ? Math.min(...shiftCounts) : 0;
                  const isBalanced = (maxShifts - minShifts) <= 1;

                  return (
                  <React.Fragment key={group.id}>
                    <tr className="bg-white/5">
                      <td colSpan={datesArray.length + 1} className="p-2 sticky left-0 z-10 border-r border-white/10" style={{ borderLeft: `4px solid ${group.color}` }}>
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{group.name}</span>
                            {group.isUniversal && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Universal</span>}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {groupUsers.length} doctors
                              {group.weekdayShiftTime ? ` | WD: ${group.weekdayShiftTime}` : ''}
                              {group.holidayShiftTime ? ` | Hol: ${group.holidayShiftTime}` : ''}
                            </span>
                          </div>
                          <div className="flex gap-2 mr-4 items-center">
                            <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Total Group Shifts: {totalGroupShifts} (Avg: {avgShifts})</span>
                            {groupUsers.length > 0 && (
                              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${isBalanced ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                {isBalanced ? '✅ Equal Distribution' : '⚠️ Shift Imbalance'}
                              </span>
                            )}
                            {!group.isUniversal && (
                              <div className="relative">
                                <button
                                  onClick={() => setAddingToGroupId(addingToGroupId === group.id ? null : group.id)}
                                  className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 transition-colors flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Add Doctor
                                </button>
                                {addingToGroupId === group.id && (
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Select Doctor</div>
                                    {users.filter(u => !groupUsers.find(gu => gu.id === u.id)).map(u => (
                                      <button
                                        key={u.id}
                                        onClick={async () => {
                                          try {
                                            await updateUserGroupAssignment(u.id, activePeriod.id, group.id);
                                            await onRefresh();
                                            setAddingToGroupId(null);
                                            triggerStatus(`${u.name} added to ${group.name}`);
                                          } catch (err: any) {
                                            triggerStatus(err.message, 'error');
                                          }
                                        }}
                                        className="w-full text-left text-xs p-1.5 hover:bg-white/10 rounded text-slate-200"
                                      >
                                        {u.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {groupUsers.length > 0 ? (
                      [...groupUsers].sort((a, b) => (a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0)).map(u => renderUserRow(u, group))
                    ) : (
                      <tr>
                        <td colSpan={datesArray.length + 1} className="p-4 text-center border-b border-white/5 bg-white/[0.02]">
                          <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <span className="text-xs text-slate-400">No doctors assigned to this group yet</span>
                            {!group.isUniversal && (
                              <button
                                onClick={() => setAddingToGroupId(addingToGroupId === group.id ? null : group.id)}
                                className="text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors"
                              >
                                + Add First Doctor to {group.name}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
                
                {shouldShowUnassigned && unassignedUsers.length > 0 && (
                  <React.Fragment>
                    <tr className="bg-white/5">
                      <td colSpan={datesArray.length + 1} className="p-2 sticky left-0 z-10 border-r border-white/10">
                        <span className="font-bold text-slate-400">Unassigned / General</span>
                      </td>
                    </tr>
                    {[...unassignedUsers].sort((a, b) => (a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0)).map(u => renderUserRow(u))}
                  </React.Fragment>
                )}
              </tbody>
            </table>
          </div>

          {/* Doctor Shift Summary / Workload Breakdown Table */}
          <div className="glass border border-white/10 rounded-2xl p-5 shadow-lg space-y-4" id="doctor-shift-breakdown-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-display flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Doctor Workload &amp; Shift Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shift count per doctor categorized by shift type for {activePeriod.title} ({activePeriod.startDate} to {activePeriod.endDate})
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-lg self-start sm:self-auto">
                {(() => {
                  const myGroup = myGroupId ? groups.find(g => g.id === myGroupId) : null;
                  return myGroup
                    ? <><span className="font-bold" style={{ color: myGroup.color }}>{myGroup.name}</span> · </>
                    : null;
                })()}
                Staff: <span className="text-white font-bold">{filteredDoctors.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-slate-300 font-semibold border-b border-white/10">
                    <th className="py-2.5 px-3">Doctor / Staff Member</th>
                    {filteredTemplates.map(t => (
                      <th key={t.id} className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span>{t.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center font-bold text-emerald-400">Total Shifts</th>
                    <th className="py-2.5 px-3 text-center">Status (Published / Draft)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDoctors.map(doctor => {
                    const doctorShifts = shifts.filter(s => s.userId === doctor.id && datesArray.includes(s.date));
                    const totalCount = doctorShifts.length;
                    const publishedCount = doctorShifts.filter(s => s.status === 'published').length;
                    const draftCount = doctorShifts.filter(s => s.status === 'draft').length;
                    const doctorHomeGroupId = rotationAssignments.find(a => a.userId === doctor.id)?.groupId;
                    const isOuterDoctor = !!myGroupId && doctorHomeGroupId !== myGroupId;

                    return (
                      <tr key={doctor.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">{doctor.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <span>{doctor.email || 'Virtual Staff'}</span>
                            {doctor.isVirtual ? (
                              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded">VIRTUAL</span>
                            ) : (
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 rounded font-semibold">ACTIVE</span>
                            )}
                            {isOuterDoctor && (
                              <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 rounded font-semibold">CROSS-GROUP</span>
                            )}
                          </div>
                        </td>
                        {filteredTemplates.map(t => {
                          const count = doctorShifts.filter(s => s.templateId === t.id).length;
                          return (
                            <td key={t.id} className="py-3 px-3 text-center tabular-nums">
                              {count > 0 ? (
                                <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-mono text-[11px]">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-extrabold text-slate-100 tabular-nums">
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            {totalCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-[11px] tabular-nums">
                          <span className="text-blue-400 font-semibold">{publishedCount} published</span>
                          {draftCount > 0 && (
                            <span className="text-amber-400 font-semibold ml-1.5">({draftCount} draft)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDoctors.length === 0 && (
                    <tr>
                      <td colSpan={filteredTemplates.length + 3} className="text-center py-6 text-slate-500 text-xs">
                        No staff members found for the selected department filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  </div>

      {/* Assigning Cell Modal Backdrop (R4) */}
      {assigningCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" id="assigning-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Assign Shift Assignment</h3>
              <p className="text-xs text-slate-400 mt-1">Select a template to assign to {users.find(u => u.id === assigningCell.userId)?.name} on {assigningCell.dateStr}.</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.filter(t => {
                const userAssignment = rotationAssignments.find(a => a.userId === assigningCell.userId);
                const userGroupId = userAssignment?.groupId;
                if (!userGroupId) return true;
                
                const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(userGroupId);

                if ((userGroupId === 'group-saraburi' || userGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
                  return false;
                }

                return (
                  t.groupId === userGroupId ||
                  t.groupId === 'group-pooled' ||
                  !!t.isPooled ||
                  allowedGroupIds.includes(t.groupId)
                );
              }).map(t => (
                <button
                  key={t.id}
                  onClick={async () => {
                    await assignShift(assigningCell.userId, assigningCell.dateStr, t.id);
                    setAssigningCell(null);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-white/10 hover:border-blue-500/60 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{t.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{t.startTime} - {t.endTime}</span>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                </button>
              ))}
              {templates.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">No shift templates found.</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAssigningCell(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift detail modal backdrop (R4) */}
      {activeShiftMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" id="shift-detail-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${
                activeShiftMenu.status === 'published' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {activeShiftMenu.status} shift
              </span>
              <h3 className="text-sm font-bold text-white mt-2 font-display">
                Shift: {templates.find(t => t.id === activeShiftMenu.templateId)?.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Assigned to: {users.find(u => u.id === activeShiftMenu.userId)?.name}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Date: {activeShiftMenu.date}
              </p>
              <div className="mt-4">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">SHIFT NOTES</label>
                <textarea
                  value={activeShiftNotes}
                  onChange={(e) => setActiveShiftNotes(e.target.value)}
                  placeholder="e.g. Covering for Dr. Smith"
                  className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-20"
                />
                <button
                  onClick={handleSaveNote}
                  className="mt-2 w-full px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Save Note
                </button>
              </div>
            </div>

            {showRemoveConfirm ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs space-y-2 mt-2">
                <p className="text-rose-300 font-semibold">Are you sure you want to delete this assignment?</p>
                <div className="flex gap-2">
                  <button
                    disabled={isRemovingShiftId === activeShiftMenu.id}
                    onClick={() => handleRemoveShift(activeShiftMenu)}
                    className="px-3 py-1.5 rounded-lg bg-rose-400 hover:bg-rose-300 text-rose-950 font-bold text-[11px] disabled:opacity-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    Yes, Remove
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-[11px] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    No, Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold py-2 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Assignment
                </button>

                <button
                  onClick={() => handleOpenShiftMenu(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Warning Modal Backdrop (R4) */}
      {conflictCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" id="conflict-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-amber-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Availability Conflict</h3>
                <p className="text-xs text-slate-300 mt-2">
                  <strong>{users.find(u => u.id === conflictCell.userId)?.name}</strong> has submitted <strong>"Unavailable"</strong> on <strong>{conflictCell.dateStr}</strong>.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Would you like to force schedule this shift anyway?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConflictCell(null)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                No, Cancel
              </button>
              <button
                onClick={async () => {
                  const { userId, dateStr, templateId } = conflictCell;
                  setConflictCell(null);
                  await assignShift(userId, dateStr, templateId, true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Yes, Force Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal Backdrop (R4) */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" id="publish-confirm-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-blue-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Publish Schedule</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Are you sure you want to publish <strong>{draftCountToPublish}</strong> draft shifts?
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Real users will have these shifts finalized and available in their calendar feed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowPublishConfirm(false);
                  setDraftCountToPublish(0);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                disabled={isPublishing}
                onClick={async () => {
                  setShowPublishConfirm(false);
                  setDraftCountToPublish(0);
                  await executePublishAll();
                }}
                className="px-4 py-2 rounded-xl bg-blue-400 hover:bg-blue-300 text-blue-950 text-xs font-bold transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                {isPublishing ? 'Publishing...' : 'Yes, Publish Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Direct Drag & Drop Staff Selector Modal (R1) */}
      <AssignShiftModal
        isOpen={Boolean(assignModalData?.isOpen)}
        onClose={() => setAssignModalData(null)}
        selectedDate={assignModalData?.selectedDate || null}
        shiftTypeId={assignModalData?.shiftTypeId || null}
        templates={filteredTemplates}
        users={users}
        groups={groups}
        rotationAssignments={rotationAssignments}
        onAssign={async (userId, dateStr, templateId) => {
          await assignShift(userId, dateStr, templateId);
        }}
      />

      {/* Shift Balance Overview Modal Backdrop (R4) */}
      {showShiftBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl p-5 max-w-[90vw] w-full space-y-4 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" /> Shift Balance Overview &amp; Shift Type Breakdown Matrix
              </h3>
              <button onClick={() => setShowShiftBalance(false)} className="text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="overflow-auto flex-1 space-y-4 pr-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-slate-300 font-semibold border-b border-white/10">
                    <th className="py-2.5 px-3 sticky left-0 bg-[#14112c]/95 z-10 border-r border-white/10">Doctor</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3 text-center border-x border-white/5">Total Shifts</th>
                    {filteredTemplates.map(t => (
                      <th key={t.id} className="py-2.5 px-3 text-center border-r border-white/5 min-w-[80px]" title={`${t.name} (${t.startTime}-${t.endTime})`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }}></span>
                          <span className="text-[10px] truncate max-w-[80px]">{t.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDoctors.map(u => {
                    const userShifts = shifts.filter(s => s.userId === u.id && datesArray.includes(s.date));
                    const shiftTypeCounts: Record<string, number> = {};
                    userShifts.forEach(s => {
                      const t = templates.find(t => t.id === s.templateId);
                      if (t) {
                        shiftTypeCounts[t.id] = (shiftTypeCounts[t.id] || 0) + 1;
                      }
                    });
                    const totalShiftsCount = userShifts.length;
                    const assignment = rotationAssignments.find(a => a.userId === u.id);
                    const group = groups.find(g => g.id === assignment?.groupId);
                    return (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="py-3 px-3 font-bold text-slate-200 sticky left-0 bg-[#14112c]/95 z-10 border-r border-white/10">{u.name}</td>
                        <td className="py-3 px-3 text-slate-400">{group?.name || 'Unassigned'}</td>
                        <td className="py-3 px-3 text-center tabular-nums text-purple-400 font-bold border-x border-white/5 bg-purple-500/5">{totalShiftsCount}</td>
                        {filteredTemplates.map(t => (
                          <td key={t.id} className="py-3 px-3 text-center tabular-nums text-slate-300 border-r border-white/5">
                            {shiftTypeCounts[t.id] ? (
                              <span className="px-2 py-0.5 bg-white/10 rounded-md font-bold text-white border border-white/10">{shiftTypeCounts[t.id]}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Floating Multi-Select Batch Assignment Bar */}
      {selectedDates.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/40 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-fade-in"
          id="floating-batch-action-bar"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 font-extrabold font-mono text-xs">
              {selectedDates.length}
            </div>
            <span className="text-xs font-bold text-slate-200">
              Date{selectedDates.length === 1 ? '' : 's'} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              id="open-batch-assign-modal-btn"
            >
              <span>⚡ Batch Assign Shifts</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDates([])}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              id="clear-selected-dates-btn"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Batch Assignment Modal */}
      <BatchAssignModal
        selectedDates={selectedDates}
        templates={filteredTemplates}
        users={users}
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onAssign={handleBatchAssignShifts}
      />

      {/* Touch Context Menu */}
      <TouchContextMenu
        date={touchMenuDate || ''}
        isOpen={showTouchMenu}
        onClose={() => setShowTouchMenu(false)}
        onInspectRoster={(date) => {
          setSelectedDate(date);
          setShowTouchMenu(false);
        }}
        onAddShift={(date) => {
          setAssignModalData({
            isOpen: true,
            selectedDate: date,
            shiftTypeId: filteredTemplates[0]?.id || ''
          });
          setShowTouchMenu(false);
        }}
        onCopyRoster={handleCopyDayRoster}
        onPasteRoster={handlePasteDayRoster}
        onClearRoster={handleClearDayRoster}
        canPaste={Boolean(copiedRosterDate && copiedRosterDate !== touchMenuDate)}
        isScheduler={true}
      />

      {/* Day Inspector Panel */}
      <DayInspectorPanel
        selectedDate={selectedDate}
        assignments={shifts.map(s => {
          const user = users.find(u => u.id === s.userId);
          const template = templates.find(t => t.id === s.templateId);
          return {
            id: s.id,
            userId: s.userId,
            userName: user?.name || 'Unknown Staff',
            date: s.date,
            shiftTypeId: s.templateId,
            shiftTypeName: template?.name || 'Shift',
            color: template?.color || '#3b82f6',
            isCurrentUser: s.userId === currentUser.id,
            startTime: template?.startTime,
            endTime: template?.endTime,
            status: s.status,
            notes: s.notes,
            targetGroupId: s.targetGroupId
          };
        })}
        users={users}
        templates={templates}
        groups={groups}
        holidays={holidays}
        isOpen={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        isScheduler={true}
        onAddAssignment={(dateStr) => {
          setAssignModalData({
            isOpen: true,
            selectedDate: dateStr,
            shiftTypeId: filteredTemplates[0]?.id || ''
          });
        }}
        onEditAssignment={async (assignmentId, notes) => {
          const targetShift = shifts.find(s => s.id === assignmentId);
          if (targetShift) {
            try {
              await saveShift({ ...targetShift, notes: notes || '' });
              await onRefresh();
              triggerStatus('Shift note updated successfully.');
            } catch (err: any) {
              triggerStatus(err.message || 'Failed to update note', 'error');
            }
          }
        }}
        onRemoveAssignment={async (assignmentId) => {
          const targetShift = shifts.find(s => s.id === assignmentId);
          if (targetShift) {
            try {
              await deleteShift(targetShift.id);
              await onRefresh();
              triggerStatus('Shift assignment removed.');
            } catch (err: any) {
              triggerStatus(err.message || 'Failed to remove assignment', 'error');
            }
          }
        }}
      />
    </div>
  );
}
