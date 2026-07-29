import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Calendar,
  Layers,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
  Edit2,
  X,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { User, ShiftTemplate, Holiday, Role, SchedulePeriod, DoctorGroup, GroupRotationAssignment } from '../types';
import {
  saveUser,
  saveShiftTemplate,
  saveHoliday,
  saveSchedulePeriod,
  deleteShiftTemplate,
  deleteHoliday,
  deleteUser,
  updateUserGroupAssignment,
  saveRotationAssignments,
  deleteRotationAssignment,
  resetUserGroupAssignmentsForNewRotation
} from '../firebase';
import RotationRearrangerModal from './RotationRearrangerModal';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  templates: ShiftTemplate[];
  holidays: Holiday[];
  schedulePeriod: SchedulePeriod | null;
  groups: DoctorGroup[];
  rotationAssignments: GroupRotationAssignment[];
  onRefresh: () => Promise<void>;
}

export default function AdminDashboard({
  currentUser,
  users,
  templates,
  holidays,
  schedulePeriod,
  groups,
  rotationAssignments,
  onRefresh
}: AdminDashboardProps) {

  // Shift Template state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateStart, setNewTemplateStart] = useState('08:00');
  const [newTemplateEnd, setNewTemplateEnd] = useState('16:00');
  const [newTemplateColor, setNewTemplateColor] = useState('#10b981');
  const [newTemplateGroupId, setNewTemplateGroupId] = useState('');

  // Holiday state
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Virtual User state
  const [virtualName, setVirtualName] = useState('');
  const [virtualGroup, setVirtualGroup] = useState('unassigned');

  // Convert Virtual User state
  const [selectedVirtualUser, setSelectedVirtualUser] = useState<User | null>(null);
  const [conversionEmail, setConversionEmail] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Loading states for every single button & action
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [isCreatingVirtualUser, setIsCreatingVirtualUser] = useState(false);
  const [isConvertingUser, setIsConvertingUser] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Confirmation states to avoid iframe window.confirm blocking
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplate | null>(null);
  const [virtualUserToDelete, setVirtualUserToDelete] = useState<User | null>(null);
  const [realUserToDelete, setRealUserToDelete] = useState<User | null>(null);

  // Rotation Rearranger Modal state
  const [showRearrangeModal, setShowRearrangeModal] = useState(false);
  const [isSavingRotation, setIsSavingRotation] = useState(false);

  // Schedule Period state
  const [periodTitle, setPeriodTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);

  useEffect(() => {
    if (schedulePeriod) {
      setPeriodTitle(schedulePeriod.title);
      setPeriodStart(schedulePeriod.startDate);
      setPeriodEnd(schedulePeriod.endDate);
    }
  }, [schedulePeriod]);

  useEffect(() => {
    if (templateToDelete || virtualUserToDelete || realUserToDelete || showRearrangeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [templateToDelete, virtualUserToDelete, realUserToDelete, showRearrangeModal]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const handleSaveRotation = async (newAssignments: GroupRotationAssignment[], deletedIds?: string[]) => {
    setIsSavingRotation(true);
    try {
      await saveRotationAssignments(newAssignments);
      if (deletedIds && deletedIds.length > 0) {
        await Promise.all(deletedIds.map(id => deleteRotationAssignment(id)));
      }
      await onRefresh();
      setShowRearrangeModal(false);
    } catch (err: any) {
      console.error('Failed to save rotation assignments:', err);
    } finally {
      setIsSavingRotation(false);
    }
  };

  // Save Schedule Period / Rotations
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodTitle.trim()) {
      triggerError('Please provide a rotation title.');
      return;
    }
    if (!periodStart) {
      triggerError('Please select a start date.');
      return;
    }
    if (!periodEnd) {
      triggerError('Please select an end date.');
      return;
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      triggerError('Start date cannot be after end date.');
      return;
    }

    setIsSavingPeriod(true);
    try {
      await saveSchedulePeriod({
        id: 'current',
        title: periodTitle.trim(),
        startDate: periodStart,
        endDate: periodEnd
      });
      await resetUserGroupAssignmentsForNewRotation();
      await onRefresh();
      triggerSuccess('Rotation schedule period updated successfully!');
    } catch (err: any) {
      console.error(err);
      triggerError(err.message || 'Failed to update schedule period.');
    } finally {
      setIsSavingPeriod(false);
    }
  };

  // Add Shift Template
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      triggerError('Please provide a template name.');
      return;
    }
    if (!newTemplateGroupId) {
      triggerError('Please select a group for the template.');
      return;
    }

    setIsAddingTemplate(true);
    try {
      const id = `temp-${Date.now()}`;
      const newTemp: ShiftTemplate = {
        id,
        name: newTemplateName.trim(),
        startTime: newTemplateStart,
        endTime: newTemplateEnd,
        color: newTemplateColor,
        groupId: newTemplateGroupId
      };
      await saveShiftTemplate(newTemp);
      setNewTemplateName('');
      await onRefresh();
      triggerSuccess('Shift Template added successfully!');
    } catch (err: any) {
      triggerError(err.message || 'Failed to add template');
    } finally {
      setIsAddingTemplate(false);
    }
  };

  // Delete Template Trigger
  const handleDeleteTemplate = (id: string) => {
    const temp = templates.find(t => t.id === id);
    if (temp) {
      setTemplateToDelete(temp);
    }
  };

  // Actual execution of template deletion
  const executeDeleteTemplate = async (id: string) => {
    setDeletingTemplateId(id);
    try {
      await deleteShiftTemplate(id);
      await onRefresh();
      triggerSuccess('Template deleted.');
    } catch (err: any) {
      triggerError(err.message || 'Delete failed');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // Add Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;

    setIsAddingHoliday(true);
    try {
      const id = `hol-${Date.now()}`;
      const newHol: Holiday = {
        id,
        date: newHolidayDate,
        name: newHolidayName.trim()
      };
      await saveHoliday(newHol);
      setNewHolidayName('');
      setNewHolidayDate('');
      await onRefresh();
      triggerSuccess('Holiday added successfully!');
    } catch (err: any) {
      triggerError(err.message || 'Failed to add holiday');
    } finally {
      setIsAddingHoliday(false);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string) => {
    setDeletingHolidayId(id);
    try {
      await deleteHoliday(id);
      await onRefresh();
      triggerSuccess('Holiday removed.');
    } catch (err: any) {
      triggerError(err.message || 'Delete failed');
    } finally {
      setDeletingHolidayId(null);
    }
  };

  // Delete Virtual User Trigger
  const handleDeleteVirtualUser = (user: User) => {
    setVirtualUserToDelete(user);
  };

  // Actual execution of virtual user deletion
  const executeDeleteVirtualUser = async (id: string) => {
    setDeletingUserId(id);
    try {
      await deleteUser(id);
      await onRefresh();
      triggerSuccess('Virtual user removed.');
    } catch (err: any) {
      triggerError(err.message || 'Failed to remove user');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Actual execution of active staff user deletion
  const executeDeleteRealUser = async (id: string) => {
    setDeletingUserId(id);
    try {
      await deleteUser(id);
      await onRefresh();
      triggerSuccess('Active staff member removed successfully.');
    } catch (err: any) {
      triggerError(err.message || 'Failed to remove staff member');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Create Virtual User
  const handleCreateVirtualUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!virtualName.trim()) {
      triggerError('Name is required for virtual users.');
      return;
    }

    setIsCreatingVirtualUser(true);
    try {
      const id = `virtual-${Date.now()}`;
      const newUser: User = {
        id,
        name: virtualName.trim(),
        email: '',
        role: 'user',
        isVirtual: true,
        createdAt: new Date().toISOString()
      };
      await saveUser(newUser);
      if (virtualGroup && virtualGroup !== 'unassigned') {
         await updateUserGroupAssignment(id, 'current', virtualGroup);
      }
      setVirtualName('');
      setVirtualGroup('unassigned');
      await onRefresh();
      triggerSuccess(`Virtual User "${newUser.name}" created!`);
    } catch (err: any) {
      triggerError(err.message || 'Failed to create virtual user');
    } finally {
      setIsCreatingVirtualUser(false);
    }
  };

  // Convert Virtual User to Real User
  const handleConvertUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVirtualUser || !conversionEmail.trim()) return;

    setIsConvertingUser(true);
    try {
      // Find if email is already taken by a real user
      const exists = users.find(u => u.email.toLowerCase() === conversionEmail.trim().toLowerCase());
      if (exists) {
        triggerError('A user with this email address already exists on DutyFlow.');
        return;
      }

      // Convert virtual to real user
      const updatedUser: User = {
        ...selectedVirtualUser,
        email: conversionEmail.trim().toLowerCase(),
        isVirtual: false
      };

      await saveUser(updatedUser);
      setSelectedVirtualUser(null);
      setConversionEmail('');
      await onRefresh();
      triggerSuccess(`Successfully converted "${updatedUser.name}" to real user!`);
    } catch (err: any) {
      triggerError(err.message || 'Failed to convert user');
    } finally {
      setIsConvertingUser(false);
    }
  };

  // Change user role
  const handleUpdateUserRole = async (userId: string, role: Role) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    setUpdatingUserId(userId);
    try {
      const updated: User = {
        ...targetUser,
        role
      };
      await saveUser(updated);
      await onRefresh();
      triggerSuccess('User permissions updated.');
    } catch (err: any) {
      triggerError(err.message || 'Failed to update user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const virtualUsers = users.filter(u => u.isVirtual);
  const realUsers = users.filter(u => !u.isVirtual);

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto px-2 md:px-0 py-6" id="admin-dashboard-root">
      {/* Messages */}
      {successMsg && (
        <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-4 text-xs text-teal-400 flex items-center gap-2 animate-fade-in" id="admin-success-alert">
          <UserCheck className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-400 flex items-center gap-2 animate-fade-in" id="admin-error-alert">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="glass border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden" id="admin-header-panel">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">Admin Duty Console</h1>
            <p className="text-xs text-slate-300 mt-1">Configure predefined templates, statutory holidays, doctor groups, and hospital staff memberships.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRearrangeModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 text-xs font-semibold transition shadow"> <RefreshCw className="h-3.5 w-3.5" /> Rearrange Rotation Staff </button>
            <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-mono text-indigo-300">
              <Layers className="h-3.5 w-3.5" />
              ADMIN PRIVILEGES ACTIVE
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8" id="admin-grid-layout">
        {/* Left Column: Management Forms */}
        <div className="lg:col-span-2 space-y-8">

          {/* Shift Scheduling Period Form */}
          <div className="glass border border-white/10 rounded-2xl p-5 shadow" id="scheduling-period-card">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Clock className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white font-display">Rotation Schedule Period</h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Set the active rotation name and a specific date range for shift scheduling (not restricted to calendar months).
            </p>
            <form onSubmit={handleSavePeriod} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">ROTATION TITLE / NAME</label>
                <input
                  type="text"
                  placeholder="e.g., Rotation Cycle Alpha"
                  value={periodTitle}
                  onChange={e => setPeriodTitle(e.target.value)}
                  className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">START DATE</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={e => setPeriodStart(e.target.value)}
                    className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">END DATE</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={e => setPeriodEnd(e.target.value)}
                    className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSavingPeriod}
                className="w-full flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:bg-emerald-950 disabled:text-emerald-500 text-emerald-950 font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed text-xs shadow-lg shadow-emerald-500/15"
              >
                {isSavingPeriod ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 text-emerald-950" />
                )}
                {isSavingPeriod ? 'Saving...' : 'Update Rotation Period'}
              </button>
            </form>
          </div>

          {/* Shift Templates Form */}
          <div className="glass border border-white/10 rounded-2xl p-5 shadow" id="template-management-card">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Layers className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white font-display">Add Shift Template</h2>
            </div>
            <form onSubmit={handleAddTemplate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">TEMPLATE NAME</label>
                <input
                  type="text"
                  placeholder="e.g., ICU Night Shift"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="picker-container rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 focus-within:border-indigo-500 cursor-pointer transition-colors relative">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 select-none">START TIME</label>
                  <div className="text-xs text-white select-none font-medium">{newTemplateStart || '--:--'}</div>
                  <input
                    type="time"
                    value={newTemplateStart}
                    onChange={e => setNewTemplateStart(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="picker-container rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 focus-within:border-indigo-500 cursor-pointer transition-colors relative">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 select-none">END TIME</label>
                  <div className="text-xs text-white select-none font-medium">{newTemplateEnd || '--:--'}</div>
                  <input
                    type="time"
                    value={newTemplateEnd}
                    onChange={e => setNewTemplateEnd(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">COLOR</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTemplateColor}
                    onChange={e => setNewTemplateColor(e.target.value)}
                    className="h-8 w-12 rounded border border-white/10 bg-white/5 p-0.5 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-mono">{newTemplateColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">DOCTOR GROUP</label>
                <select
                  required
                  value={newTemplateGroupId}
                  onChange={e => setNewTemplateGroupId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-white/10 bg-slate-900 p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Select a Group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isAddingTemplate}
                className="w-full flex items-center justify-center gap-2 bg-indigo-400 hover:bg-indigo-300 active:bg-indigo-500 disabled:bg-indigo-950 disabled:text-indigo-500 text-indigo-950 font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed text-xs shadow-lg shadow-indigo-500/15"
              >
                {isAddingTemplate ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 text-indigo-950" />
                )}
                {isAddingTemplate ? 'Adding Template...' : 'Add Template'}
              </button>
            </form>
          </div>

          {/* Holiday Form */}
          <div className="glass border border-white/10 rounded-2xl p-5 shadow" id="holiday-management-card">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Calendar className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white font-display">Add Hospital Holiday</h2>
            </div>
            <form onSubmit={handleAddHoliday} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">HOLIDAY NAME</label>
                <input
                  type="text"
                  placeholder="e.g., Christmas Break"
                  value={newHolidayName}
                  onChange={e => setNewHolidayName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">DATE</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={e => setNewHolidayDate(e.target.value)}
                  onClick={(e) => { try { (e.target as any).showPicker(); } catch (err) {} }}
                  className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingHoliday}
                className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-300 active:bg-blue-500 disabled:bg-blue-950 disabled:text-blue-500 text-blue-950 font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed text-xs shadow-lg shadow-blue-500/15"
              >
                {isAddingHoliday ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 text-blue-950" />
                )}
                {isAddingHoliday ? 'Adding Holiday...' : 'Add Holiday'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Lists, Virtual User Controls, Staff Management */}
        <div className="lg:col-span-3 space-y-8">
          {/* Virtual User Management & Converter */}
          <div className="glass border border-white/10 rounded-2xl p-5 shadow" id="virtual-users-card">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white font-display">Virtual Staff & Converter</h2>
              </div>
              <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 uppercase tracking-widest font-medium">
                {virtualUsers.length} Virtual Profiles
              </span>
            </div>

            {/* Sub-grid: Virtual user creator & list side-by-side or block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Creator */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-200">Create Virtual Profile</h3>
                <form onSubmit={handleCreateVirtualUser} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">DISPLAY NAME</label>
                    <input
                      type="text"
                      placeholder="e.g., Dr. Maya Okonkwo"
                      value={virtualName}
                      onChange={e => setVirtualName(e.target.value)}
                      className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">DOCTOR GROUP</label>
                    <select
                      value={virtualGroup}
                      onChange={e => setVirtualGroup(e.target.value)}
                      className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-slate-200 focus:outline-none"
                    >
                      <option value="unassigned" className="bg-slate-900 text-slate-200">Unassigned</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id} className="bg-slate-900 text-slate-200">{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingVirtualUser}
                    className="w-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:bg-amber-950 disabled:text-amber-500 text-amber-950 font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed text-xs shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                  >
                    {isCreatingVirtualUser ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isCreatingVirtualUser ? 'Generating Profile...' : 'Generate Virtual User'}
                  </button>
                </form>
              </div>

              {/* Conversion module if selected */}
              <div className="py-2">
                <h3 className="text-xs font-semibold text-slate-200 mb-2">Convert to Active Log-in</h3>
                {selectedVirtualUser ? (
                  <form onSubmit={handleConvertUser} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-medium text-amber-400">{selectedVirtualUser.name}</span>
                      <button type="button" onClick={() => setSelectedVirtualUser(null)} className="text-slate-500 hover:text-white cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">ENTER GOOGLE EMAIL ADDRESS</label>
                      <input
                        type="email"
                        required
                        placeholder="user@example.com"
                        value={conversionEmail}
                        onChange={e => setConversionEmail(e.target.value)}
                        className="w-full text-xs rounded-lg border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal mt-1.5">Converting this profile links it to their Google email. When they sign in, they inherit their scheduled duties.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={isConvertingUser}
                      className="w-full bg-blue-400 hover:bg-blue-300 disabled:bg-blue-950 disabled:text-blue-500 text-blue-950 font-bold py-2.5 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {isConvertingUser ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : null}
                      {isConvertingUser ? 'Converting...' : 'Confirm Conversion'}
                    </button>
                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-500">
                    <UserCheck className="h-8 w-8 text-slate-600 mb-2" />
                    <span className="text-[11px]">Select a virtual user from the list below to convert them into an active user.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Virtual user list */}
            {virtualUsers.length > 0 && (
              <div className="mt-6 border-t border-white/5 pt-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">Virtual Staff Listing</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {virtualUsers.map(v => {
                    const isDeletingThisUser = deletingUserId === v.id;
                    return (
                      <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-white/5 text-xs">
                        <div>
                          <div className="font-semibold text-slate-200">{v.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={isDeletingThisUser}
                            value={rotationAssignments.find(a => a.userId === v.id)?.groupId || 'unassigned'}
                            onChange={async (e) => {
                              try {
                                await updateUserGroupAssignment(v.id, schedulePeriod?.id || 'current', e.target.value);
                                await onRefresh();
                                triggerSuccess('Group updated');
                              } catch(err: any) { triggerError(err.message); }
                            }}
                            className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
                          >
                            <option value="unassigned">Unassigned Group</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setSelectedVirtualUser(v)}
                            className="bg-white/10 hover:bg-white/20 hover:text-white text-slate-200 px-2.5 py-1 rounded text-[10px] transition-colors border border-white/5 cursor-pointer"
                          >
                            Convert
                          </button>
                          <button
                            disabled={isDeletingThisUser}
                            onClick={() => handleDeleteVirtualUser(v)}
                            className="text-slate-400 hover:text-rose-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isDeletingThisUser ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Directory & Role Management */}
          <div className="glass border border-white/10 rounded-2xl p-5 shadow" id="staff-directory-card">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white font-display">Active Staff Directory</h2>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase font-medium">
                {realUsers.length} Active Users
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {realUsers.map(u => {
                const isCurrent = u.id === currentUser.id;
                const isUpdatingThisUser = updatingUserId === u.id;
                return (
                  <div key={u.id} className="py-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        {u.name}
                        {isCurrent && <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded text-[9px] font-mono">YOU</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isUpdatingThisUser && (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                      )}
                      {/* Group Select */}
                      <select
                        disabled={isUpdatingThisUser}
                        value={rotationAssignments.find(a => a.userId === u.id)?.groupId || 'unassigned'}
                        onChange={async (e) => {
                          try {
                            await updateUserGroupAssignment(u.id, schedulePeriod?.id || 'current', e.target.value);
                            await onRefresh();
                            triggerSuccess('Group updated');
                          } catch(err: any) { triggerError(err.message); }
                        }}
                        className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="unassigned">Unassigned Group</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {/* Role Select */}
                      <select
                        disabled={isCurrent || isUpdatingThisUser}
                        value={u.role}
                        onChange={e => handleUpdateUserRole(u.id, e.target.value as Role)}
                        className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="user">User</option>
                        <option value="scheduler">Scheduler</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Delete Button */}
                      {!isCurrent && (
                        <button
                          disabled={isUpdatingThisUser || deletingUserId === u.id}
                          onClick={() => setRealUserToDelete(u)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                          title="Delete staff member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hospital Entities visual logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Holidays list */}
            <div className="glass border border-white/10 p-4 rounded-xl">
              <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2 font-display">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                Public Holidays ({holidays.length})
              </h3>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {holidays.map(h => {
                  const isDeletingThisHoliday = deletingHolidayId === h.id;
                  return (
                    <div key={h.id} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                      <div>
                        <span className="text-slate-200 font-medium">{h.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{h.date}</span>
                      </div>
                      <button
                        disabled={isDeletingThisHoliday}
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isDeletingThisHoliday ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Predefined Templates list */}
            <div className="glass border border-white/10 p-4 rounded-xl" id="templates-list-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-white/5">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2 font-display">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Shift Templates ({templates.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {templates.map(t => {
                  const isDeletingThisTemplate = deletingTemplateId === t.id;
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }}></span>
                          <span className="text-slate-200 font-medium">{t.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {t.startTime} - {t.endTime}
                        </span>
                      </div>
                      <button
                        disabled={isDeletingThisTemplate}
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isDeletingThisTemplate ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Template Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4 overflow-y-auto" id="delete-template-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-rose-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Delete Shift Template</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Are you sure you want to delete the shift template <strong>{templateToDelete.name}</strong>?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTemplateToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={deletingTemplateId === templateToDelete.id}
                onClick={async () => {
                  const id = templateToDelete.id;
                  setTemplateToDelete(null);
                  await executeDeleteTemplate(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-400 hover:bg-rose-300 text-rose-950 text-xs font-bold transition-colors shadow-lg shadow-rose-500/15 cursor-pointer"
              >
                {deletingTemplateId === templateToDelete.id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Virtual User Confirmation Modal */}
      {virtualUserToDelete && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4 overflow-y-auto" id="delete-virtual-user-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-rose-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Delete Virtual Staff</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Are you sure you want to delete the virtual staff member <strong>{virtualUserToDelete.name}</strong>?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVirtualUserToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={deletingUserId === virtualUserToDelete.id}
                onClick={async () => {
                  const id = virtualUserToDelete.id;
                  setVirtualUserToDelete(null);
                  await executeDeleteVirtualUser(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-400 hover:bg-rose-300 text-rose-950 text-xs font-bold transition-colors shadow-lg shadow-rose-500/15 cursor-pointer"
              >
                {deletingUserId === virtualUserToDelete.id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Active User Confirmation Modal */}
      {realUserToDelete && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4 overflow-y-auto" id="delete-real-user-modal">
          <div className="relative m-auto max-h-[90vh] overflow-y-auto bg-slate-900 border border-rose-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Delete Active Staff Member</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Are you sure you want to delete active staff member <strong>{realUserToDelete.name}</strong>? This user will lose access to the application, and their scheduled shifts may need manual reassignment.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRealUserToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={deletingUserId === realUserToDelete.id}
                onClick={async () => {
                  const id = realUserToDelete.id;
                  setRealUserToDelete(null);
                  await executeDeleteRealUser(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-400 hover:bg-rose-300 text-rose-950 text-xs font-bold transition-colors shadow-lg shadow-rose-500/15 cursor-pointer"
              >
                {deletingUserId === realUserToDelete.id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rotation Rearranger Modal */}
      {showRearrangeModal && (
        <RotationRearrangerModal
          groups={groups}
          users={users}
          assignments={rotationAssignments}
          periodId={schedulePeriod?.id || 'current'}
          onSave={handleSaveRotation}
          onClose={() => setShowRearrangeModal(false)}
        />
      )}
    </div>
  );
}
