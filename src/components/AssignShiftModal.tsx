import React, { useState, useEffect } from 'react';
import { User, ShiftTemplate, DoctorGroup, GroupRotationAssignment } from '../types';
import { Users, X, Calendar, Clock, Check, RefreshCw, Search } from 'lucide-react';

export interface AssignShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  shiftTypeId: string | null;
  templates: ShiftTemplate[];
  users: User[];
  groups?: DoctorGroup[];
  rotationAssignments?: GroupRotationAssignment[];
  onAssign: (userId: string, dateStr: string, templateId: string) => Promise<void>;
}

export default function AssignShiftModal({
  isOpen,
  onClose,
  selectedDate,
  shiftTypeId,
  templates,
  users,
  groups = [],
  rotationAssignments = [],
  onAssign
}: AssignShiftModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(shiftTypeId || '');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (shiftTypeId) {
      setSelectedTemplateId(shiftTypeId);
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [shiftTypeId, templates]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
      setSearchQuery('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !selectedDate) return null;

  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // Format date display
  const formatDateHeader = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleSelectUser = async (userId: string) => {
    if (!selectedTemplateId || !selectedDate) return;
    setSelectedUserId(userId);
    setIsSubmitting(true);
    try {
      await onAssign(userId, selectedDate, selectedTemplateId);
      onClose();
    } catch (err) {
      console.error('Assign shift error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onClose}
      id="assign-shift-modal-backdrop"
    >
      <div
        className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        id="assign-shift-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-display">
                Select Staff Member for Shift
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span>{formatDateHeader(selectedDate)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            id="assign-modal-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected Shift Template Picker (Always Interactive) */}
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
              Select Shift Template <span className="text-emerald-400">*</span>:
            </label>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Date: {selectedDate}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 scrollbar-thin">
            {templates.map((t) => {
              const isSelected = selectedTemplateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color || '#3b82f6' }}
                      />
                      <span className="text-xs font-bold truncate">{t.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{t.startTime} - {t.endTime}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0 ml-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff member by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-white/10 bg-slate-800 py-2.5 pl-9 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Available Staff Members List */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
            Choose Staff Member ({filteredUsers.length}):
          </label>
          
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const userAssignment = rotationAssignments.find(a => a.userId === u.id);
              const userGroup = groups.find(g => g.id === userAssignment?.groupId);
              const isSelected = selectedUserId === u.id;

              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectUser(u.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate">{u.name}</span>
                      {u.isVirtual ? (
                        <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VIRTUAL
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>{u.email || 'Virtual Staff'}</span>
                      {userGroup && (
                        <span className="text-purple-300 font-semibold" style={{ color: userGroup.color }}>
                          • {userGroup.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSubmitting && isSelected ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-400 shrink-0 ml-2" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg shrink-0 ml-2">
                      Assign
                    </span>
                  )}
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs italic">
                No staff members match the search query.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
