import { useRef } from 'react';
import { ArrowRightLeft, Calendar, Clock, Layers, Settings, Shield, UserRound } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

const destinations = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'pooled', label: 'Pooled', icon: Layers },
  { id: 'availability', label: 'Availability', icon: Clock },
  { id: 'swaps', label: 'Swaps', icon: ArrowRightLeft },
];

export default function Navbar({ user, onLogout, activeTab, setActiveTab, onOpenPrivacy, onOpenTerms }: NavbarProps) {
  const profile = useRef<HTMLDetailsElement>(null);

  const runProfileAction = (action: () => void) => {
    if (profile.current) profile.current.open = false;
    action();
  };

  return (
    <header id="main-nav" className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2 sm:px-6 lg:grid-cols-[auto_1fr_auto]">
        <button type="button" className="flex min-h-10 items-center gap-2 justify-self-start text-base font-bold" onClick={() => setActiveTab('schedule')}>
          <img src="/logo-nobg.png" alt="" className="h-7 w-7 object-contain" />
          DutyFlow
        </button>
        {user && (
          <nav aria-label="Main navigation" className="col-span-2 row-start-2 grid grid-cols-4 gap-1 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex lg:justify-center">
            {destinations.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" id={`tab-${id}-btn`} aria-current={activeTab === id ? 'page' : undefined}
                className="duty-nav-link" onClick={() => setActiveTab(id)}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        )}
        <details ref={profile} className="relative col-start-2 row-start-1 justify-self-end lg:col-start-3" onKeyDown={event => {
          if (event.key === 'Escape' && profile.current?.open) {
            profile.current.open = false;
            profile.current.querySelector('summary')?.focus();
          }
        }}>
          <summary className="duty-control flex list-none items-center gap-2 cursor-pointer" aria-label={user ? 'Profile and settings' : 'App information'}>
            <UserRound size={16} aria-hidden="true" />
            <span className="max-w-36 truncate text-sm">{user?.name || 'Info'}</span>
          </summary>
          <div className="absolute right-0 top-full mt-2 grid w-52 gap-1 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-lg">
            {user && (
              <>
                <button type="button" className="duty-menu-item" onClick={() => runProfileAction(() => setActiveTab('settings'))}><Settings size={16} /> Settings</button>
                {user.role === 'admin' && (
                  <button type="button" className="duty-menu-item" onClick={() => runProfileAction(() => setActiveTab('admin'))}><Shield size={16} /> Admin</button>
                )}
              </>
            )}
            <button type="button" className="duty-menu-item" onClick={() => runProfileAction(onOpenPrivacy ?? (() => { window.location.hash = '#privacy'; }))}>Privacy</button>
            <button type="button" className="duty-menu-item" onClick={() => runProfileAction(onOpenTerms ?? (() => { window.location.hash = '#terms'; }))}>Terms</button>
            {user && <button type="button" className="duty-menu-item" onClick={() => runProfileAction(onLogout)}>Sign out</button>}
          </div>
        </details>
      </div>
    </header>
  );
}
