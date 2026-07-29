import React, { useState } from 'react';
import { Calendar, LayoutGrid, Sparkles, Check, Copy, MoreVertical } from 'lucide-react';
import { FourWeekCalendarViewProps, ShiftAssignment } from '../types';

export default function FourWeekCalendarView({
  startDate,
  assignments,
  currentUserId,
  viewMode,
  onViewModeChange,
  onSelectDate,
  selectedDate,
  isScheduler = false,
  onDropShift,
  onBatchAssign,
  onCopyDayRoster,
  onPasteDayRoster,
  copiedRosterDate,
  selectedDates = [],
  onToggleSelectDate,
  onContextMenuDate,
  holidays = []
}: FourWeekCalendarViewProps) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Helper Date Parsing & Formatting
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

  // Generate all 28 days of the 4-week rotation
  const datesArray: string[] = [];
  const startObj = parseLocalDate(startDate);
  for (let i = 0; i < 28; i++) {
    const nextDate = new Date(startObj.getTime());
    nextDate.setDate(nextDate.getDate() + i);
    datesArray.push(formatDateLocal(nextDate));
  }

  // Day names for 7 column headers
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleCellClick = (dateStr: string, e: React.MouseEvent) => {
    // If Shift or Ctrl/Cmd key is pressed or onToggleSelectDate is supplied and we're in multi-select mode
    if ((e.shiftKey || e.ctrlKey || e.metaKey) && onToggleSelectDate) {
      onToggleSelectDate(dateStr);
    } else {
      onSelectDate(dateStr);
    }
  };

  const handleDragOverCell = (dateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeaveCell = (dateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleDropOnCell = (dateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
    const shiftTypeId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('shiftTypeId');
    if (shiftTypeId && onDropShift) {
      onDropShift(shiftTypeId, dateStr);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans four-week-grid-container" id="four-week-calendar-view">
      {/* Top Toolbar / View Switcher Header */}
      <div className="glass border border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Rotation Info */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              4-Week Rotation Cycle (28 Days)
            </div>
            <div className="text-sm font-bold text-slate-100 font-display">
              {datesArray[0]} — {datesArray[27]}
            </div>
          </div>
        </div>

        {/* View Switcher Toggle Buttons & Copied Roster Indicator */}
        <div className="flex items-center gap-3">
          {copiedRosterDate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse" id="copied-roster-badge">
              <Copy className="h-3.5 w-3.5" />
              <span>Roster Copied: {copiedRosterDate}</span>
            </div>
          )}

          <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl" id="view-switcher-toggle">
            <button
              type="button"
              onClick={() => onViewModeChange('calendar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="view-mode-calendar-btn"
            >
              <span>📅 4-Week Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('matrix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="view-mode-matrix-btn"
            >
              <span>📊 Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 Columns Day Headers */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold font-mono uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2">
        {dayHeaders.map((header, idx) => (
          <div
            key={header}
            className={`py-1.5 rounded-lg ${idx >= 5 ? 'text-blue-400 bg-blue-500/5' : 'bg-white/5'}`}
          >
            {header}
          </div>
        ))}
      </div>

      {/* 28-Day 7x4 Responsive Grid Container (Zero Side Scroll) */}
      <div className="grid grid-cols-7 gap-2 w-full overflow-hidden" id="calendar-28-day-grid">
        {datesArray.map((dateStr) => {
          const dateObj = parseLocalDate(dateStr);
          const dayNum = dateObj.getDate();
          const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
          
          const holiday = holidays.find(h => h.date === dateStr);
          const isSelected = selectedDate === dateStr;
          const isMultiSelected = selectedDates.includes(dateStr);
          const isCopiedSource = copiedRosterDate === dateStr;
          const isDragTarget = dragOverDate === dateStr;

          // Filter assignments for this specific date
          const dayAssignments = assignments.filter(a => a.date === dateStr);

          // Find if current user has an assigned shift on this date
          const currentUserShift = dayAssignments.find(
            a => (currentUserId && a.userId.toLowerCase().trim() === currentUserId.toLowerCase().trim()) || a.isCurrentUser
          );

          // Group shifts by shift template/type name for summary chips
          const shiftSummaryMap: Record<string, { typeName: string; color: string; count: number }> = {};
          dayAssignments.forEach(a => {
            const key = a.shiftTypeId || a.shiftTypeName;
            if (!shiftSummaryMap[key]) {
              shiftSummaryMap[key] = {
                typeName: a.shiftTypeName,
                color: a.color || '#3b82f6',
                count: 0
              };
            }
            shiftSummaryMap[key].count += 1;
          });

          const summaryList = Object.values(shiftSummaryMap);

          return (
            <div
              key={dateStr}
              onClick={(e) => handleCellClick(dateStr, e)}
              onContextMenu={(e) => {
                if (onContextMenuDate) {
                  e.preventDefault();
                  onContextMenuDate(dateStr, e);
                }
              }}
              onDragOver={(e) => handleDragOverCell(dateStr, e)}
              onDragLeave={(e) => handleDragLeaveCell(dateStr, e)}
              onDrop={(e) => handleDropOnCell(dateStr, e)}
              className={`min-h-[110px] sm:min-h-[135px] rounded-xl p-2 font-sans border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                isDragTarget
                  ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-500/20 scale-[1.02] shadow-xl'
                  : isSelected
                  ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                  : isMultiSelected
                  ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/10'
                  : isCopiedSource
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-800/80'
              }`}
              data-date={dateStr}
            >
              {/* Day Cell Header */}
              <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-xs sm:text-sm font-extrabold font-mono tabular-nums ${
                    holiday
                      ? 'text-rose-400'
                      : isWeekend
                      ? 'text-blue-400'
                      : 'text-slate-200'
                  }`}>
                    {dayNum}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
                    {monthShort}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {holiday && (
                    <span className="text-[8px] px-1 py-0.25 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 truncate max-w-[50px]" title={holiday.name}>
                      {holiday.name}
                    </span>
                  )}
                  {isMultiSelected && (
                    <span className="bg-indigo-500 text-white rounded p-0.5 text-[8px]" title="Selected in Batch">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {onContextMenuDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenuDate(dateStr, e);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Touch Menu Actions"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Day Cell Main Content */}
              <div className="my-1.5 space-y-1.5 flex-1 overflow-y-auto max-h-[85px] scrollbar-none">
                {/* Current User Glowing Highlight Badge ("YOU: Shift Name") */}
                {currentUserShift && (
                  <div
                    className="glow-user-shift rounded-lg p-1.5 bg-amber-500/20 border-2 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.6)] flex items-center justify-between"
                    title={`Assigned to ${currentUserShift.shiftTypeName}`}
                  >
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="font-extrabold text-[10px] sm:text-xs tracking-wide truncate">
                        YOU: {currentUserShift.shiftTypeName}
                      </span>
                    </div>
                    {currentUserShift.startTime && (
                      <span className="text-[8px] sm:text-[9px] font-mono opacity-80 shrink-0 ml-1">
                        {currentUserShift.startTime}
                      </span>
                    )}
                  </div>
                )}

                {/* Color-Coded Shift Summary Chips */}
                {summaryList.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {summaryList.map(summary => (
                      <div
                        key={summary.typeName}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0 max-w-full"
                        style={{
                          backgroundColor: `${summary.color}20`,
                          borderColor: `${summary.color}50`,
                          color: '#ffffff'
                        }}
                        title={`${summary.typeName}: ${summary.count} staff assigned`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: summary.color }} />
                        <span className="truncate max-w-[55px] sm:max-w-[75px]">{summary.typeName}</span>
                        <span className="px-1 rounded-full text-[8px] bg-white/20 font-mono font-bold">
                          {summary.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  !currentUserShift && (
                    <div className="text-[9px] text-slate-400 italic opacity-60 pt-1">
                      No shifts
                    </div>
                  )
                )}
              </div>

              {/* Day Cell Footer Stats */}
              <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span className="tabular-nums font-semibold">
                  {dayAssignments.length} staff
                </span>
                {isScheduler && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 font-bold text-[8px]">
                    + Shift
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
