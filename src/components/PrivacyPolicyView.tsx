import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, Database, Calendar, Mail, FileText, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export default function PrivacyPolicyView({ onBack }: PrivacyPolicyViewProps) {
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '';
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-200 py-8 px-4 sm:px-6 lg:px-8 font-sans relative" id="privacy-policy-view">
      <div className="mesh-bg" />
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-colors text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            id="privacy-back-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold uppercase tracking-wider">
              Privacy-First Architecture
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="glass border border-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">DutyFlow Privacy Policy</h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Last Updated: July 26, 2026 &bull; Effective Date: July 26, 2026</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-4">
              DutyFlow ("we", "our", or "us") is dedicated to protecting the privacy and confidentiality of healthcare professionals and medical staff who use our clinical duty scheduling platform. This Privacy Policy explains how DutyFlow collects, uses, stores, and safeguards your information when you access our application and export your schedule.
            </p>
          </div>

          <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-400 font-display">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Data Protection Summary</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              DutyFlow uses a privacy-first iCalendar (.ics) integration strategy. We do not require invasive permissions to your personal calendar accounts. We do not sell user data, nor do we share user data with third-party AI models or advertisers.
            </p>
          </div>

          {/* Section 1: Information We Collect */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Database className="h-4 w-4 text-blue-400" />
              1. Information We Collect
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pl-6 border-l-2 border-white/10">
              <p>When you register and use DutyFlow, we collect minimal necessary data required for hospital duty scheduling:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>
                  <strong className="text-white">Account Identification Data:</strong> Your name, email address, and profile picture/avatar retrieved via Google OAuth sign-in to authenticate your identity in your hospital's scheduling directory.
                </li>
                <li>
                  <strong className="text-white">Hospital Roster & Availability Data:</strong> Shift assignments, duty preferences, unavailability dates, and shift swap requests submitted by you or assigned by hospital schedulers.
                </li>
                <li>
                  <strong className="text-white">Calendar Subscription Link:</strong> We generate a secure iCalendar (.ics) link for your schedule, which allows your calendar applications to read your schedule without DutyFlow needing access to your calendar.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: How We Use Your Data */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Calendar className="h-4 w-4 text-indigo-400" />
              2. How We Use Your Data
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>We use your information exclusively for functional duty coordination purposes:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Generating and rendering hospital rotation rosters and pooled shift boards.</li>
                <li>Processing availability preferences and calculating schedule conflicts.</li>
                <li>Executing peer-to-peer shift swaps and shift transfer approvals.</li>
                <li>Providing a secure iCalendar feed of confirmed work shifts for your calendar app.</li>
                <li>Displaying sync status and system notifications regarding schedule updates.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Lock className="h-4 w-4 text-purple-400" />
              3. Read-Only Calendar Integration
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow explicitly avoids requiring invasive OAuth permissions to your personal calendar accounts.
              </p>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2 font-sans">
                <div className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Integration Guarantees:
                </div>
                <ul className="list-disc pl-5 text-[11px] space-y-1.5 text-slate-300">
                  <li><strong className="text-white">No Push Access:</strong> DutyFlow does not push events to your calendar. Your calendar application pulls the .ics feed from DutyFlow.</li>
                  <li><strong className="text-white">No Third-Party Sharing:</strong> We do not transfer, share, or sell user data to any external parties, ad networks, data brokers, or information resellers.</li>
                  <li><strong className="text-white">No AI / LLM Training:</strong> We do not use user data to train, fine-tune, or refine artificial intelligence models or machine learning algorithms.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Zero Data Selling Commitment */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              4. Zero Data Selling Commitment
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow maintains a strict zero-data-monetization standard. We do not sell, rent, lease, trade, or monetize personal information. Your clinical roster data remains strictly your property and the property of your medical organization.
              </p>
            </div>
          </section>

          {/* Section 5: Data Storage, Retention & Deletion */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <RefreshCw className="h-4 w-4 text-amber-400" />
              5. Data Retention, Control & Account Deletion
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pl-6 border-l-2 border-white/10">
              <p>You maintain complete control over your connected Google Account and stored schedule preferences:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>
                  <strong className="text-white">Revoking Calendar Access:</strong> You may regenerate your iCalendar (.ics) link within DutyFlow at any time, which instantly invalidates the old link and stops unauthorized access.
                </li>
                <li>
                  <strong className="text-white">Data Deletion Requests:</strong> You can request permanent deletion of your profile and availability history by contacting our support team at <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-blue-300 text-[11px]">ofbperth@gmail.com</code>. Upon receipt, all associated user tokens and personal identifiers will be deleted within 30 days.
                </li>
                <li>
                  <strong className="text-white">Data Retention Period:</strong> We retain shift roster records only for active clinical schedule cycles and operational audits as required by hospital scheduling managers.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6: Security Standards */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              6. Security Standards
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed pl-6 border-l-2 border-white/10">
              <p>
                DutyFlow employs industry-standard encryption protocols (HTTPS/TLS) for data in transit and secure database access controls (Firebase Authentication and Firestore Security Rules).
              </p>
            </div>
          </section>

          {/* Section 7: Contact Information */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Mail className="h-4 w-4 text-teal-400" />
              7. Contact Information & Support
            </h2>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 pl-6 border-l-2 border-white/10">
              <p>If you have any questions, privacy inquiries, or data deletion requests regarding DutyFlow, please reach out to our team:</p>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-slate-300 font-mono text-xs space-y-1">
                <div><strong>Application Name:</strong> DutyFlow Hospital Staff Scheduler</div>
                <div><strong>Developer & Support Contact:</strong> ofbperth@gmail.com</div>
                <div><strong>Verification Status:</strong> Privacy-First Calendar Sync Compliant</div>
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
