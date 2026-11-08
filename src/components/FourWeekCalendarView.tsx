import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { FourWeekCalendarViewProps, ShiftAssignment } from '../types';

const dayLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(date + 'T00:00:00').toLocaleDateString('en-GB', options);

export default function FourWeekCalendarView({
  dates, assignments, currentUserId, onSelectDate, selectedDate, onDropShift,
  copiedRosterDate, selectedDates = [], onToggleSelectDate, onContextMenuDate, holidays = []
}: FourWeekCalendarViewProps) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [week, setWeek] = useState(0);
  const lastWeek = Math.max(0, Math.ceil(dates.length / 7) - 1);
  const activeWeek = Math.min(week, lastWeek);
  const weekDates = dates.slice(activeWeek * 7, activeWeek * 7 + 7);
  const byDate = new Map<string, ShiftAssignment[]>();
  const isMine = (assignment: ShiftAssignment) =>
    Boolean(assignment.isCurrentUser || assignment.userId === currentUserId);

  for (const assignment of assignments) {
    const day = byDate.get(assignment.date);
    if (day) day.push(assignment);
    else byDate.set(assignment.date, [assignment]);
  }

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
    <section aria-label="Calendar" className="min-w-0 space-y-3" id="four-week-calendar-view">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <button type="button" className="duty-control" aria-label="Previous week" disabled={activeWeek === 0} onClick={() => setWeek(activeWeek - 1)}>
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {weekDates.length ? weekDates.map((date, index) => index === 0 || index === weekDates.length - 1 ? dayLabel(date, { day: 'numeric', month: 'short' }) : '').filter(Boolean).join(' – ') : 'No dates'}
        </p>
        <button type="button" className="duty-control" aria-label="Next week" disabled={activeWeek >= lastWeek} onClick={() => setWeek(activeWeek + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      {copiedRosterDate && <p className="text-sm text-amber-200" role="status">Roster copied · {copiedRosterDate}</p>}
      <div className="hidden lg:grid grid-cols-7 gap-2 text-sm text-slate-300">
        {dates.slice(0, 7).map(date => <span key={date} className="px-2">{dayLabel(date, { weekday: 'short' })}</span>)}
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-7" id="calendar-28-day-grid">
        {dates.map((date, index) => {
          const day = byDate.get(date) ?? [];
          const sorted = [...day].sort((a, b) =>
            Number(isMine(b)) - Number(isMine(a)) ||
            (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
            a.shiftTypeName.localeCompare(b.shiftTypeName) ||
            a.userName.localeCompare(b.userName)
          );
          const groups = new Map<string, ShiftAssignment[]>();
          for (const assignment of sorted) {
            const key = assignment.shiftTypeId || assignment.shiftTypeName;
            const group = groups.get(key);
            if (group) group.push(assignment);
            else groups.set(key, [assignment]);
          }
          const preview = new Set(sorted.slice(0, Math.max(4, sorted.filter(isMine).length)));
          const hiddenCount = day.length - preview.size;
          const holiday = holidays.find(item => item.date === date);
          const isBatchSelected = selectedDates.includes(date);
          const isWeekend = [0, 6].includes(new Date(date + 'T00:00:00').getDay());
          return (
            <article
              key={date}
              data-date={date}
              className={`relative min-w-0 rounded-xl border p-2 lg:min-h-28 ${Math.floor(index / 7) !== activeWeek ? 'hidden lg:block' : ''} ${
                dragOverDate === date || selectedDate === date || isBatchSelected
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : holiday || isWeekend ? 'border-slate-700 bg-slate-800/80' : 'border-slate-800 bg-slate-900'
              }`}
              onDragOver={onDropShift ? event => handleDragOverCell(date, event) : undefined}
              onDragLeave={onDropShift ? event => handleDragLeaveCell(date, event) : undefined}
              onDrop={onDropShift ? event => handleDropOnCell(date, event) : undefined}
              onContextMenu={onContextMenuDate ? event => {
                event.preventDefault();
                onContextMenuDate(date, event);
              } : undefined}
            >
              <button
                type="button"
                className="absolute inset-0 w-full rounded-xl cursor-pointer"
                aria-label={`View roster for ${dayLabel(date, { dateStyle: 'full' })}, ${day.length} shifts${isBatchSelected ? ', selected for batch' : ''}`}
                onClick={event => handleCellClick(date, event)}
              />
              <div className="pointer-events-none relative flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">
                  <span className="lg:hidden">{dayLabel(date, { weekday: 'short' })} </span>
                  {dayLabel(date, { day: 'numeric', month: 'short' })}
                </p>
                {isBatchSelected && <Check size={14} aria-hidden="true" />}
                {onContextMenuDate && (
                  <button type="button" aria-label={`Actions for ${date}`} className="pointer-events-auto duty-control duty-icon" onClick={event => onContextMenuDate(date, event)}>
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
              <div className="pointer-events-none relative mt-2 space-y-2">
                {holiday && <p className="text-xs text-amber-200 [overflow-wrap:anywhere]">{holiday.name}</p>}
                {[...groups.entries()].map(([key, group]) => {
                  const visible = group.filter(assignment => preview.has(assignment));
                  if (!visible.length) return null;
                  return (
                    <div key={key} className="space-y-0.5">
                      <p className="flex items-baseline gap-1.5 text-sm font-semibold text-slate-100 [overflow-wrap:anywhere]">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group[0].color }} />
                        {group[0].shiftTypeName}
                      </p>
                      {visible.map(assignment => (
                        <p key={assignment.id} className={`rounded px-1.5 text-sm leading-snug [overflow-wrap:anywhere] ${isMine(assignment) ? 'bg-amber-400/15 font-semibold text-amber-100' : 'text-slate-200'}`}>
                          {assignment.userName}{isMine(assignment) && <span className="ml-1 text-xs">(You)</span>}
                          {assignment.status === 'draft' && <span className="ml-1 text-xs text-amber-200">Draft</span>}
                        </p>
                      ))}
                    </div>
                  );
                })}
                {!day.length && <p className="text-xs text-slate-400">No shifts</p>}
                {hiddenCount > 0 && <p className="text-xs font-semibold text-emerald-300">View {hiddenCount} more</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
