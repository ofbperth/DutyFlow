import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  GitCompare,
  ArrowRightLeft,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Save,
  CheckCircle2,
  CalendarCheck2,
  RefreshCw,
  Shield,
  FileText,
  Scale,
  ShieldCheck,
  Copy,
  Download,
  Filter
} from 'lucide-react';
import { User, Shift, ShiftTemplate, Availability, ShiftSwap, Holiday, SchedulePeriod, DoctorGroup, GroupRotationAssignment, CROSS_GROUP_RULES } from '../types';
import {
  saveAvailability,
  deleteAvailability,
  saveShiftSwap,
  updateUserProfile,
  saveUser,
  saveShift
} from '../firebase';
import { downloadICSFile, generateICalendarFeed, getICalFeedUrl, getGoogleCalendarSubscribeUrl } from '../icsCalendar';

interface UserDashboardProps {
  currentUser: User;
  users: User[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  availabilities: Availability[];
  swaps: ShiftSwap[];
  holidays: Holiday[];
  schedulePeriod: SchedulePeriod | null;
  groups: DoctorGroup[];
  rotationAssignments: GroupRotationAssignment[];
  onRefresh: () => Promise<void>;
  onRoleChange: (role: 'user' | 'scheduler' | 'admin') => void;
  activeTab?: string;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export default function UserDashboard({
  currentUser,
  users,
  templates,
  shifts,
  availabilities,
  swaps,
  holidays,
  schedulePeriod,
  groups,
  rotationAssignments,
  onRefresh,
  onRoleChange,
  activeTab = 'schedule',
  onOpenPrivacy,
  onOpenTerms
}: UserDashboardProps) {

  // Navigation
  const [userSubTab, setUserSubTab] = useState<'shifts' | 'availability' | 'swaps' | 'profile'>('shifts');

  // Sync external activeTab with internal sub-tab state
  useEffect(() => {
    if (activeTab === 'schedule') {
      setUserSubTab('shifts');
    } else if (activeTab === 'availability') {
      setUserSubTab('availability');
    } else if (activeTab === 'swaps') {
      setUserSubTab('swaps');
    } else if (activeTab === 'settings') {
      setUserSubTab('profile');
    }
  }, [activeTab]);

  // Month navigation (Defaults to July 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1));

  // Edit Profile State
  const [profileName, setProfileName] = useState(currentUser.name);

  // Submit Availability State
  const [availDate, setAvailDate] = useState('');
  const [availStatus, setAvailStatus] = useState<'unavailable' | 'preferred'>('unavailable');
  const [availNotes, setAvailNotes] = useState('');

  // Shift Swap State
  const [selectedMyShiftId, setSelectedMyShiftId] = useState('');
  const [selectedTargetUserId, setSelectedTargetUserId] = useState('');
  const [selectedTargetShiftId, setSelectedTargetShiftId] = useState('');

  // Difference view settings
  const [compareMode, setCompareMode] = useState<boolean>(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Loading states for actions & buttons
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSubmittingAvail, setIsSubmittingAvail] = useState(false);
  const [clearingAvailId, setClearingAvailId] = useState<string | null>(null);
  const [isRequestingSwap, setIsRequestingSwap] = useState(false);
  const [resolvingSwapId, setResolvingSwapId] = useState<string | null>(null);
  const [copiedFeed, setCopiedFeed] = useState(false);

  // Filter state
  const [showOnlyInvolved, setShowOnlyInvolved] = useState(true);

  // Helper Date Parsing & Formatting functions
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

  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates: string[] = [];
    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);
    
    let current = new Date(start.getTime());
    while (current <= end) {
      dates.push(formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const activePeriod = schedulePeriod || {
    id: 'current',
    title: 'July 2026 Rotation Cycle',
    startDate: '2026-07-01',
    endDate: '2026-07-14'
  };

  const datesArray = getDatesInRange(activePeriod.startDate, activePeriod.endDate);

  // Get current user's shifts
  const myShifts = shifts.filter(
    s => s.userId === currentUser.id && s.date >= activePeriod.startDate && s.date <= activePeriod.endDate
  );

  const myAvailabilities = availabilities.filter(
    a => a.userId === currentUser.id && a.date >= activePeriod.startDate && a.date <= activePeriod.endDate
  );

  const myShiftTypeCounts: Record<string, number> = {};

  myShifts.forEach(s => {
    const t = templates.find(t => t.id === s.templateId);
    if (t) {
      myShiftTypeCounts[t.name] = (myShiftTypeCounts[t.name] || 0) + 1;
    }
  });
  const myTotalShiftsCount = myShifts.length;

  const myAssignment = rotationAssignments?.find(a => a.userId === currentUser.id);
  const myGroup = groups?.find(g => g.id === myAssignment?.groupId);

  const deptUsers = users;

  const groupsWithUsers = groups.map(g => {
    const homeUsers = deptUsers.filter(u => {
      const assignment = rotationAssignments.find(a => a.userId === u.id);
      return assignment && assignment.groupId === g.id;
    });

    const allowedHomeGroupsForTarget = CROSS_GROUP_RULES[g.id] || [];
    const outerUsers = deptUsers.filter(u => {
      const assignment = rotationAssignments.find(a => a.userId === u.id);
      const homeGroupId = assignment?.groupId;
      if (!homeGroupId || homeGroupId === g.id) return false;
      if (!allowedHomeGroupsForTarget.includes(homeGroupId)) return false;

      return shifts.some(s => {
        if (s.userId !== u.id || !datesArray.includes(s.date)) return false;
        const targetId = s.targetGroupId || templates.find(t => t.id === s.templateId)?.groupId;
        return targetId === g.id;
      });
    });

    return {
      group: g,
      users: [...homeUsers, ...outerUsers]
    };
  });

  const myInvolvedGroupIds = new Set(
    rotationAssignments.filter(a => a.userId === currentUser.id).map(a => a.groupId)
  );

  const displayedGroupsWithUsers = groupsWithUsers.filter(g => 
    !showOnlyInvolved || myInvolvedGroupIds.has(g.group.id)
  );

  const unassignedUsers = deptUsers.filter(u => {
    const assignment = rotationAssignments.find(a => a.userId === u.id);
    if (!assignment) return true;
    if (assignment.groupId === '' || assignment.groupId === 'unassigned') return true;
    const groupExists = groups.some(g => g.id === assignment.groupId);
    return !groupExists;
  });

  const isUserUnassigned = unassignedUsers.some(u => u.id === currentUser.id);
  const shouldShowUnassigned = !showOnlyInvolved || isUserUnassigned;




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




  // Handle Edit Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      await updateUserProfile(currentUser.id, { name: profileName.trim() });
      currentUser.name = profileName.trim(); // local mutation
      await onRefresh();
      triggerSuccess('Profile display name updated!');
    } catch (err: any) {
      triggerError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Submit Availability
  const handleSubmitAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availDate) return;

    // Check if user is already assigned a shift on this day
    const hasShift = shifts.some(s => s.userId === currentUser.id && s.date === availDate);
    if (availStatus === 'unavailable' && hasShift) {
      alert(`Warning: You have already been assigned a shift on ${availDate}. Please contact your scheduler to resolve this conflict.`);
    }

    setIsSubmittingAvail(true);
    try {
      const id = `avail-${Date.now()}`;
      const newAvail: Availability = {
        id,
        userId: currentUser.id,
        date: availDate,
        status: availStatus,
        notes: availNotes.trim()
      };

      await saveAvailability(newAvail);
      setAvailDate('');
      setAvailNotes('');
      await onRefresh();
      triggerSuccess('Availability submitted.');
    } catch (err: any) {
      triggerError(err.message || 'Failed to submit availability');
    } finally {
      setIsSubmittingAvail(false);
    }
  };

  // Delete Availability
  const handleDeleteAvail = async (id: string) => {
    setClearingAvailId(id);
    try {
      await deleteAvailability(id);
      await onRefresh();
      triggerSuccess('Availability preference cleared.');
    } catch (err: any) {
      triggerError(err.message || 'Clear failed');
    } finally {
      setClearingAvailId(null);
    }
  };

  // Handle Request Shift Swap
  const handleRequestSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMyShiftId || !selectedTargetUserId) {
      triggerError('Please select one of your shifts and a target colleague.');
      return;
    }

    setIsRequestingSwap(true);
    try {
      const swapId = `swap-${Date.now()}`;
      const newSwap: ShiftSwap = {
        id: swapId,
        requestingUserId: currentUser.id,
        requestingShiftId: selectedMyShiftId,
        targetUserId: selectedTargetUserId,
        targetShiftId: selectedTargetShiftId || null,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await saveShiftSwap(newSwap);
      setSelectedMyShiftId('');
      setSelectedTargetUserId('');
      setSelectedTargetShiftId('');
      await onRefresh();
      triggerSuccess('Shift Swap request submitted successfully!');
    } catch (err: any) {
      triggerError(err.message || 'Failed to submit shift swap');
    } finally {
      setIsRequestingSwap(false);
    }
  };

  // Handle Accept / Reject swap
  const handleResolveSwap = async (swap: ShiftSwap, action: 'approved' | 'rejected') => {
    setResolvingSwapId(swap.id);
    try {
      // If approved, we need to swap the actual shifts in our database!
      if (action === 'approved') {
        const myShift = shifts.find(s => s.id === swap.requestingShiftId);
        const peerShift = swap.targetShiftId ? shifts.find(s => s.id === swap.targetShiftId) : null;

        if (myShift) {
          // Swap assigned user
          const peerId = swap.targetUserId;
          const myId = swap.requestingUserId;

          // Mutate and save
          myShift.userId = peerId;
          await saveShift(myShift);

          if (peerShift) {
            peerShift.userId = myId;
            await saveShift(peerShift);
          }
        }
        swap.status = 'completed';
      } else {
        swap.status = 'rejected';
      }

      await saveShiftSwap(swap);
      await onRefresh();
      triggerSuccess(`Shift swap request ${action}.`);
    } catch (err: any) {
      triggerError(err.message || 'Failed to resolve swap');
    } finally {
      setResolvingSwapId(null);
    }
  };

  // Filter shifts for target colleague
  const peerUsers = users.filter(u => u.id !== currentUser.id);
  const peerShifts = shifts.filter(s => s.userId === selectedTargetUserId);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto px-2 md:px-0 py-4" id="user-dashboard-root">
      {/* Alert Banner */}
      {successMsg && (
        <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-4 text-xs text-teal-400 flex items-center gap-2 animate-fade-in" id="user-success-alert">
          <Check className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-400 flex items-center gap-2 animate-fade-in" id="user-error-alert">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="glass border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative" id="user-banner">
        <div>
          <h1 className="text-xl font-extrabold text-white font-display">Rotation Schedules</h1>
          <p className="text-xs text-slate-300 mt-1">
            {userSubTab === 'shifts' && 'Review your scheduled rotations, duty durations, and upcoming work assignments for the selected month.'}
            {userSubTab === 'availability' && 'Configure your work availability levels and specify preferred or unavailable dates to direct duty schedulers.'}
            {userSubTab === 'swaps' && 'Initiate trade or coverage proposals, review pending incoming requests, and monitor your outgoing swap requests.'}
            {userSubTab === 'profile' && 'Configure your hospital displayName identity and profile details.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(myShiftTypeCounts).map(([typeName, count]) => {
              const tColor = templates.find(t => t.name === typeName)?.color || '#3b82f6';
              return (
                <div key={typeName} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border" style={{ backgroundColor: `${tColor}15`, borderColor: `${tColor}30`, color: tColor }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tColor }}></span>
                  {typeName}: <span className="text-white font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 items-center self-start sm:self-center">
          <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl text-center">
            <div className="text-[9px] text-purple-400 font-mono uppercase tracking-widest font-semibold">Total</div>
            <div className="text-lg font-bold text-purple-300 tabular-nums leading-none mt-1">{myTotalShiftsCount}</div>
          </div>
        </div>
      </div>

      {/* Main view router */}
      <div id="user-subtab-viewer">
        {userSubTab === 'shifts' && (
          <div className="space-y-6">
            {/* Shifts Control Bar */}
            <div className="glass border border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-1.5 min-w-[200px]">
                <span className="text-xs font-bold text-slate-100 font-display">
                  {activePeriod.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activePeriod.startDate} to {activePeriod.endDate}
                </span>
              </div>

              {/* Comparative Difference Mode button */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Toggle Involved Groups Button */}
                <button
                  type="button"
                  onClick={() => setShowOnlyInvolved(!showOnlyInvolved)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                    showOnlyInvolved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10 hover:bg-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                  id="user-toggle-involved-groups-btn"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>My Involved Groups Only</span>
                  {showOnlyInvolved && (
                    <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                      ✓ Active
                    </span>
                  )}
                </button>

                <button
                onClick={() => setCompareMode(!compareMode)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  compareMode
                    ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-lg shadow-amber-500/15'
                    : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                }`}
                id="difference-compare-btn"
              >
                <GitCompare className="h-4 w-4" />
                {compareMode ? 'Comparing Draft Diff' : 'Compare Draft vs. Published'}
              </button>
              </div>
            </div>

            {/* Assigned Group Banner */}
            {myGroup && (
              <div className="p-4 glass border border-white/10 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">Your Active Group: {myGroup.name}</h3>
                </div>
                {myGroup.color && (
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: myGroup.color }} />
                )}
              </div>
            )}

            {/* Shift grid matrix (Group-organized schedule grid) */}
            <div className="sm:hidden text-[10px] text-slate-400 text-center mb-2 bg-white/5 py-1.5 rounded-lg border border-white/10">Swipe left/right to view full schedule</div>
            <div className="glass border border-white/10 rounded-2xl overflow-x-auto shadow-inner">
              <table className="w-full border-collapse text-left min-w-[900px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="p-4 text-xs font-bold text-slate-200 w-44 sticky left-0 bg-[#14112c]/95 backdrop-blur-md z-10 border-r border-white/10">
                      Teammate
                    </th>
                    {datesArray.map(dateStr => {
                      const isHoliday = holidays.some(h => h.date === dateStr);
                      const dateObj = parseLocalDate(dateStr);
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
                  {displayedGroupsWithUsers.map(({ group, users: groupUsers }) => (
                    <React.Fragment key={group.id}>
                      <tr className="bg-white/[0.03] border-y border-white/10">
                        <td colSpan={datesArray.length + 1} className="p-2 sticky left-0 z-20" style={{
                          backgroundColor: group.color ? `${group.color}20` : 'rgba(255,255,255,0.05)',
                          backdropFilter: 'blur(12px)',
                          borderLeft: `4px solid ${group.color || '#fff'}`
                        }}>
                          <div className="flex items-center justify-between pl-2">
                            <span className="text-xs font-bold font-display" style={{ color: group.color || '#fff' }}>
                              {group.name} {group.isUniversal ? '(Universal)' : ''}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {groupUsers.length > 0 ? (
                        [...groupUsers].sort((a, b) => (a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0)).map(u => {
                          const userAssignment = rotationAssignments.find(a => a.userId === u.id);
                          const userHomeGroup = groups.find(g => g.id === userAssignment?.groupId);
                          const isOuterDoctor = userHomeGroup && userHomeGroup.id !== group.id;

                          return (
                            <tr key={`${group.id}-${u.id}`} className={`hover:bg-white/5 ${u.id === currentUser.id ? 'bg-amber-500/5' : ''}`}>
                              <td className="p-3 sticky left-0 bg-[#14112c]/95 backdrop-blur-md border-r border-white/10 font-medium text-slate-300 z-10">
                                <div className="text-xs font-bold text-slate-200 flex items-center flex-wrap gap-1">
                                  <span>{u.name}</span>
                                  {u.id === currentUser.id && (
                                    <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded uppercase tracking-wider">(YOU)</span>
                                  )}
                                  {isOuterDoctor && (
                                    <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded" title={`Staff home group is ${userHomeGroup.name}`}>
                                      จาก {userHomeGroup.name}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Day Cells */}
                              {datesArray.map(dateStr => {
                                const shift = shifts.find(s => s.userId === u.id && s.date === dateStr);
                                
                                return (
                                  <td
                                    key={dateStr}
                                    className={`p-1.5 text-center relative border-r border-white/5 ${u.id === currentUser.id ? 'bg-white/[0.02]' : ''}`}
                                    style={{ height: '54px' }}
                                  >
                                    {shift ? (
                                      (() => {
                                        const temp = templates.find(t => t.id === shift.templateId);
                                        const targetGroupId = shift.targetGroupId || temp?.groupId;
                                        const targetGroup = groups.find(g => g.id === targetGroupId);
                                        const isCrossGroupShift = targetGroupId && targetGroupId !== 'group-universal' && targetGroupId !== 'group-pooled' && userHomeGroup && targetGroupId !== userHomeGroup.id;
                                        return (
                                          <div
                                            className="group relative rounded-lg p-1.5 text-[10px] text-left shadow-sm border flex flex-col justify-between"
                                            style={{
                                              backgroundColor: (temp?.color || '#333') + '20',
                                              borderColor: temp?.color || '#555',
                                              color: '#fff'
                                            }}
                                          >
                                            <div className="font-extrabold truncate flex items-center gap-1.5 text-[10px]">
                                              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: temp?.color }} />
                                              <span className="truncate">{temp?.name}</span>
                                            </div>
                                            <div className="text-[9px] opacity-70 mt-0.5 font-mono tabular-nums">
                                              {temp?.startTime} - {temp?.endTime}
                                            </div>
                                            {isCrossGroupShift && targetGroup && (
                                              <div className="mt-1 text-[8px] font-extrabold px-1 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40 inline-flex items-center gap-0.5 self-start">
                                                <span>🏷️</span>
                                                <span>{targetGroup.name}</span>
                                              </div>
                                            )}
                                            <span className={`absolute bottom-1 right-1 px-1 rounded text-[9px] font-mono tracking-wider font-semibold uppercase ${
                                              shift.status === 'published' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                              {shift.status}
                                            </span>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                    <div className="w-full h-full"></div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    ) : (
                        <tr>
                          <td colSpan={datesArray.length + 1} className="p-4 text-center border-b border-white/5 bg-white/[0.02]">
                            <div className="flex flex-col items-center justify-center gap-2 py-2">
                              <span className="text-xs text-slate-400">No doctors assigned to {group.name} yet</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {shouldShowUnassigned && unassignedUsers.length > 0 && (
                    <React.Fragment>
                      <tr className="bg-white/[0.03] border-y border-white/10">
                        <td colSpan={datesArray.length + 1} className="p-2 sticky left-0 z-20" style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          backdropFilter: 'blur(12px)',
                          borderLeft: `4px solid #fff`
                        }}>
                          <div className="flex items-center justify-between pl-2">
                            <span className="text-xs font-bold font-display text-slate-400">
                              Unassigned / General
                            </span>
                          </div>
                        </td>
                      </tr>
                      {[...unassignedUsers].sort((a, b) => (a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0)).map(u => (
                          <tr key={u.id} className={`hover:bg-white/5 ${u.id === currentUser.id ? 'bg-amber-500/5' : ''}`}>
                            <td className="p-3 sticky left-0 bg-[#14112c]/95 backdrop-blur-md border-r border-white/10 font-medium text-slate-300 z-10">
                              <div className="text-xs font-bold text-slate-200">
                                {u.name} {u.id === currentUser.id && <span className="ml-1.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded uppercase tracking-wider">(YOU)</span>}
                              </div>
                            </td>

                            {/* Day Cells */}
                            {datesArray.map(dateStr => {
                              const shift = shifts.find(s => s.userId === u.id && s.date === dateStr);
                              
                              return (
                                <td
                                  key={dateStr}
                                  className={`p-1.5 text-center relative border-r border-white/5 ${u.id === currentUser.id ? 'bg-white/[0.02]' : ''}`}
                                  style={{ height: '54px' }}
                                >
                                  {shift ? (
                                    (() => {
                                      const temp = templates.find(t => t.id === shift.templateId);
                                      return (
                                        <div
                                          className="group relative rounded-lg p-1.5 text-[10px] text-left shadow-sm border"
                                          style={{
                                            backgroundColor: (temp?.color || '#333') + '20',
                                            borderColor: temp?.color || '#555',
                                            color: '#fff'
                                          }}
                                        >
                                          <div className="font-extrabold truncate flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: temp?.color }} />
                                            {temp?.name}
                                          </div>
                                          <div className="text-[10px] opacity-70 mt-0.5 font-mono tabular-nums">
                                            {temp?.startTime} - {temp?.endTime}
                                          </div>
                                          <span className={`absolute bottom-1 right-1 px-1 rounded text-[10px] font-mono tracking-wider font-semibold uppercase ${
                                            shift.status === 'published' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                                          }`}>
                                            {shift.status}
                                          </span>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <div className="w-full h-full"></div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Submit Availability */}
        {userSubTab === 'availability' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Planner Form */}
            <div className="glass border border-white/10 p-5 rounded-3xl">
              <h2 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3 flex items-center gap-2 font-display">
                <CalendarCheck2 className="h-4 w-4 text-blue-400" />
                Plan Duty Preference
              </h2>

              <form onSubmit={handleSubmitAvailability} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">SELECT DATE</label>
                  <input
                    type="date"
                    required
                    value={availDate}
                    onChange={e => setAvailDate(e.target.value)}
                    onClick={(e) => { try { (e.target as any).showPicker(); } catch (err) {} }}
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">AVAILABILITY LEVEL</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['unavailable', 'preferred'] as const).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setAvailStatus(lvl)}
                        className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                          availStatus === lvl
                            ? lvl === 'unavailable'
                              ? 'bg-rose-600 text-white'
                              : 'bg-indigo-600 text-white'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">OPTIONAL DETAILS / NOTES</label>
                  <textarea
                    placeholder="e.g. Attending pediatric seminar"
                    rows={2}
                    value={availNotes}
                    onChange={e => setAvailNotes(e.target.value)}
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAvail}
                  className="w-full bg-blue-400 hover:bg-blue-300 disabled:bg-blue-950 disabled:text-blue-500 text-blue-950 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-xs shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {isSubmittingAvail && (
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-950" />
                  )}
                  {isSubmittingAvail ? 'Submitting...' : 'Submit Preference'}
                </button>
              </form>
            </div>

            {/* Active Planner list */}
            <div className="glass border border-white/10 p-5 rounded-3xl h-fit">
              <h2 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3 font-display">My Availability Preferences ({myAvailabilities.length})</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {myAvailabilities.map(a => {
                  const isClearingThisAvail = clearingAvailId === a.id;
                  return (
                    <div key={a.id} className="flex items-center justify-between py-3 border-b border-white/5 text-xs">
                      <div>
                        <div className="font-bold text-slate-200 tabular-nums">{a.date}</div>
                        <span className={`inline-block text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${
                          a.status === 'available'
                            ? 'bg-blue-500/10 text-blue-400'
                            : a.status === 'unavailable'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {a.status}
                        </span>
                        {a.notes && <p className="text-[10px] text-slate-400 italic mt-1 font-mono">{a.notes}</p>}
                      </div>

                      <button
                        disabled={isClearingThisAvail}
                        onClick={() => handleDeleteAvail(a.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded"
                      >
                        {isClearingThisAvail ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
                {myAvailabilities.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs italic">No preferences submitted for this month.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shift Trades & Swaps */}
        {userSubTab === 'swaps' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create swap request */}
            <div className="glass border border-white/10 p-5 rounded-3xl">
              <h2 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3 flex items-center gap-2 font-display">
                <ArrowRightLeft className="h-4 w-4 text-blue-400" />
                Initiate Shift Swap Request
              </h2>

              <form onSubmit={handleRequestSwap} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">SELECT YOUR OWN SHIFT TO TRADE</label>
                  <select
                    value={selectedMyShiftId}
                    onChange={e => setSelectedMyShiftId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <option value="" className="bg-slate-900">Select Shift</option>
                    {myShifts.map(s => {
                      const t = templates.find(x => x.id === s.templateId);
                      return (
                        <option key={s.id} value={s.id} className="bg-slate-900">
                          {s.date} - {t?.name} ({t?.startTime} - {t?.endTime})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">CHOOSE COLLEAGUE</label>
                  <select
                    value={selectedTargetUserId}
                    onChange={e => {
                      setSelectedTargetUserId(e.target.value);
                      setSelectedTargetShiftId('');
                    }}
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <option value="" className="bg-slate-900">Select Colleague</option>
                    {peerUsers.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                    ))}
                  </select>
                </div>

                {selectedTargetUserId && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">SELECT TARGET SHIFT (OPTIONAL)</label>
                    <select
                      value={selectedTargetShiftId}
                      onChange={e => setSelectedTargetShiftId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <option value="" className="bg-slate-900">Choose Shift (Or leave blank to ask colleague to cover)</option>
                      {peerShifts.map(s => {
                        const t = templates.find(x => x.id === s.templateId);
                        return (
                          <option key={s.id} value={s.id} className="bg-slate-900">
                            {s.date} - {t?.name} ({t?.startTime} - {t?.endTime})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRequestingSwap}
                  className="w-full bg-blue-400 hover:bg-blue-300 disabled:bg-blue-950 disabled:text-blue-500 text-blue-950 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-xs shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {isRequestingSwap && (
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-950" />
                  )}
                  {isRequestingSwap ? 'Submitting...' : 'Submit Swap Request'}
                </button>
              </form>
            </div>

            {/* Swap list */}
            <div className="glass border border-white/10 p-5 rounded-3xl space-y-4">
              <h2 className="text-sm font-semibold text-white border-b border-white/5 pb-3 font-display">Active Shift Swap Operations</h2>

              {/* Pending requested to me */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400">Incoming Swap Requests</h3>
                {swaps
                  .filter(s => s.targetUserId === currentUser.id && s.status === 'pending')
                  .map(s => {
                    const requester = users.find(u => u.id === s.requestingUserId);
                    const reqShift = shifts.find(sh => sh.id === s.requestingShiftId);
                    const reqTemp = reqShift ? templates.find(t => t.id === reqShift.templateId) : null;
                    const peerShift = s.targetShiftId ? shifts.find(sh => sh.id === s.targetShiftId) : null;
                    const peerTemp = peerShift ? templates.find(t => t.id === peerShift.templateId) : null;

                    return (
                      <div key={s.id} className="py-3 border-b border-white/5 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-200">{requester?.name}</span>
                            <span className="text-slate-400 text-[10px] block font-mono">wants to trade with you</span>
                          </div>
                        </div>

                        <div className="border-l-2 border-white/10 pl-2.5 py-1 text-[11px] font-mono text-slate-300 space-y-1 tabular-nums">
                          <div>Colleague shift: {reqShift?.date} &bull; {reqTemp?.name} ({reqTemp?.startTime} - {reqTemp?.endTime})</div>
                          {peerShift ? (
                            <div>Your shift: {peerShift?.date} &bull; {peerTemp?.name} ({peerTemp?.startTime} - {peerTemp?.endTime})</div>
                          ) : (
                            <div>Your shift: Coverage request (no shift traded back)</div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            disabled={resolvingSwapId === s.id}
                            onClick={() => handleResolveSwap(s, 'approved')}
                            className="flex-1 bg-blue-400 hover:bg-blue-300 text-blue-950 font-bold py-1.5 px-3 rounded text-[10px] transition-colors shadow-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                          >
                            {resolvingSwapId === s.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-950" />
                            ) : null}
                            Accept Trade
                          </button>
                          <button
                            disabled={resolvingSwapId === s.id}
                            onClick={() => handleResolveSwap(s, 'rejected')}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-slate-300 font-medium py-1.5 px-3 rounded text-[10px] transition-colors border border-white/5 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {swaps.filter(s => s.targetUserId === currentUser.id && s.status === 'pending').length === 0 && (
                  <div className="text-[11px] text-slate-500 italic py-2">No incoming requests.</div>
                )}
              </div>

              {/* Sent swaps */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <h3 className="text-xs font-semibold text-slate-400">My Outgoing Requests</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {swaps
                    .filter(s => s.requestingUserId === currentUser.id)
                    .map(s => {
                      const targetUser = users.find(u => u.id === s.targetUserId);
                      return (
                        <div key={s.id} className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs">
                          <div>
                            <span className="text-slate-300">Sent to: {targetUser?.name}</span>
                            <span className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded ml-2 uppercase ${
                              s.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400'
                                : s.status === 'completed'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {s.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile / Calendar Configuration */}
        {userSubTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display name */}
            <div className="glass border border-white/10 p-5 rounded-3xl">
              <h2 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3 flex items-center gap-2 font-display">
                <Save className="h-4 w-4 text-blue-400" />
                Hospital Display Identity
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">DISPLAY NAME</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                 <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full bg-blue-400 hover:bg-blue-300 disabled:bg-blue-950 disabled:text-blue-500 text-blue-950 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                >
                  {isUpdatingProfile && (
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-950" />
                  )}
                  {isUpdatingProfile ? 'Saving...' : 'Save Profile Change'}
                </button>
              </form>
            </div>

            {/* iCalendar (.ics) Feed URL Copy & Download Card */}
            <div className="glass border border-white/10 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-display">
                  <CalendarCheck2 className="h-4 w-4 text-emerald-400" />
                  iCalendar (.ics) Feed & Sync
                </h2>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {myShifts.filter(s => s.status === 'published').length} Active Shifts
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Sync your duty shifts directly with Google Calendar, Apple Calendar, or Outlook using your personal feed URL or downloadable `.ics` file.
              </p>

              {/* Feed URL Copy Input */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  YOUR PERSONAL ICAL FEED URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getICalFeedUrl(currentUser.id)}
                    className="w-full text-xs font-mono rounded-xl border border-white/10 bg-white/5 p-2.5 text-emerald-300 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getICalFeedUrl(currentUser.id));
                      setCopiedFeed(true);
                      setSuccessMsg('iCal Feed URL copied to clipboard!');
                      setTimeout(() => setCopiedFeed(false), 2500);
                    }}
                    className="px-3.5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Copy iCal Feed URL"
                  >
                    {copiedFeed ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Subscribe & Download */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={getGoogleCalendarSubscribeUrl(getICalFeedUrl(currentUser.id))}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold py-2 px-3 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                  1-Click Calendar Sync
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const myPublished = shifts.filter(s => s.userId === currentUser.id && s.status === 'published');
                    const content = generateICalendarFeed(currentUser, myPublished, templates, groups);
                    downloadICSFile(`dutyflow-${currentUser.name.replace(/\s+/g, '_')}-schedule.ics`, content);
                    setSuccessMsg('Downloaded .ics calendar file!');
                  }}
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold py-2 px-3 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  Download .ics File
                </button>
              </div>

              <div className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  How to sync with Google Calendar Web:
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400 text-[10px] pl-1">
                  <li>Click <span className="text-emerald-300 font-mono font-bold">Copy URL</span> above.</li>
                  <li>Open <strong>Google Calendar</strong> $\rightarrow$ Click <strong>Other calendars (+)</strong> $\rightarrow$ <strong>From URL</strong>.</li>
                  <li>Paste your URL and click <strong>Add calendar</strong>.</li>
                </ol>
              </div>
            </div>


            {/* Role Settings */}
            <div className="glass border border-white/10 p-5 rounded-3xl md:col-span-2">
              <h2 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3 flex items-center gap-2 font-display">
                <Shield className="h-4 w-4 text-emerald-400" />
                Role Settings
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Change your own operational role. Switching to <strong className="text-slate-200">Scheduler</strong> gives you access to the Rotation Schedules assignment grid.
              </p>
              <div className="flex flex-wrap gap-3">
                {(['user', 'scheduler'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => onRoleChange(role)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors capitalize focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer ${
                      currentUser.role === role
                        ? role === 'scheduler'
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                        : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {currentUser.role === role && <span className="mr-1">✓</span>}
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                    {currentUser.role === role && <span className="ml-1.5 text-[9px] opacity-60">(current)</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Legal & Verification Card */}
            <div className="glass border border-white/10 p-5 rounded-3xl md:col-span-2 space-y-3" id="legal-verification-card">
              <h2 className="text-sm font-semibold text-white border-b border-white/5 pb-3 flex items-center gap-2 font-display">
                <FileText className="h-4 w-4 text-blue-400" />
                Legal & App Verification Documentation
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review DutyFlow's privacy policies, data retention rules, zero-data-selling policies, and terms of service for medical scheduling.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  id="user-dashboard-privacy-btn"
                  onClick={() => {
                    if (onOpenPrivacy) {
                      onOpenPrivacy();
                    } else {
                      window.location.hash = '#privacy';
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-colors text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Privacy Policy
                </button>

                <button
                  type="button"
                  id="user-dashboard-terms-btn"
                  onClick={() => {
                    if (onOpenTerms) {
                      onOpenTerms();
                    } else {
                      window.location.hash = '#terms';
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-colors text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <Scale className="h-4 w-4 text-blue-400" />
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
