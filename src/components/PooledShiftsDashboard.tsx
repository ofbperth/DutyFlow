import React, { useState } from 'react';
import { User, ShiftTemplate, Shift, Availability, Holiday } from '../types';
import { ChevronLeft, ChevronRight, Layers, RefreshCw, AlertTriangle, Check, Plus, Trash2, FileText } from 'lucide-react';
import { saveShift, deleteShift, checkDoubleShift } from '../firebase';

interface PooledShiftsDashboardProps {
  currentUser: User;
  users: User[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  availabilities: Availability[];
  holidays: Holiday[];
  onRefresh: () => Promise<void>;
}

export default function PooledShiftsDashboard({
  currentUser,
  users,
  templates,
  shifts,
  availabilities,
  holidays,
  onRefresh
}: PooledShiftsDashboardProps) {
  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default to July 2026
  
  // Dragging states
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [isAssigningShiftKey, setIsAssigningShiftKey] = useState<string | null>(null);
  const [isRemovingShiftId, setIsRemovingShiftId] = useState<string | null>(null);

  // Shift Modal state
  const [activeShiftMenu, setActiveShiftMenu] = useState<Shift | null>(null);
  const [activeShiftNotes, setActiveShiftNotes] = useState<string>('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  React.useEffect(() => {
    if (activeShiftMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeShiftMenu]);

  const allowedPooledNames = ['รับบริจาคเลือด', 'เวรคอกเช้า', 'เวรคอกเที่ยง', 'เวรคอกเย็น', 'เวรคอกดึก', 'เวรคอกดึกดาวน์'];
  const pooledTemplates = templates.filter(t => allowedPooledNames.includes(t.name));

  const triggerStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  
  const datesArray = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

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

  const assignShift = async (userId: string, dateStr: string, templateId: string) => {
    if (checkDoubleShift(shifts, userId, dateStr, templateId, templates)) {
      const u = users.find(u => u.id === userId);
      triggerStatus(`Double shift is prohibited in this hospital. Dr. ${u?.name} is already assigned to a shift on ${dateStr}.`, 'error');
      return;
    }

    setIsAssigningShiftKey(`${userId}_${dateStr}`);
    try {
      const shiftId = `shift-${Date.now()}`;
      const newShift: Shift = {
        id: shiftId,
        userId,
        date: dateStr,
        templateId,
        status: 'draft',
        assignedBy: currentUser.id
      };
      await saveShift(newShift);
      await onRefresh();
      triggerStatus('Pooled shift assigned.');
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to assign shift', 'error');
    } finally {
      setIsAssigningShiftKey(null);
    }
  };

  const handleRemoveShift = async (shiftId: string) => {
    setIsRemovingShiftId(shiftId);
    try {
      await deleteShift(shiftId);
      handleOpenShiftMenu(null);
      await onRefresh();
      triggerStatus('Shift removed.');
    } catch (err: any) {
      triggerStatus(err.message || 'Failed to remove shift', 'error');
    } finally {
      setIsRemovingShiftId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto px-2 md:px-0 py-4" id="pooled-shifts-dashboard-root">
      {statusMsg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
          statusMsg.type === 'success'
            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="glass border border-white/10 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-lg font-bold text-slate-100 font-display w-40 text-center">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={handleNextMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 glass border border-white/10 rounded-2xl p-4 h-fit">
          <h2 className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4 text-blue-400" />
            Pooled Templates
          </h2>
          <div className="space-y-2">
            {pooledTemplates.map(t => (
              <div
                key={t.id}
                draggable
                onDragStart={() => handleDragStartTemplate(t.id)}
                className="py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-xs font-bold text-slate-200">{t.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{t.startTime} - {t.endTime}</div>
                </div>
              </div>
            ))}
            {pooledTemplates.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-xs">
                No pooled shift templates available.
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 space-y-4">
          <div className="glass border border-white/10 rounded-2xl overflow-x-auto shadow-inner">
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="p-4 text-xs font-bold text-slate-200 w-44 sticky left-0 bg-[#14112c]/95 backdrop-blur-md z-10 border-r border-white/10">
                    Clinical Staff
                  </th>
                  {datesArray.map(dateStr => {
                    const isHoliday = holidays.some(h => h.date === dateStr);
                    const dateObj = new Date(dateStr);
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
                {[...users].sort((a, b) => (a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0)).map(u => {
                  const isCurrentUser = u.id === currentUser.id;
                  return (
                  <tr key={u.id} className={`hover:bg-white/5 ${isCurrentUser ? 'bg-amber-500/5' : ''}`}>
                    <td className="p-3 sticky left-0 bg-[#14112c]/95 backdrop-blur-md z-10 border-r border-white/10">
                      <div className="text-xs font-bold text-slate-200">
                        {u.name}
                        {isCurrentUser && (
                          <span className="ml-1.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded uppercase tracking-wider">(YOU)</span>
                        )}
                      </div>
                    </td>
                    {datesArray.map(dateStr => {
                      const shift = shifts.find(s => s.userId === u.id && s.date === dateStr && pooledTemplates.some(t => t.id === s.templateId));
                      const isAssigningThisCell = isAssigningShiftKey === `${u.id}_${dateStr}`;
                      const isRemovingThisShift = shift && isRemovingShiftId === shift.id;

                      return (
                        <td
                          key={dateStr}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(u.id, dateStr)}
                          className={`p-1.5 text-center relative border-r border-white/5 ${
                            holidays.some(h => h.date === dateStr)
                              ? 'bg-blue-500/5'
                              : (new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }) === 'Sat' || new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }) === 'Sun')
                                ? 'bg-white/[0.02]'
                                : ''
                          }`}
                          style={{ height: '54px' }}
                        >
                          {isAssigningThisCell || isRemovingThisShift ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                            </div>
                          ) : shift ? (
                            <div
                              onClick={() => handleOpenShiftMenu(shift)}
                              className="group relative rounded-lg p-1.5 text-[10px] text-left transition-colors cursor-pointer border hover:brightness-110"
                              style={{ backgroundColor: (pooledTemplates.find(t => t.id === shift.templateId)?.color || '#333') + '20', borderColor: pooledTemplates.find(t => t.id === shift.templateId)?.color || '#555', color: '#fff' }}
                              title="Click for details"
                            >
                              <div className="font-extrabold truncate flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: pooledTemplates.find(t => t.id === shift.templateId)?.color }} />
                                {pooledTemplates.find(t => t.id === shift.templateId)?.name}
                                {shift.notes && <FileText className="h-3 w-3 opacity-80 shrink-0 ml-auto" />}
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                if (pooledTemplates.length > 0) {
                                  assignShift(u.id, dateStr, pooledTemplates[0].id);
                                }
                              }}
                              className="w-full h-full text-slate-500 hover:text-slate-300 flex items-center justify-center border border-dashed border-transparent hover:border-white/10 rounded-lg text-xs cursor-pointer"
                              title="Click to assign first pooled shift template or drop one here"
                            >
                              <Plus className="h-3.5 w-3.5 opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Shift detail modal */}
      {activeShiftMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
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
                    onClick={() => handleRemoveShift(activeShiftMenu.id)}
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
    </div>
  );
}
