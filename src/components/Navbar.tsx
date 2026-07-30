import React from 'react';
import { LogOut, Calendar, Shield, RefreshCw, Layers, Clock, ArrowRightLeft, Settings, ShieldCheck, FileText } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRoleChange: (role: 'user' | 'scheduler' | 'admin') => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export default function Navbar({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  onRoleChange,
  onOpenPrivacy,
  onOpenTerms
}: NavbarProps) {
  const handlePrivacyClick = () => {
    if (onOpenPrivacy) {
      onOpenPrivacy();
    } else {
      window.location.hash = '#privacy';
    }
  };

  const handleTermsClick = () => {
    if (onOpenTerms) {
      onOpenTerms();
    } else {
      window.location.hash = '#terms';
    }
  };

  return (
    <nav className="border-b border-white/10 bg-[#0f0c24] sticky top-0 z-50 px-4 py-3" id="main-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 p-1 shadow-md shadow-indigo-950/40 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.location.hash = ''}>
            <img src="/logo-nobg.png" alt="DutyFlow Logo" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-display cursor-pointer" onClick={() => window.location.hash = ''}>DutyFlow</span>
            <div className="text-[10px] text-slate-300 font-mono tracking-wider uppercase font-medium">HOSPITAL SCHEDULER</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <div className="hidden md:flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/10" id="nav-tabs-wrapper">
            <button
              id="tab-schedule-btn"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                activeTab === 'schedule'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white glass-hover'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Rotation Schedules
            </button>

            <button
              id="tab-pooled-btn"
              onClick={() => setActiveTab('pooled')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                activeTab === 'pooled'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white glass-hover'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Pooled Shifts
            </button>

            <button
              id="tab-availability-btn"
              onClick={() => setActiveTab('availability')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                activeTab === 'availability'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white glass-hover'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              My Availability
            </button>

            <button
              id="tab-swaps-btn"
              onClick={() => setActiveTab('swaps')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                activeTab === 'swaps'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white glass-hover'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Swaps
            </button>

            <button
              id="tab-settings-btn"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                activeTab === 'settings'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white glass-hover'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>

            {user.role === 'admin' && (
              <button
                id="tab-admin-btn"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  activeTab === 'admin'
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white glass-hover'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </button>
            )}
          </div>
        )}

        {/* Right Side: Sync status, profile, legal links & logout */}
        <div className="flex items-center gap-3">
          {/* Legal Quick Links */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium border-l border-white/10 pl-3">
            <button
              id="nav-privacy-btn"
              onClick={handlePrivacyClick}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="View Google OAuth Privacy Policy"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Privacy
            </button>
            <button
              id="nav-terms-btn"
              onClick={handleTermsClick}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="View Terms of Service"
            >
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              Terms
            </button>
          </div>

          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-white/10" id="user-profile-widget">
              <div className="text-right">
                <div className="text-xs font-medium text-slate-200">{user.name}</div>
                <div className="flex items-center justify-end gap-1">
                  <label className="text-[9px] font-mono text-slate-400 font-semibold uppercase">Role (Self-Service)</label>
                  <select
                    className={`text-[9px] font-mono font-semibold uppercase tracking-wider rounded-md px-1 py-0.5 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                      user.role === 'admin'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : user.role === 'scheduler'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                    value={user.role}
                    onChange={(e) => onRoleChange(e.target.value as any)}
                  >
                    <option value="user" className="bg-slate-900 text-slate-200">User</option>
                    <option value="scheduler" className="bg-slate-900 text-slate-200">Scheduler</option>
                    {user.role === 'admin' && (
                      <option value="admin" className="bg-slate-900 text-slate-200">Admin</option>
                    )}
                  </select>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors border border-white/10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav tabs */}
      {user && (
        <div className="flex md:hidden mt-3 gap-1 rounded-lg bg-white/5 p-1 border border-white/10 overflow-x-auto scrollbar-none" id="nav-tabs-mobile">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'schedule'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Rotation Schedules
          </button>
          <button
            onClick={() => setActiveTab('pooled')}
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'pooled'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Pooled Shifts
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'availability'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('swaps')}
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'swaps'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Swaps
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'settings'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                activeTab === 'admin'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
