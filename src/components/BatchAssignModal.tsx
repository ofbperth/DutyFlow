import React, { useState } from 'react';
import { Layers, Calendar, User as UserIcon, X, Check, RefreshCw } from 'lucide-react';
import { BatchAssignModalProps } from '../types';

export default function BatchAssignModal({
  selectedDates,
  templates,
  users,
  isOpen,
  onClose,
  onAssign,
}: BatchAssignModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;

    setIsSubmitting(true);
    try {
      await onAssign(
        selectedDates,
        selectedTemplateId,
        selectedUserId ? selectedUserId : undefined
      );
      onClose();
    } catch (err) {
      console.error('Batch assignment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onClose}
      id="batch-assign-modal-backdrop"
    >
      <div
        className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        id="batch-assign-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-display">
                Batch Assign Shifts
              </h2>
              <p className="text-xs text-slate-400">
                Assigning to{' '}
                <span className="font-bold text-indigo-400 font-mono">
                  {selectedDates.length} selected date{selectedDates.length === 1 ? '' : 's'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            id="batch-modal-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected Dates Badges Summary */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
            Target Dates:
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/5">
            {selectedDates.sort().map((dateStr) => (
              <span
                key={dateStr}
                className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-semibold"
              >
                {dateStr}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Shift Template Picker */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
              Select Shift Template <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-400'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tpl.color || '#3b82f6' }}
                        />
                        <span className="text-xs font-bold truncate">{tpl.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums">
                        {tpl.startTime} - {tpl.endTime}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-400 shrink-0 ml-1" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Staff Member Selector (Optional) */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
              Target Staff Member <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-xs rounded-xl border border-white/10 bg-slate-800 py-2.5 pl-9 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                id="batch-assign-user-select"
              >
                <option value="">-- Assign to Scheduler / Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900">
                    {u.name} {u.isVirtual ? '(Virtual)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              id="batch-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTemplateId || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              id="batch-submit-btn"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? 'Assigning...' : `Assign Shifts (${selectedDates.length} Days)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
