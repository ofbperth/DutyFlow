import React from 'react';
import { Scale, ArrowLeft, FileText, Calendar, ShieldCheck, AlertTriangle, Building2, CheckCircle2, Mail, ExternalLink } from 'lucide-react';

interface TermsOfServiceViewProps {
  onBack?: () => void;
}

export default function TermsOfServiceView({ onBack }: TermsOfServiceViewProps) {
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '';
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-200 py-8 px-4 sm:px-6 lg:px-8 font-sans relative" id="terms-of-service-view">
      <div className="mesh-bg" />
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-colors text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            id="terms-back-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold uppercase tracking-wider">
              Terms & Conditions
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="glass border border-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">DutyFlow Terms of Service</h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Last Updated: July 26, 2026 &bull; Effective Date: July 26, 2026</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-4">
              Welcome to DutyFlow. These Terms of Service ("Terms") govern your access to and use of the DutyFlow clinical duty scheduling platform, mobile-web application, and integrated iCalendar synchronization service. By signing in, accessing, or using DutyFlow, you agree to be bound by these Terms.
            </p>
          </div>

          {/* Section 1: Acceptance & Service Overview */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Building2 className="h-4 w-4 text-blue-400" />
              1. Acceptance of Terms & Eligibility
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow is designed for healthcare professionals, hospital doctors, residents, nurses, and medical department schedulers. By using this service, you represent that:
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>You are an authorized medical practitioner or administrative staff member authorized by your department or hospital unit.</li>
                <li>You have the authority to submit shift availability preferences and participate in assigned duty schedules.</li>
                <li>You agree to comply with all applicable local hospital policies, clinical duty hour regulations, and labor guidelines.</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Platform Scope & Medical Disclaimer */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              2. Description of Service & Medical Disclaimer
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow provides administrative workforce scheduling, shift allocation matrix visualization, availability preference submission, pooled shift trade boards, and automated iCalendar (.ics) subscription feeds.
              </p>
              <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-300 font-display">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  IMPORTANT MEDICAL & CLINICAL DISCLAIMER
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  DutyFlow is purely an operational administrative scheduling software tool. It does <strong>NOT</strong> provide medical diagnosis, clinical decision support, or patient care instructions. DutyFlow does not override emergency medical protocols or hospital chief-of-service clinical directives.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Calendar className="h-4 w-4 text-emerald-400" />
              3. Calendar Integration Terms
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow enables users to subscribe to their schedule via a private iCalendar (.ics) link.
              </p>
              <ul className="list-disc pl-4 space-y-2">
                <li>
                  <strong className="text-white">Calendar Synchronization:</strong> When subscribed, your calendar application will read your DutyFlow shift events from the secure .ics link.
                </li>
                <li>
                  <strong className="text-white">User Responsibility:</strong> You are responsible for ensuring that your calendar link is kept secure and not shared with unauthorized parties.
                </li>
                <li>
                  <strong className="text-white">Revocation:</strong> You may regenerate your .ics link at any time within the DutyFlow Settings portal to revoke access from previously configured calendar applications.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: User Accounts & Security */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              4. Account Security & User Conduct
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>When using DutyFlow, you agree to:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Maintain the confidentiality of your Google account sign-in credentials.</li>
                <li>Submit accurate availability dates and prompt shift swap notifications to your hospital colleagues.</li>
                <li>Refrain from attempting to bypass role permissions or access unauthorized administrative functions.</li>
                <li>Not upload, post, or transmit any malicious code, unauthorized scripts, or sensitive Patient Protected Health Information (PHI/HIPAA data) into shift titles or comments.</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Shift Swaps & Hospital Workflow Rules */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              5. Shift Trades & Schedule Management
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>
                Shift trade requests and swap operations conducted on DutyFlow are subject to final approval by designated hospital unit schedulers or administrators. DutyFlow is not responsible for unfulfilled shift trades or staffing shortages resulting from unapproved swap requests.
              </p>
            </div>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <FileText className="h-4 w-4 text-rose-400" />
              6. Intellectual Property & Limitation of Liability
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow and its original interface, visual elements, icons, algorithms, and documentation are protected by intellectual property laws.
              </p>
              <p>
                To the maximum extent permitted by law, DutyFlow and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, missed work shifts, calendar synchronization delays, or operational disruptions arising from your use of the platform.
              </p>
            </div>
          </section>

          {/* Section 7: Modifications & Termination */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Scale className="h-4 w-4 text-indigo-400" />
              7. Term, Termination & Policy Updates
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>
                We reserve the right to update or modify these Terms at any time to reflect software updates or legal compliance needs. Continued use of DutyFlow following updated Terms constitutes acceptance of the modified agreement.
              </p>
            </div>
          </section>

          {/* Section 8: Governing Law & Support Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Mail className="h-4 w-4 text-blue-400" />
              8. Contact Information & Legal Inquiries
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>For questions or formal inquiries regarding these Terms of Service, please contact our support team:</p>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-slate-300 font-mono text-xs space-y-1">
                <div><strong>Application:</strong> DutyFlow Hospital Staff Scheduler</div>
                <div><strong>Support Contact Email:</strong> ofbperth@gmail.com</div>
                <div><strong>Privacy Policy Link:</strong> <a href="#privacy" className="text-blue-400 underline">Privacy Policy</a></div>
              </div>
            </div>
          </section>

          {/* Bottom Back Button */}
          <div className="pt-6 border-t border-white/10 flex justify-center">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold transition-colors text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to DutyFlow Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
