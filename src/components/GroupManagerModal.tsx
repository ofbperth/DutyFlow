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

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800">Manage Doctor Groups</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {editingGroup ? (
            <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-slate-700">{editingGroup.id.startsWith('new') ? 'Create Group' : 'Edit Group'}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color (Hex/Tailwind)</label>
                  <input
                    type="text"
                    required
                    value={editingGroup.color}
                    onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Weekday Shift Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 17:00-07:00"
                    value={editingGroup.weekdayShiftTime || ''}
                    onChange={(e) => setEditingGroup({ ...editingGroup, weekdayShiftTime: e.target.value })}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Shift Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00-07:00"
                    value={editingGroup.holidayShiftTime || ''}
                    onChange={(e) => setEditingGroup({ ...editingGroup, holidayShiftTime: e.target.value })}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editingGroup.isUniversal || false}
                      onChange={(e) => setEditingGroup({ ...editingGroup, isUniversal: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    />
                    <span className="text-sm font-medium text-slate-700">Is Universal / General Shifts Group</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
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
                className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium mb-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <Plus size={16} /> Add New Group
              </button>

              <div className="grid gap-3">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-slate-300 bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                      <div>
                        <div className="font-semibold text-slate-800">
                          {group.name} 
                          {group.isUniversal && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Universal</span>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {group.weekdayShiftTime && `WD: ${group.weekdayShiftTime}`}
                          {group.weekdayShiftTime && group.holidayShiftTime && ' | '}
                          {group.holidayShiftTime && `Hol: ${group.holidayShiftTime}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this group?')) {
                            onDelete(group.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManagerModal;
