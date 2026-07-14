import React from 'react';
import { Layers, ShieldCheck, CalendarRange, Clock, RefreshCw } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
  isLoading: boolean;
}

export default function LoginView({ onLogin, isLoading }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans relative" id="login-view-container">
      <div className="mesh-bg" />
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 mb-4 animate-pulse">
            <Layers className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-display">DutyFlow</h1>
          <p className="text-sm font-mono text-slate-300 uppercase tracking-widest font-semibold">Collaborative Hospital Duty Scheduler</p>
        </div>

        {/* Feature Grid & Sign-In Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full glass p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl items-center">
          {/* Left: Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-100 font-display tracking-tight">Zero-Friction Medical Scheduling</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed specifically for medical environments, DutyFlow coordinates complex rotations, tracks availability, manages shift trades, and syncs directly to your own Google Calendar dynamically.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
                  <CalendarRange className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Interactive Planner</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">Drag & drop scheduler with split-view drafts to compare modifications before going live.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Availability Preferences</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">Submit available, unavailable, or preferred shifts straight to the ward lead.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-white/10 flex items-center justify-center text-purple-400 shrink-0">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Google Calendar Sync</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">Publishing automatic, real-time incremental synchronizations of hospital shifts.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sign-In Box */}
          <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
            <ShieldCheck className="h-10 w-10 text-blue-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Secure Sign In</h3>
            <p className="text-[11px] text-slate-400 mb-6">
              DutyFlow uses Google Auth to securely identify you and synchronize schedules to your selected calendar calendar.
            </p>

            {/* Official GSI Style button */}
            <button
              id="google-signin-btn"
              onClick={onLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-medium py-3 px-4 rounded-xl border border-slate-200 shadow hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer text-xs font-sans disabled:opacity-50 font-semibold"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              )}
              {isLoading ? 'Connecting...' : 'Sign in with Google'}
            </button>

            <div className="mt-4 text-[10px] text-slate-500 font-mono tracking-wider">
              AUTHORIZED BY FIREBASE SECURITY
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-[11px] text-slate-500 border-t border-white/5 pt-6 relative z-10">
        <div>DutyFlow Duty Management Console &bull; Registered Web App</div>
        <div className="font-mono text-[9px] text-blue-400/70 mt-1 uppercase tracking-widest font-semibold">
          ESTABLISHED 2026 &bull; SECURE WORKSPACE
        </div>
      </footer>
    </div>
  );
}
