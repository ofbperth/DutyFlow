import React, { useState } from 'react';
import { User, DoctorGroup, GroupRotationAssignment } from '../types';
import { X, Save, GripVertical, Sparkles, Check, Users } from 'lucide-react';

interface Props {
  groups: DoctorGroup[];
  users: User[];
  assignments: GroupRotationAssignment[];
  periodId: string;
  onSave: (newAssignments: GroupRotationAssignment[], deletedIds?: string[]) => void;
  onClose: () => void;
}

const RotationRearrangerModal: React.FC<Props> = ({ groups, users, assignments, periodId, onSave, onClose }) => {
  // Local state for assignments: map of userId -> groupId
  const [userGroupMap, setUserGroupMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    assignments.forEach(a => {
      map[a.userId] = a.groupId;
    });
    return map;
  });

  // Drag and drop tracking state
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [activeDropGroup, setActiveDropGroup] = useState<string | null>(null);

  const handleGroupChange = (userId: string, newGroupId: string) => {
    setUserGroupMap(prev => ({ ...prev, [userId]: newGroupId }));
  };

  const handleSave = () => {
    const newAssignments: GroupRotationAssignment[] = [];
    const deletedIds: string[] = [];
    
    users.forEach((u, index) => {
      const groupId = userGroupMap[u.id] || '';
      const existingAssignment = assignments.find(a => a.userId === u.id);
      
      if (groupId === '') {
        if (existingAssignment) {
          deletedIds.push(existingAssignment.id);
        }
      } else {
        newAssignments.push({
          id: existingAssignment ? existingAssignment.id : `rot-${u.id}-${groupId || 'none'}`,
          periodId,
          groupId,
          userId: u.id,
          displayOrder: index
        });
      }
    });

    onSave(newAssignments, deletedIds);
  };

  // Group users by their current selected group
  const groupedUsers: Record<string, User[]> = {};
  groups.forEach(g => { groupedUsers[g.id] = []; });
  groupedUsers['unassigned'] = [];

  users.forEach(u => {
    const groupId = userGroupMap[u.id];
    if (groupId && groupedUsers[groupId]) {
      groupedUsers[groupId].push(u);
    } else {
      groupedUsers['unassigned'].push(u);
    }
  });

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 text-slate-100 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Rearrange Rotation Staff
                <Sparkles className="h-4 w-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">Drag and drop doctors into groups to reassign rotation staff for this period.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg shadow-lg shadow-teal-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
            >
              <Save className="h-4 w-4" /> Save Rotation
            </button>
          </div>
        </div>

        {/* Columns Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
            
            {/* Unassigned Column */}
            {(() => {
              const groupKey = '';
              const isDropActive = activeDropGroup === groupKey;
              return (
                <div 
                  className={`bg-slate-900/40 rounded-xl border flex flex-col h-full max-h-[70vh] transition-colors duration-200 ${
                    isDropActive 
                      ? 'ring-2 ring-teal-400/60 bg-teal-500/10 border-teal-500/50 shadow-lg shadow-teal-500/10' 
                      : 'border-white/10 bg-slate-900/40'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setActiveDropGroup(groupKey); }}
                  onDragLeave={() => { setActiveDropGroup(null); }}
                  onDrop={(e) => { e.preventDefault(); const uId = e.dataTransfer.getData('text/plain') || draggedUserId; if (uId) { handleGroupChange(uId, groupKey); } setDraggedUserId(null); setActiveDropGroup(null); }}
                >
                  <div className="p-3 border-b border-white/10 bg-slate-900/60 font-semibold text-slate-300 flex justify-between items-center rounded-t-xl">
                    <span className="text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Unassigned Doctors
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-white/10 font-mono tabular-nums">
                      {groupedUsers['unassigned'].length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-2">
                    {groupedUsers['unassigned'].map(user => {
                      const isDraggingThis = draggedUserId === user.id;
                      return (
                        <div 
                          key={user.id} 
                          draggable={true}
                          onDragStart={(e) => { setDraggedUserId(user.id); e.dataTransfer.setData('text/plain', user.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { setDraggedUserId(null); setActiveDropGroup(null); }}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors transition-transform ${
                            isDraggingThis 
                              ? 'opacity-40 scale-95 border-teal-500/50 bg-teal-500/10' 
                              : 'bg-slate-900/80 border-white/10 hover:border-white/20 text-slate-200 hover:bg-slate-800/80 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GripVertical className="h-4 w-4 text-slate-500 shrink-0" />
                            <span className="text-sm font-medium text-slate-200 truncate">{user.name}</span>
                          </div>
                        </div>
                      );
                    })}
                    {groupedUsers['unassigned'].length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-lg">
                        No unassigned doctors
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Group Columns */}
            {groups.map(group => {
              const groupKey = group.id;
              const isDropActive = activeDropGroup === groupKey;
              return (
                <div 
                  key={group.id} 
                  className={`bg-slate-900/40 rounded-xl border flex flex-col h-full max-h-[70vh] transition-colors duration-200 ${
                    isDropActive 
                      ? 'ring-2 ring-teal-400/60 bg-teal-500/10 border-teal-500/50 shadow-lg shadow-teal-500/10' 
                      : 'border-white/10 bg-slate-900/40'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setActiveDropGroup(groupKey); }}
                  onDragLeave={() => { setActiveDropGroup(null); }}
                  onDrop={(e) => { e.preventDefault(); const uId = e.dataTransfer.getData('text/plain') || draggedUserId; if (uId) { handleGroupChange(uId, groupKey); } setDraggedUserId(null); setActiveDropGroup(null); }}
                >
                  <div 
                    className="p-3 border-b border-white/10 bg-slate-900/60 font-semibold flex justify-between items-center rounded-t-xl"
                    style={{ borderTop: `3px solid ${group.color}` }}
                  >
                    <span className="text-sm font-semibold text-slate-200 truncate" title={group.name}>
                      {group.name}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-white/10 font-mono tabular-nums shrink-0">
                      {groupedUsers[group.id].length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-2">
                    {groupedUsers[group.id].map(user => {
                      const isDraggingThis = draggedUserId === user.id;
                      return (
                        <div 
                          key={user.id} 
                          draggable={true}
                          onDragStart={(e) => { setDraggedUserId(user.id); e.dataTransfer.setData('text/plain', user.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { setDraggedUserId(null); setActiveDropGroup(null); }}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors transition-transform ${
                            isDraggingThis 
                              ? 'opacity-40 scale-95 border-teal-500/50 bg-teal-500/10' 
                              : 'bg-slate-900/80 border-white/10 hover:border-white/20 text-slate-200 hover:bg-slate-800/80 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GripVertical className="h-4 w-4 text-slate-500 shrink-0" />
                            <span className="text-sm font-medium text-slate-200 truncate">{user.name}</span>
                          </div>
                        </div>
                      );
                    })}
                    {groupedUsers[group.id].length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-lg">
                        Empty Group
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotationRearrangerModal;
