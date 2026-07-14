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
  RefreshCw
} from 'lucide-react';
import { User, Shift, ShiftTemplate, Department, Availability, Holiday, SchedulePeriod } from '../types';
import jsPDF from 'jspdf';
import { saveShift, deleteShift } from '../firebase';

interface SchedulerDashboardProps {
  currentUser: User;
  users: User[];
  departments: Department[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  availabilities: Availability[];
  holidays: Holiday[];
  schedulePeriod: SchedulePeriod | null;
  onRefresh: () => Promise<void>;
  onQueueSync: (task: { shiftId: string; action: 'create' | 'update' | 'delete'; calendarId: string }) => void;
}

export default function SchedulerDashboard({
  currentUser,
  users,
  departments,
  templates,
  shifts,
  availabilities,
  holidays,
  schedulePeriod,
  onRefresh,
  onQueueSync
}: SchedulerDashboardProps) {

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    currentUser.departmentId === 'all' ? 'all' : (currentUser.departmentId || 'dept-general')
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default to July 2026

  // Modal State for Click-to-Assign
  const [assigningCell, setAssigningCell] = useState<{ userId: string; dateStr: string } | null>(null);
  const [activeShiftMenu, setActiveShiftMenu] = useState<Shift | null>(null);

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

  const handleOpenShiftMenu = (shift: Shift | null) => {
    setActiveShiftMenu(shift);
    setShowRemoveConfirm(false);
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

  // Filter staff: show staff assigned to the selected department, OR staff who are in "all" departments.
  // If selectedDeptId is 'all', show all staff!
  const deptUsers = users.filter(u => selectedDeptId === 'all' || u.departmentId === 'all' || u.departmentId === selectedDeptId);

  // Filter templates: show templates for the selected department, plus any universal templates (departmentId === 'all' or 'dept-general').
  // If selectedDeptId is 'all', show all templates.
  const deptTemplates = templates.filter(t => selectedDeptId === 'all' || t.departmentId === 'all' || t.departmentId === 'dept-general' || !t.departmentId || t.departmentId === selectedDeptId);


  // HTML5 Drag & Drop handlers
  const handleDragStartTemplate = (templateId: string) => {
    setDraggedTemplateId(templateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (userId: string, dateStr: string) => {
    if (!draggedTemplateId) return;
    await assignShift(userId, dateStr, draggedTemplateId);
    setDraggedTemplateId(null);
  };

  // Core Shift Assignment Logic
  const assignShift = async (userId: string, dateStr: string, templateId: string, force = false) => {
    // Check if user is already scheduled for this date
    const existing = shifts.find(s => s.userId === userId && s.date === dateStr);
    if (existing) {
      triggerStatus('Staff member is already assigned to a shift on this date.', 'error');
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
      let shiftDeptId = selectedDeptId === 'all' ? (temp?.departmentId || 'dept-general') : selectedDeptId;
      if (shiftDeptId === 'all' || shiftDeptId === 'dept-general') {
        const targetUser = users.find(u => u.id === userId);
        shiftDeptId = (targetUser && targetUser.departmentId !== 'all') ? targetUser.departmentId : 'dept-general';
      }
      const shiftId = `shift-${Date.now()}`;
      const newShift: Shift = {
        id: shiftId,
        userId,
        date: dateStr,
        templateId,
        status: 'draft', // Created as Draft by default
        departmentId: shiftDeptId,
        assignedBy: currentUser.id
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
      // If it was published, we need to queue a deletion task for their calendar!
      if (shift.status === 'published') {
        const assignedUser = users.find(u => u.id === shift.userId);
        if (assignedUser && assignedUser.googleCalendarId && shift.googleCalendarEventId) {
          onQueueSync({
            shiftId: shift.id,
            action: 'delete',
            calendarId: assignedUser.googleCalendarId
          });
        }
      }

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
      s => (selectedDeptId === 'all' || s.departmentId === selectedDeptId) &&
           s.status === 'draft' &&
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
      s => (selectedDeptId === 'all' || s.departmentId === selectedDeptId) &&
           s.status === 'draft' &&
           s.date >= activePeriod.startDate &&
           s.date <= activePeriod.endDate
    );


    if (draftShifts.length === 0) return;

    setIsPublishing(true);
    try {
      for (const shift of draftShifts) {
        shift.status = 'published';
        await saveShift(shift);

        // Queue for Google Calendar Sync
        const assignedUser = users.find(u => u.id === shift.userId);
        if (assignedUser && !assignedUser.isVirtual && assignedUser.googleCalendarId) {
          onQueueSync({
            shiftId: shift.id,
            action: 'create',
            calendarId: assignedUser.googleCalendarId
          });
        }
      }

      await onRefresh();
      triggerStatus(`Successfully published ${draftShifts.length} shifts to Google Calendar queue!`);
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
      const deptName = departments.find(d => d.id === selectedDeptId)?.name || 'Hospital Ward';

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`DutyFlow: Hospital Duty Schedule`, 14, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ward: ${deptName}  |  Rotation: ${activePeriod.title} (${activePeriod.startDate} to ${activePeriod.endDate})`, 14, 28);
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
      deptUsers.forEach((u, uIdx) => {
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

      doc.save(`DutyFlow_Schedule_${deptName.replace(/\s+/g, '_')}_${activePeriod.title.replace(/\s+/g, '_')}.pdf`);
      triggerStatus('PDF exported successfully!');
    } catch (err: any) {
      console.error(err);
      triggerStatus('Failed to generate PDF document.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
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


          {/* Ward selector */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1 font-semibold">WARD</label>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Wards</option>
              {departments.map(d => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isExportingPDF}
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            <button
              disabled={isPublishing}
              onClick={handlePublishAll}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/15 transition-all cursor-pointer disabled:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              id="publish-schedule-btn"
            >
              {isPublishing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isPublishing ? 'Publishing...' : 'Publish Month Drafts'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6" id="scheduler-workspace">
        {/* Templates Sidebar */}
        <div className="xl:col-span-1 glass border border-white/10 rounded-2xl p-4 h-fit" id="templates-sidebar">
          <h2 className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4 text-blue-400" />
            Duty Templates Palette
          </h2>
          <p className="text-[11px] text-slate-400 leading-normal mb-4">
            Drag templates from below onto a staff cell, or click on an empty cell in the scheduler matrix to assign duties.
          </p>

          <div className="space-y-2 max-h-80 xl:max-h-[600px] overflow-y-auto pr-1">
            {deptTemplates.map(t => (
              <div
                key={t.id}
                draggable
                onDragStart={() => handleDragStartTemplate(t.id)}
                className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-grab active:cursor-grabbing flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-xs font-bold text-slate-200">{t.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{t.startTime} - {t.endTime}</div>
                </div>
                <div className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-semibold">DRAG</div>
              </div>
            ))}
            {deptTemplates.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-xs">
                No shift templates configured. Head to Admin view to create templates.
              </div>
            )}
          </div>
        </div>

        {/* Scheduler Board */}
        <div className="xl:col-span-3 space-y-4">
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
                        <div className="text-xs font-extrabold">{dayNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {deptUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/5">
                    {/* User profile col */}
                    <td className="p-3 sticky left-0 bg-[#14112c]/95 backdrop-blur-md border-r border-white/10 font-medium text-slate-300 z-10">
                      <div className="text-xs font-bold text-slate-200">{u.name}</div>
                      <div className="text-[9px] font-mono mt-0.5 flex items-center gap-1 text-slate-400 uppercase tracking-widest">
                        {u.isVirtual ? (
                          <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-1 rounded">VIRTUAL</span>
                        ) : (
                          <span className="text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-1 rounded">ACTIVE</span>
                        )}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {datesArray.map(dateStr => {
                      const shift = shifts.find(s => s.userId === u.id && s.date === dateStr);
                      const avail = availabilities.find(a => a.userId === u.id && a.date === dateStr);

                      // Determine availability styles
                      let cellBorder = 'border-r border-white/5';
                      let availTooltip = '';
                      if (avail) {
                        if (avail.status === 'unavailable') {
                          cellBorder = 'border-r border-rose-500/20 bg-rose-500/10';
                          availTooltip = 'Unavailable';
                        } else if (avail.status === 'preferred') {
                          cellBorder = 'border-r border-blue-500/20 bg-blue-500/10';
                          availTooltip = 'Preferred Shift';
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
                        >
                          {isAssigningThisCell || isRemovingThisShift ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                            </div>
                          ) : shift ? (
                            (() => {
                              const temp = templates.find(t => t.id === shift.templateId);
                              return (
                                <div
                                  onClick={() => handleOpenShiftMenu(shift)}
                                  className="group relative rounded-lg p-1.5 text-[10px] text-left transition-all hover:scale-105 cursor-pointer shadow-sm border"
                                  style={{
                                    backgroundColor: (temp?.color || '#333') + '20',
                                    borderColor: temp?.color || '#555',
                                    color: '#fff'
                                  }}
                                  title={`${temp?.name || 'Shift'} (${temp?.startTime} - ${temp?.endTime}) - Status: ${shift.status}`}
                                >
                                  <div className="font-extrabold truncate flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: temp?.color }} />
                                    {temp?.name}
                                  </div>
                                  <div className="text-[8px] opacity-70 mt-0.5 font-mono">
                                    {temp?.startTime} - {temp?.endTime}
                                    {(selectedDeptId === 'all' || shift.departmentId !== selectedDeptId) && (() => {
                                      const sd = departments.find(d => d.id === shift.departmentId);
                                      return sd ? ` • ${sd.name}` : '';
                                    })()}
                                  </div>
                                  <span className={`absolute bottom-1 right-1 px-1 rounded text-[7px] font-mono tracking-wider font-semibold uppercase ${
                                    shift.status === 'published' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {shift.status}
                                  </span>
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

                          {/* Small Availability indicator dots */}
                          {!shift && !isAssigningThisCell && avail && (
                            <div
                              className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
                                avail.status === 'unavailable' ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              title={`Staff preference: ${availTooltip}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assignment Modal for Mobile/Click */}
      {assigningCell && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="assigning-modal">
          <div className="glass border border-white/10 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Assign Shift Assignment</h3>
              <p className="text-xs text-slate-400 mt-1">Select a template to assign to {users.find(u => u.id === assigningCell.userId)?.name} on {assigningCell.dateStr}.</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {deptTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={async () => {
                    await assignShift(assigningCell.userId, assigningCell.dateStr, t.id);
                    setAssigningCell(null);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-white/10 hover:border-blue-500/60 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{t.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{t.startTime} - {t.endTime}</span>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                </button>
              ))}
              {deptTemplates.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">No shift templates found.</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAssigningCell(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift detail modal */}
      {activeShiftMenu && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="shift-detail-modal">
          <div className="glass border border-white/10 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
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
            </div>

            {showRemoveConfirm ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs space-y-2 mt-2">
                <p className="text-rose-300 font-semibold">Are you sure you want to delete this assignment?</p>
                <div className="flex gap-2">
                  <button
                    disabled={isRemovingShiftId === activeShiftMenu.id}
                    onClick={() => handleRemoveShift(activeShiftMenu)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] disabled:opacity-50"
                  >
                    Yes, Remove
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-[11px]"
                  >
                    No, Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold py-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Assignment
                </button>

                <button
                  onClick={() => handleOpenShiftMenu(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Warning Modal */}
      {conflictCell && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="conflict-modal">
          <div className="glass border border-amber-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
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
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                No, Cancel
              </button>
              <button
                onClick={async () => {
                  const { userId, dateStr, templateId } = conflictCell;
                  setConflictCell(null);
                  await assignShift(userId, dateStr, templateId, true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-semibold"
              >
                Yes, Force Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="publish-confirm-modal">
          <div className="glass border border-blue-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
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
                  Real users will have these shifts finalized and synced to their Google Calendar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowPublishConfirm(false);
                  setDraftCountToPublish(0);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Yes, Publish Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
