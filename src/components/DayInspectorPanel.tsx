import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  FileText,
  Trash2,
  Edit3,
  Plus,
  Check,
  Sparkles,
  Layers,
  CheckCircle2,
  FileEdit,
  Tag,
  AlertCircle
} from 'lucide-react';
import { DayInspectorPanelProps, ShiftAssignment, User, ShiftTemplate, DoctorGroup, Holiday } from '../types';

export default function DayInspectorPanel({
  selectedDate,
  assignments,
  users = [],
  templates = [],
  groups = [],
  holidays = [],
  isOpen,
  onClose,
  isScheduler = false,
  onAddAssignment,
  onEditAssignment,
  onRemoveAssignment
}: DayInspectorPanelProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  if (!isOpen || !selectedDate) {
    return null;
  }

  // Parse local date
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const dateObj = parseLocalDate(selectedDate);
  const formattedDateStr = isNaN(dateObj.getTime())
    ? selectedDate
    : dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

  // Check for holiday
  const holiday = holidays.find(h => h.date === selectedDate);

  // Filter assignments for selected date
  const dayAssignments = assignments.filter(a => a.date === selectedDate);

  // Calculate shift hours helper
  const calculateShiftHours = (startTime?: string, endTime?: string): number => {
    if (!startTime || !endTime) return 8; // Default 8 hours
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(eH)) return 8;

    let startMinutes = sH * 60 + (sM || 0);
    let endMinutes = eH * 60 + (eM || 0);

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Midnight wrap-around
    }

    return parseFloat(((endMinutes - startMinutes) / 60).toFixed(1));
  };

  // Metrics Summary
  const totalShifts = dayAssignments.length;
  const totalHours = dayAssignments.reduce((sum, a) => sum + calculateShiftHours(a.startTime, a.endTime), 0);
  const publishedShiftsCount = dayAssignments.filter(a => a.status === 'published').length;
  const draftShiftsCount = dayAssignments.filter(a => a.status === 'draft' || !a.status).length;

  const handleStartEditNote = (assignment: ShiftAssignment) => {
    setEditingNoteId(assignment.id);
    setNoteText(assignment.notes || '');
  };

  const handleSaveNote = (assignmentId: string) => {
    if (onEditAssignment) {
      onEditAssignment(assignmentId, noteText);
    }
    setEditingNoteId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in"
      id="day-inspector-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative my-auto text-slate-100"
        id="day-inspector-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Calendar className="h-4 w-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Day Inspector
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-display leading-tight">
              {formattedDateStr}
            </h2>
            {holiday && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                <span>🎉</span>
                <span>Holiday: {holiday.name}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer"
            id="day-inspector-close-btn"
            title="Close Day Inspector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metrics Summary Header */}
        <div className="p-4 bg-white/[0.02] border-b border-white/10 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Assigned Staff
            </span>
            <span className="text-xl font-bold text-white font-mono mt-0.5 tabular-nums">
              {totalShifts}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Total Hours
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-0.5 tabular-nums">
              {totalHours}h
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Status Ratio
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold font-mono">
              <span className="text-amber-400" title="Draft shifts">{draftShiftsCount}D</span>
              <span className="text-slate-500">/</span>
              <span className="text-blue-400" title="Published shifts">{publishedShiftsCount}P</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Header for Schedulers */}
        {isScheduler && (
          <div className="px-5 py-3 border-b border-white/10 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-display">Staff Roster Breakdown</span>
            {onAddAssignment && (
              <button
                type="button"
                onClick={() => onAddAssignment(selectedDate)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                id="day-inspector-add-shift-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Shift</span>
              </button>
            )}
          </div>
        )}

        {/* Staff Roster Cards List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-thin">
          {dayAssignments.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <Calendar className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-300">No shifts assigned for this date</p>
              <p className="text-xs text-slate-400 mt-1">
                {isScheduler ? 'Click "Add Shift" above or drag shift templates onto this day cell.' : 'No scheduled duties available.'}
              </p>
            </div>
          ) : (
            dayAssignments.map((a) => {
              const hours = calculateShiftHours(a.startTime, a.endTime);

              // Find staff member and group details
              const staffUser = users.find(u => u.id === a.userId);
              const displayName = a.userName || staffUser?.name || 'Staff Doctor';
              
              const targetGroup = groups.find(g => g.id === a.targetGroupId);
              const groupName = targetGroup?.name || 'General';

              const isEditingNote = editingNoteId === a.id;

              return (
                <div
                  key={a.id}
                  className="rounded-2xl p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3 shadow-lg relative group"
                  style={{
                    borderLeft: `4px solid ${a.color || '#3b82f6'}`
                  }}
                  data-assignment-id={a.id}
                >
                  {/* Card Header: Doctor & Group info */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white font-display">
                          {displayName}
                        </span>
                        {a.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                          <Tag className="h-2.5 w-2.5 text-slate-400" />
                          <span>{groupName}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                          a.status === 'published'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {a.status || 'draft'}
                        </span>
                      </div>
                    </div>

                    {/* Template Badge & Hours */}
                    <div className="text-right">
                      <div className="inline-block px-2.5 py-1 rounded-xl text-xs font-extrabold border" style={{
                        backgroundColor: `${a.color || '#3b82f6'}20`,
                        borderColor: `${a.color || '#3b82f6'}50`,
                        color: '#ffffff'
                      }}>
                        {a.shiftTypeName}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 font-bold mt-1">
                        {hours} hrs scheduled
                      </div>
                    </div>
                  </div>

                  {/* Duty Time */}
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{a.startTime || '07:00'} – {a.endTime || '15:00'}</span>
                    </div>

                    {/* Scheduler Quick Action Buttons */}
                    {isScheduler && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditNote(a)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit Shift Note"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {onRemoveAssignment && (
                          <button
                            type="button"
                            onClick={() => onRemoveAssignment(a.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer border border-rose-500/20"
                            title="Delete Shift Assignment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes / Inline Note Editor */}
                  {isEditingNote ? (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Edit Shift Note</label>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={2}
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/20 p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Enter shift notes..."
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(a.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white"
                        >
                          <Check className="h-3 w-3" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    a.notes && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic leading-relaxed">{a.notes}</span>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between text-xs font-mono text-slate-400">
          <span>DutyFlow Roster Inspector</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-sans font-semibold transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
