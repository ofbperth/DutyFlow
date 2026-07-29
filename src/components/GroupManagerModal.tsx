import React, { useState } from 'react';
import { DoctorGroup } from '../types';
import { X, Plus, Trash2, Edit } from 'lucide-react';

interface Props {
  groups: DoctorGroup[];
  onSave: (group: DoctorGroup) => void;
  onDelete: (groupId: string) => void;
  onClose: () => void;
}

const GroupManagerModal: React.FC<Props> = ({ groups, onSave, onDelete, onClose }) => {
  const [editingGroup, setEditingGroup] = useState<DoctorGroup | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      onSave(editingGroup);
      setEditingGroup(null);
    }
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 text-slate-100 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
          <h2 className="text-lg font-bold text-slate-100 font-display">Manage Doctor Groups</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {editingGroup ? (
            <form onSubmit={handleSave} className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-white/10">
              <h3 className="font-semibold text-slate-200">{editingGroup.id.startsWith('new') ? 'Create Group' : 'Edit Group'}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    className="w-full text-sm rounded-lg border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">Color (Hex/Tailwind)</label>
                  <input
                    type="text"
                    required
                    value={editingGroup.color}
                    onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                    className="w-full text-sm rounded-lg border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">Weekday Shift Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 17:00-07:00"
                    value={editingGroup.weekdayShiftTime || ''}
                    onChange={(e) => setEditingGroup({ ...editingGroup, weekdayShiftTime: e.target.value })}
                    className="w-full text-sm rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">Holiday Shift Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00-07:00"
                    value={editingGroup.holidayShiftTime || ''}
                    onChange={(e) => setEditingGroup({ ...editingGroup, holidayShiftTime: e.target.value })}
                    className="w-full text-sm rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingGroup.isUniversal || false}
                      onChange={(e) => setEditingGroup({ ...editingGroup, isUniversal: e.target.checked })}
                      className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    />
                    <span className="text-sm font-medium text-slate-300">Is Universal / General Shifts Group</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 font-semibold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Save Group
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-4">
              <button
                onClick={() => setEditingGroup({
                  id: `new-${Date.now()}`,
                  name: '',
                  color: '#3b82f6',
                  departmentId: 'dept-general'
                })}
                className="flex items-center justify-center gap-2 w-full py-3 mb-6 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <Plus size={16} /> Add New Group
              </button>

              <div className="grid gap-3">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-4 border border-white/10 rounded-xl hover:border-white/20 bg-white/5 shadow-sm transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                      <div>
                        <div className="font-semibold text-slate-200">
                          {group.name} 
                          {group.isUniversal && <span className="ml-2 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase">Universal</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {group.weekdayShiftTime && <span className="mr-2 px-1.5 py-0.5 bg-white/5 rounded border border-white/5 font-mono">WD: {group.weekdayShiftTime}</span>}
                          {group.holidayShiftTime && <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/5 font-mono">Hol: {group.holidayShiftTime}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this group?')) {
                            onDelete(group.id);
                          }
                        }}
                        className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {groups.length === 0 && (
                   <div className="text-center py-6 text-slate-500 text-sm">No groups defined.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManagerModal;

