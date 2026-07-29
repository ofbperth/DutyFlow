import React from 'react';
import { Eye, Plus, Copy, ClipboardPaste, Trash2, X, Calendar } from 'lucide-react';
import { TouchContextMenuProps } from '../types';

export default function TouchContextMenu({
  date,
  isOpen,
  onClose,
  onInspectRoster,
  onAddShift,
  onCopyRoster,
  onPasteRoster,
  onClearRoster,
  canPaste = false,
  isScheduler = false,
}: TouchContextMenuProps) {
  if (!isOpen || !date) return null;

  // Format date display
  const formatDateHeader = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleInspect = () => {
    onInspectRoster(date);
    onClose();
  };

  const handleAdd = () => {
    if (onAddShift) onAddShift(date);
    onClose();
  };

  const handleCopy = () => {
    if (onCopyRoster) onCopyRoster(date);
    onClose();
  };

  const handlePaste = () => {
    if (canPaste && onPasteRoster) {
      onPasteRoster(date);
    }
    onClose();
  };

  const handleClear = () => {
    if (onClearRoster) onClearRoster(date);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      id="touch-context-menu-backdrop"
    >
      <div
        className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        id="touch-context-menu-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Calendar className="h-5 w-5" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Date Actions
              </div>
              <div className="text-sm font-bold text-slate-100 font-display">
                {formatDateHeader(date)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            id="touch-menu-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Items List */}
        <div className="space-y-2">
          {/* 1. Inspect Day Roster */}
          <button
            type="button"
            onClick={handleInspect}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-slate-200 hover:text-emerald-300 font-semibold text-xs transition-all cursor-pointer group"
            id="touch-action-inspect"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Eye className="h-4 w-4" />
              </div>
              <span>Inspect Day Roster</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">
              View details →
            </span>
          </button>

          {/* Scheduler-only Actions */}
          {isScheduler && (
            <>
              {/* 2. Add Shift to Day */}
              <button
                type="button"
                onClick={handleAdd}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 text-slate-200 hover:text-blue-300 font-semibold text-xs transition-all cursor-pointer group"
                id="touch-action-add-shift"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>Add Shift to Day</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-400">
                  + Assign
                </span>
              </button>

              {/* 3. Copy Day Roster */}
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-slate-200 hover:text-amber-300 font-semibold text-xs transition-all cursor-pointer group"
                id="touch-action-copy-roster"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Copy className="h-4 w-4" />
                  </div>
                  <span>Copy Day Roster</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-400">
                  Copy duties
                </span>
              </button>

              {/* 4. Paste Day Roster */}
              <button
                type="button"
                disabled={!canPaste}
                onClick={handlePaste}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all group ${
                  canPaste
                    ? 'bg-white/5 hover:bg-purple-500/10 border-white/5 hover:border-purple-500/30 text-slate-200 hover:text-purple-300 cursor-pointer'
                    : 'bg-white/2 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                }`}
                id="touch-action-paste-roster"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      canPaste
                        ? 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </div>
                  <span>Paste Day Roster</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">
                  {canPaste ? 'Paste copied' : 'No copied roster'}
                </span>
              </button>

              {/* 5. Clear Day Roster */}
              <button
                type="button"
                onClick={handleClear}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 font-semibold text-xs transition-all cursor-pointer group"
                id="touch-action-clear-roster"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <span>Clear Day Roster</span>
                </div>
                <span className="text-[10px] font-mono text-rose-400/80">
                  Remove all
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
