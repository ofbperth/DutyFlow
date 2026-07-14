import React from 'react';
import { LogOut, Calendar, Shield, RefreshCw, Layers, Clock, ArrowRightLeft, Settings } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  syncQueueLength: number;
  isProcessingSync: boolean;
  onTriggerSync: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({
  user,
  syncQueueLength,
  isProcessingSync,
  onTriggerSync,
  onLogout,
  activeTab,
  setActiveTab
}: NavbarProps) {
  return (
    <nav className="border-b border-white/10 glass sticky top-0 z-50 px-4 py-3" id="main-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-display">DutyFlow</span>
            <div className="text-[10px] text-slate-300 font-mono tracking-wider uppercase font-medium">HOSPITAL SCHEDULER</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <div className="hidden md:flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/10" id="nav-tabs-wrapper">
            <button
              id="tab-schedule-btn"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white glass-hover'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedules
            </button>

            <button
              id="tab-availability-btn"
              onClick={() => setActiveTab('availability')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
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
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
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
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
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
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'admin'
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white glass-hover'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Dashboard
              </button>
            )}
          </div>
        )}

        {/* Right Side: Sync status, profile and logout */}
        <div className="flex items-center gap-3">
          {user && syncQueueLength > 0 && (
            <button
              id="sync-queue-btn"
              onClick={onTriggerSync}
              disabled={isProcessingSync}
              className="flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 px-3 py-1 text-[11px] font-mono text-orange-400 hover:bg-orange-500/20 transition-all cursor-pointer"
              title="Click to process pending sync items to Google Calendar"
            >
              <RefreshCw className={`h-3 w-3 ${isProcessingSync ? 'animate-spin' : ''}`} />
              <span>{syncQueueLength} sync pending</span>
            </button>
          )}

          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-white/10" id="user-profile-widget">
              <div className="text-right">
                <div className="text-xs font-medium text-slate-200">{user.name}</div>
                <div className="flex items-center justify-end gap-1">
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : user.role === 'scheduler'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-all border border-white/10"
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
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'schedule'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
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
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
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
            className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
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
              className={`flex-shrink-0 flex justify-center items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
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
