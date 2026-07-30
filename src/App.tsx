import React, { useState, useEffect } from 'react';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  fetchUsers,
  fetchUserById,
  saveUser,
  fetchShiftTemplates,
  fetchShifts,
  fetchAvailabilities,
  fetchShiftSwaps,
  fetchHolidays,
  fetchSchedulePeriod,
  saveSchedulePeriod,
  seedInitialData,
  testFirestoreConnection,
  getDoctorGroups,
  getRotationAssignments,
  updateUserRole
} from './firebase';
import { User, ShiftTemplate, Shift, Availability, ShiftSwap, Holiday, Role, SchedulePeriod, DoctorGroup, GroupRotationAssignment } from './types';

import Navbar from './components/Navbar';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import SchedulerDashboard from './components/SchedulerDashboard';
import UserDashboard from './components/UserDashboard';
import PooledShiftsDashboard from './components/PooledShiftsDashboard';
import PrivacyPolicyView from './components/PrivacyPolicyView';
import TermsOfServiceView from './components/TermsOfServiceView';
import { RefreshCw, AlertCircle, Sparkles, Layers } from 'lucide-react';

const getPublicPageFromUrl = (): 'privacy' | 'terms' | null => {
  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  const pageParam = search.get('page')?.toLowerCase() || search.get('view')?.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('privacy') || pageParam === 'privacy' || hash === '#privacy') {
    return 'privacy';
  }
  if (path.includes('terms') || pageParam === 'terms' || hash === '#terms') {
    return 'terms';
  }
  return null;
};

export default function App() {
  // Public Routing State (accessible without login for Google App Verification)
  const [publicPage, setPublicPage] = useState<'privacy' | 'terms' | null>(getPublicPageFromUrl());

  useEffect(() => {
    const handleLocationChange = () => {
      setPublicPage(getPublicPageFromUrl());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleBackFromPublicPage = () => {
    setPublicPage(null);
    if (window.location.hash) {
      window.location.hash = '';
    }
    if (window.location.search.includes('page=') || window.location.search.includes('view=')) {
      window.history.pushState({}, '', window.location.pathname);
    }
    if (window.location.pathname === '/privacy' || window.location.pathname === '/terms') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOpenPrivacy = () => {
    window.location.hash = '#privacy';
    setPublicPage('privacy');
  };

  const handleOpenTerms = () => {
    window.location.hash = '#terms';
    setPublicPage('terms');
  };

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Database state
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod | null>(null);
  const [groups, setGroups] = useState<DoctorGroup[]>([]);
  const [rotationAssignments, setRotationAssignments] = useState<GroupRotationAssignment[]>([]);


  // UI state
  const [activeTab, setActiveTab] = useState<string>('schedule');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Initialize and Seed data
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await testFirestoreConnection();
      } catch (err: any) {
        console.error('Initial bootstrapping failed:', err);
      }
    };
    bootstrap();
  }, []);

  // Sync state observer for user auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser) => {
        setIsAuthLoading(true);
        try {
          // Load profile or create a default one
          let profile = await fetchUserById(firebaseUser.uid);

          if (!profile) {
            console.log('No user profile found. Creating a default entry in Firestore.');
            // Auto-promote the specified primary developer email to Admin, others to standard User
            const userEmail = firebaseUser.email || '';
            const isDevAdmin = userEmail.toLowerCase() === 'ofbperth@gmail.com';

            profile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Anonymous Doctor',
              email: userEmail,
              role: isDevAdmin ? 'admin' : 'user',
              isVirtual: false,
              createdAt: new Date().toISOString()
            };
            await saveUser(profile);
          }

          // Set current user FIRST so the app can render even if seeding fails
          setCurrentUser(profile);

          // Only run seed for admin/scheduler to avoid permission-denied writes for regular users
          if (profile.role === 'admin' || profile.role === 'scheduler') {
            await seedInitialData();
          }
          await loadAllData();
        } catch (err: any) {
          console.error('Error handling auth state change:', err);
          setErrorMessage('Could not load user profile from Firestore.');
        } finally {
          setIsAuthLoading(false);
        }
      },
      () => {
        setCurrentUser(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch all hospital entities
  const loadAllData = async () => {
    setIsDataLoading(true);
    try {
      const [u, t, s, a, sw, h, sp, grps, rotAsgmts] = await Promise.all([
        fetchUsers(),
        fetchShiftTemplates(),
        fetchShifts(),
        fetchAvailabilities(),
        fetchShiftSwaps(),
        fetchHolidays(),
        fetchSchedulePeriod(),
        getDoctorGroups(),
        getRotationAssignments('current')
      ]);

      setUsers(u);
      setTemplates(t);
      setShifts(s);
      setAvailabilities(a);
      setSwaps(sw);
      setHolidays(h);
      setSchedulePeriod(sp);
      setGroups(grps);
      setRotationAssignments(rotAsgmts);

      setErrorMessage('');

    } catch (err: any) {
      console.error('Error loading Firestore collections:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        setErrorMessage('Database access denied (Missing or insufficient permissions). Please check Firestore rules.');
      } else {
        setErrorMessage('Database connection slow. Attempting reconnection...');
      }
    } finally {
      setIsDataLoading(false);
    }
  };

  // Login handler
  const handleLogin = async () => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        // Reload directories
        await loadAllData();
      }
    } catch (err: any) {
      console.error('Login error details:', err);
      const msg = err?.code ? `[${err.code}] ${err.message}` : (err?.message || 'Sign-in cancelled or credentials refused by provider.');
      setErrorMessage(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Role Change handler
  const handleRoleChange = async (newRole: Role) => {
    if (!currentUser) return;
    try {
      await updateUserRole(currentUser.id, newRole);
      setCurrentUser({ ...currentUser, role: newRole });
    } catch (err: any) {
      console.error('Error updating role:', err);
      setErrorMessage('Could not update user role.');
    }
  };

  // Render public Privacy and Terms pages directly if requested via URL, hash, or state
  if (publicPage === 'privacy') {
    return <PrivacyPolicyView onBack={handleBackFromPublicPage} />;
  }

  if (publicPage === 'terms') {
    return <TermsOfServiceView onBack={handleBackFromPublicPage} />;
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center font-sans text-white relative">
        <div className="mesh-bg" />
        <div className="glass border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative">
          <div className="relative mb-4">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 blur opacity-75 animate-pulse" />
            <img src="/logo-nobg.png" alt="DutyFlow Loading" className="relative h-14 w-14 object-contain animate-bounce" />
          </div>
          <div className="text-sm font-bold text-slate-100 font-display">Initializing DutyFlow Platform</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Synchronizing rosters & directories...</div>
        </div>
      </div>
    );
  }

  // If not logged in, show elegant medical themed sign-in
  if (!currentUser) {
    return (
      <LoginView
        onLogin={handleLogin}
        isLoading={isAuthLoading}
        errorMessage={errorMessage}
        onOpenPrivacy={handleOpenPrivacy}
        onOpenTerms={handleOpenTerms}
      />
    );
  }

  // Navigation tab configurations based on user permissions
  const renderDashboard = () => {
    if (activeTab === 'admin' && currentUser.role === 'admin') {
      return (
        <AdminDashboard
          currentUser={currentUser}
          users={users}
          templates={templates}
          holidays={holidays}
          schedulePeriod={schedulePeriod}
          groups={groups}
          rotationAssignments={rotationAssignments}
          onRefresh={loadAllData}
        />
      );
    }

    if (activeTab === 'schedule' && (currentUser.role === 'admin' || currentUser.role === 'scheduler')) {
      return (
        <SchedulerDashboard
          currentUser={currentUser}
          users={users}
          templates={templates}
          shifts={shifts}
          availabilities={availabilities}
          holidays={holidays}
          schedulePeriod={schedulePeriod}
          groups={groups}
          rotationAssignments={rotationAssignments}
          onRefresh={loadAllData}
        />
      );
    }

    if (activeTab === 'pooled') {
      return (
        <PooledShiftsDashboard
          currentUser={currentUser}
          users={users}
          templates={templates}
          shifts={shifts}
          availabilities={availabilities}
          holidays={holidays}
          onRefresh={loadAllData}
        />
      );
    }

    // Default or Fallback to User Portal
    return (
      <UserDashboard
        currentUser={currentUser}
        users={users}
        templates={templates}
        shifts={shifts}
        availabilities={availabilities}
        swaps={swaps}
        holidays={holidays}
        schedulePeriod={schedulePeriod}
        groups={groups}
        rotationAssignments={rotationAssignments}
        onRefresh={loadAllData}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onOpenPrivacy={handleOpenPrivacy}
        onOpenTerms={handleOpenTerms}
      />
    );
  };


  return (
    <div className="min-h-screen bg-transparent text-slate-200 flex flex-col font-sans select-none pb-12 relative" id="app-root">
      <div className="mesh-bg" />
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRoleChange={handleRoleChange}
        onOpenPrivacy={handleOpenPrivacy}
        onOpenTerms={handleOpenTerms}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6">
        {/* Sync or system notifications */}
        {infoMessage && (
          <div className="mb-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 p-4 text-xs text-teal-400 flex items-center gap-2 animate-fade-in" id="app-info-banner">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-400 flex items-center gap-2 animate-fade-in" id="app-error-banner">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Global Loading overlay if fetching */}
        {isDataLoading && (
          <div className="mb-4 flex items-center justify-center gap-2 text-xs text-teal-400 font-mono" id="app-global-loader">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Refreshing active hospital rosters...</span>
          </div>
        )}

        {/* Render selected workspace */}
        <div id="active-workspace-panel" className="animate-fade-in">
          {renderDashboard()}
        </div>
      </main>
    </div>
  );
}
