import React from 'react';
import {
  Layers,
  ShieldCheck,
  CalendarRange,
  Clock,
  RefreshCw,
  AlertCircle,
  Info,
  ExternalLink,
  Lock,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  FileText,
  Sparkles,
  HeartHandshake,
  Calendar,
  Building2,
  Check
} from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export default function LoginView({
  onLogin,
  isLoading,
  errorMessage,
  onOpenPrivacy,
  onOpenTerms
}: LoginViewProps) {
  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenPrivacy) {
      onOpenPrivacy();
    } else {
      window.location.hash = '#privacy';
    }
  };

  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenTerms) {
      onOpenTerms();
    } else {
      window.location.hash = '#terms';
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden" id="public-app-homepage">
      {/* Background Mesh Gradient */}
      <div className="mesh-bg fixed inset-0 pointer-events-none opacity-40" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-nobg.png" alt="DutyFlow Logo" className="h-9 w-9 object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-white tracking-tight font-display">DutyFlow</span>
              <span className="text-[10px] text-teal-400 font-mono font-medium hidden sm:inline-block">Hospital Duty &amp; Roster Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button onClick={() => scrollToSection('features')} className="hover:text-teal-400 transition-colors cursor-pointer">
              App Features
            </button>
            <button onClick={() => scrollToSection('data-transparency')} className="hover:text-teal-400 transition-colors cursor-pointer">
              iCalendar Subscription
            </button>
            <a href="#privacy" onClick={handlePrivacyClick} className="hover:text-teal-400 transition-colors cursor-pointer" id="header-privacy-link">
              Privacy Policy
            </a>
            <a href="#terms" onClick={handleTermsClick} className="hover:text-teal-400 transition-colors cursor-pointer" id="header-terms-link">
              Terms of Service
            </a>
          </nav>

          <button
            onClick={onLogin}
            disabled={isLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
            id="header-signin-btn"
          >
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            <span>Sign In to App</span>
          </button>
        </div>
      </header>

      {/* Main Public Homepage Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 relative z-10">

        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span>Collaborative Healthcare Staff Scheduling &amp; Duty Roster Platform</span>
          </div>

          <div className="inline-flex items-center justify-center my-2">
            <img src="/logo-appicon.png" alt="DutyFlow Icon" className="h-20 w-20 rounded-3xl shadow-2xl shadow-teal-500/20 border border-white/10 object-cover" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display leading-tight">
            DutyFlow — Clinical Duty Scheduling &amp; <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">iCalendar Sync</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            <strong>DutyFlow</strong> is an enterprise clinical schedule coordinator engineered for hospitals and medical teams. Easily publish duty rosters, manage shift availability, execute peer-to-peer shift swaps, and seamlessly sync duty shifts to your calendar via .ics subscription.
          </p>

          {/* Action Cards / Login Call-to-action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              id="hero-google-signin-btn"
              onClick={onLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3.5 px-6 rounded-2xl border border-slate-200 shadow-xl hover:bg-slate-100 active:bg-slate-200 transition-all cursor-pointer text-xs font-sans disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-slate-700" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              )}
              <span>{isLoading ? 'Authenticating...' : 'Sign in with Google'}</span>
            </button>

            <button
              onClick={() => scrollToSection('data-transparency')}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold py-3.5 px-6 rounded-2xl transition-all cursor-pointer text-xs"
            >
              <span>Learn About Data Usage</span>
              <ArrowRight className="h-3.5 w-3.5 text-teal-400" />
            </button>
          </div>

          {errorMessage && (
            <div className="max-w-md mx-auto mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2 text-left" id="login-error-banner">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

        {/* Feature Overview Section (Satisfies requirement: "Fully describe your app's functionality to users") */}
        <section id="features" className="space-y-8 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">Comprehensive Clinical Roster Management</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Everything medical departments need to maintain smooth operational shifts, transparent duty allocations, and error-free calendar sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass p-6 rounded-3xl border border-white/10 space-y-4 hover:border-teal-500/40 transition-colors">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <CalendarRange className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">1. Interactive Shift Scheduler</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hospital administrators and schedulers can design, draft, edit, and publish monthly duty rosters with real-time conflict detection across department groups.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass p-6 rounded-3xl border border-white/10 space-y-4 hover:border-emerald-500/40 transition-colors">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">2. Shift Swapping &amp; Pooled Roster</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Doctors and medical staff can trade assigned shifts or claim unassigned pool duties with administrative workflow approvals to ensure continuous hospital coverage.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass p-6 rounded-3xl border border-white/10 space-y-4 hover:border-cyan-500/40 transition-colors">
              <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">3. iCalendar (.ics) Integration</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Subscribe to your live DutyFlow schedule using a private, read-only iCalendar (.ics) link, compatible with Apple Calendar, Outlook, and Google Calendar.
              </p>
            </div>
          </div>
        </section>

        {/* Detailed Data Transparency Section (Satisfies requirement: "Explain with transparency the purpose for which your app requests user data") */}
        <section id="data-transparency" className="glass p-6 sm:p-10 rounded-3xl border border-teal-500/30 bg-slate-900/80 shadow-2xl space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display">Privacy-First iCalendar (.ics) Integration</h2>
              <p className="text-xs text-teal-400 font-mono">Read-Only Calendar Subscription Feed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-teal-400" />
                No OAuth Required
              </h4>
              <p>DutyFlow provides calendar sync without requesting invasive OAuth permissions to your personal accounts.</p>
              <ul className="space-y-2 font-mono text-[11px]">
                <li className="bg-slate-950/80 p-2.5 rounded-xl border border-white/10 text-teal-300">
                  <strong>Private .ics Link</strong>
                  <span className="block font-sans text-slate-300 text-[11px] mt-1 font-normal">
                    You receive a unique, private link that can be added to any calendar app. Your calendar app pulls the data; DutyFlow never pushes or reads from your calendar.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                How Your Data Is Protected
              </h4>
              <div className="space-y-2 font-sans text-[11px]">
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Zero Third-Party Sharing:</strong> We do not sell, rent, trade, or share user data with any third-party advertisers or data brokers.</span>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>No AI Model Training:</strong> Your data is strictly isolated and never utilized for training artificial intelligence models or machine learning datasets.</span>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Full User Control:</strong> You can regenerate your private .ics link at any time to invalidate old subscriptions.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Policy Link Callout */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              For complete details on privacy guarantees, view our official documentation:
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#privacy"
                onClick={handlePrivacyClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 underline underline-offset-4 cursor-pointer"
                id="body-privacy-policy-link"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Read Full Privacy Policy</span>
              </a>
              <a
                href="#terms"
                onClick={handleTermsClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 underline underline-offset-4 cursor-pointer"
                id="body-terms-service-link"
              >
                <span>Terms of Service</span>
              </a>
            </div>
          </div>
        </section>

        {/* Live Interactive Roster Visual Demonstration Card */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white font-display">Hospital Shift Roster Interface Preview</h2>
            <p className="text-xs text-slate-400">See how DutyFlow organizes hospital rosters and handles calendar synchronization</p>
          </div>

          <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[11px] font-mono text-teal-400 uppercase font-semibold">Morning Shift (07:00 - 15:00)</div>
                <div className="text-sm font-bold text-white">Emergency Department</div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                  <span>Duty Staff: Dr. Sarah Jenkins</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">Available in .ics Feed</span>
                </div>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">Evening Shift (15:00 - 23:00)</div>
                <div className="text-sm font-bold text-white">Intensive Care Unit</div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                  <span>Duty Staff: Dr. Marcus Vance</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">Available in .ics Feed</span>
                </div>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[11px] font-mono text-purple-400 uppercase font-semibold">On-Call Duty (23:00 - 07:00)</div>
                <div className="text-sm font-bold text-white">Pediatrics Ward</div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                  <span>Duty Staff: Dr. Elena Rostova</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">Available in .ics Feed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer (Satisfies Privacy Policy Link requirements) */}
      <footer className="border-t border-white/10 bg-slate-950 py-8 px-4 sm:px-8 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/logo-nobg.png" alt="DutyFlow Logo" className="h-6 w-6 object-contain" />
            <span className="font-bold text-white font-display">DutyFlow Platform</span>
            <span>&bull;</span>
            <span>Hospital Staff Shift Scheduler</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a
              href="#privacy"
              onClick={handlePrivacyClick}
              className="text-slate-300 hover:text-teal-400 transition-colors cursor-pointer"
              id="footer-privacy-policy-link"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              onClick={handleTermsClick}
              className="text-slate-300 hover:text-teal-400 transition-colors cursor-pointer"
              id="footer-terms-service-link"
            >
              Terms of Service
            </a>
            <a
              href="mailto:ofbperth@gmail.com"
              className="text-slate-300 hover:text-teal-400 transition-colors cursor-pointer"
            >
              Contact Support
            </a>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            &copy; 2026 DutyFlow. Privacy-First Calendar Sync.
          </div>
        </div>
      </footer>
    </div>
  );
}

