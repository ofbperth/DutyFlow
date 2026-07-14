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
  RefreshCw
} from 'lucide-react';
import { User, Shift, ShiftTemplate, Department, Availability, ShiftSwap, Holiday, SchedulePeriod } from '../types';
import {
  saveAvailability,
  deleteAvailability,
  saveShiftSwap,
  updateUserProfile,
  saveUser,
  saveShift
} from '../firebase';

interface UserDashboardProps {
  currentUser: User;
  users: User[];
  departments: Department[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  availabilities: Availability[];
  swaps: ShiftSwap[];
  holidays: Holiday[];
  googleAccessToken: string | null;
  schedulePeriod: SchedulePeriod | null;
  onRefresh: () => Promise<void>;
  onTriggerCalendarSync: () => void;
  activeTab?: string;
}

export default function UserDashboard({
  currentUser,
  users,
  departments,
  templates,
  shifts,
  availabilities,
  swaps,
  holidays,
  googleAccessToken,
  schedulePeriod,
  onRefresh,
  onTriggerCalendarSync,
  activeTab = 'schedule'
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

  // Link Calendar State
  const [calendarId, setCalendarId] = useState(currentUser.googleCalendarId || 'primary');

  // Submit Availability State
  const [availDate, setAvailDate] = useState('');
  const [availStatus, setAvailStatus] = useState<'available' | 'unavailable' | 'preferred'>('available');
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
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSubmittingAvail, setIsSubmittingAvail] = useState(false);
  const [clearingAvailId, setClearingAvailId] = useState<string | null>(null);
  const [isRequestingSwap, setIsRequestingSwap] = useState(false);
  const [resolvingSwapId, setResolvingSwapId] = useState<string | null>(null);

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

  // Get current user's availabilities
  const myAvailabilities = availabilities.filter(
    a => a.userId === currentUser.id && a.date >= activePeriod.startDate && a.date <= activePeriod.endDate
  );


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

  // Handle Save Calendar Configuration
  const handleSaveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCalendar(true);
    try {
      await updateUserProfile(currentUser.id, { googleCalendarId: calendarId.trim() });
      currentUser.googleCalendarId = calendarId.trim();
      await onRefresh();
      triggerSuccess('Google Calendar settings stored in profile!');
    } catch (err: any) {
      triggerError(err.message || 'Failed to link calendar');
    } finally {
      setIsSavingCalendar(false);
    }
  };

  // Handle Submit Availability
  const handleSubmitAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availDate) return;

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
          <h1 className="text-xl font-extrabold text-white font-display">Staff Care Portal</h1>
          <p className="text-xs text-slate-300 mt-1">
            {userSubTab === 'shifts' && 'Review your scheduled rotations, duty durations, and upcoming work assignments for the selected month.'}
            {userSubTab === 'availability' && 'Configure your work availability levels and specify preferred or unavailable dates to direct duty schedulers.'}
            {userSubTab === 'swaps' && 'Initiate trade or coverage proposals, review pending incoming requests, and monitor your outgoing swap requests.'}
            {userSubTab === 'profile' && 'Configure your hospital displayName identity and link dynamic, real-time Google Calendar synchronizations.'}
          </p>
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
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  compareMode
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                }`}
                id="difference-compare-btn"
              >
                <GitCompare className="h-4 w-4" />
                {compareMode ? 'Comparing Draft Diff' : 'Compare Draft vs. Published'}
              </button>
            </div>

            {/* Shift grid matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datesArray.map(dateStr => {
                const shift = myShifts.find(s => s.date === dateStr);
                const isHoliday = holidays.some(h => h.date === dateStr);
                const dateObj = parseLocalDate(dateStr);
                const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const dayNum = dateObj.getDate();
                const monthNameStr = dateObj.toLocaleDateString('en-US', { month: 'long' });

                // If in compareMode, we only show days with active shifts to easily highlight differences, or highlight draft shifts in a unique style
                if (compareMode && !shift) return null;

                const temp = shift ? templates.find(t => t.id === shift.templateId) : null;
                const dept = shift ? departments.find(d => d.id === shift.departmentId) : null;

                return (
                  <div
                    key={dateStr}
                    className={`p-4 rounded-2xl border transition-all glass ${
                      shift
                        ? shift.status === 'published'
                          ? 'border-white/10'
                          : 'bg-amber-500/5 border-amber-500/30 animate-pulse'
                        : isHoliday
                          ? 'bg-blue-500/5 border-blue-500/20'
                          : 'border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-400">{dayOfWeek}</div>
                        <div className="text-lg font-extrabold text-slate-100 font-display">{monthNameStr} {dayNum}</div>
                      </div>
                      {isHoliday && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                          Holiday
                        </span>
                      )}
                    </div>

                    {shift ? (
                      <div className="space-y-3 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: temp?.color }} />
                          <span className="text-xs font-bold text-white">{temp?.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300">
                          Hours: {temp?.startTime} - {temp?.endTime}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>Ward: {dept?.name}</span>
                        </div>

                        {/* Comparative status indicators */}
                        <div className="flex items-center justify-between pt-1">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${
                            shift.status === 'published'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {shift.status === 'published' ? 'Published' : 'Unpublished Draft'}
                          </span>

                          {shift.status === 'draft' && (
                            <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">
                              Pending publish
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-4">No duty shifts scheduled.</div>
                    )}
                  </div>
                );
              })}
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
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">AVAILABILITY LEVEL</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['available', 'unavailable', 'preferred'] as const).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setAvailStatus(lvl)}
                        className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          availStatus === lvl
                            ? lvl === 'available'
                              ? 'bg-blue-600 text-white'
                              : lvl === 'unavailable'
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
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAvail}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-xl transition-all cursor-pointer text-xs font-semibold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {isSubmittingAvail && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
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
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{a.date}</div>
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
                        className="text-slate-400 hover:text-rose-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
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
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
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
                      className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-xl transition-all cursor-pointer text-xs font-semibold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {isRequestingSwap && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
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
                      <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-200">{requester?.name}</span>
                            <span className="text-slate-400 text-[10px] block font-mono">wants to trade with you</span>
                          </div>
                        </div>

                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 text-[11px] font-mono text-slate-300 space-y-1">
                          <div>Colleague shift: {reqShift?.date} &bull; {reqTemp?.name}</div>
                          {peerShift ? (
                            <div>Your shift: {peerShift?.date} &bull; {peerTemp?.name}</div>
                          ) : (
                            <div>Your shift: Coverage request (no shift traded back)</div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            disabled={resolvingSwapId === s.id}
                            onClick={() => handleResolveSwap(s, 'approved')}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 px-3 rounded text-[10px] transition-all shadow-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resolvingSwapId === s.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Accept Trade
                          </button>
                          <button
                            disabled={resolvingSwapId === s.id}
                            onClick={() => handleResolveSwap(s, 'rejected')}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-slate-300 font-medium py-1.5 px-3 rounded text-[10px] transition-all border border-white/5 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div key={s.id} className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs">
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
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                 <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-xl transition-all text-xs font-semibold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {isUpdatingProfile && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  {isUpdatingProfile ? 'Saving...' : 'Save Profile Change'}
                </button>
              </form>
            </div>

            {/* Google Calendar sync settings */}
            <div className="glass border border-white/10 p-5 rounded-3xl space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3 flex items-center gap-2 font-display">
                <CalendarCheck2 className="h-4 w-4 text-blue-400" />
                Google Calendar Integration
              </h2>

              {googleAccessToken ? (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 text-[11px] text-blue-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Google Connection Active. Your schedule will dynamically sync to your linked calendar when published.</span>
                </div>
              ) : (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-[11px] text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Google Connection inactive. Shifts can still be scheduled inside DutyFlow but will not sync to your private Google Calendar until active.</span>
                </div>
              )}

              <form onSubmit={handleSaveCalendar} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">TARGET GOOGLE CALENDAR ID</label>
                  <input
                    type="text"
                    required
                    placeholder="primary"
                    value={calendarId}
                    onChange={e => setCalendarId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">Using "primary" syncs to your main Google account calendar. You may specify another calendar ID shared with your account.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingCalendar}
                    className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-slate-200 hover:text-white font-medium py-2 px-4 rounded-xl transition-all text-xs font-semibold border border-white/5 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isSavingCalendar && (
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                    {isSavingCalendar ? 'Updating...' : 'Update Target ID'}
                  </button>
                  <button
                    type="button"
                    onClick={onTriggerCalendarSync}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-xl transition-colors text-xs font-semibold shadow-lg shadow-blue-500/15"
                  >
                    Authorize Calendar Sync
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
