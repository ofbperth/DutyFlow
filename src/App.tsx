import React, { useState, useEffect } from 'react';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  setCachedToken,
  getAccessToken,
  fetchUsers,
  saveUser,
  fetchDepartments,
  fetchShiftTemplates,
  fetchShifts,
  fetchAvailabilities,
  fetchShiftSwaps,
  fetchHolidays,
  fetchSchedulePeriod,
  saveSchedulePeriod,
  seedInitialData,
  testFirestoreConnection
} from './firebase';
import { getSyncQueue, addToSyncQueue, processSyncQueue, SyncTask } from './googleCalendar';
import { User, Department, ShiftTemplate, Shift, Availability, ShiftSwap, Holiday, Role, SchedulePeriod } from './types';

import Navbar from './components/Navbar';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import SchedulerDashboard from './components/SchedulerDashboard';
import UserDashboard from './components/UserDashboard';
import { RefreshCw, AlertCircle, Sparkles, Layers } from 'lucide-react';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Database state
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod | null>(null);


  // UI state
  const [activeTab, setActiveTab] = useState<string>('schedule');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Sync Queue state
  const [syncQueue, setSyncQueue] = useState<SyncTask[]>([]);
  const [isProcessingSync, setIsProcessingSync] = useState(false);

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

    // Check localStorage sync queue length on launch
    setSyncQueue(getSyncQueue());
  }, []);

  // Sync state observer for user auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setIsAuthLoading(true);
        try {
          if (token) {
            setGoogleToken(token);
            setCachedToken(token);
          }

          // Load profile or create a default one
          const currentUsersList = await fetchUsers();
          let profile = currentUsersList.find(u => u.id === firebaseUser.uid);

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
              departmentId: 'dept-general', // default to general
              isVirtual: false,
              googleCalendarId: 'primary',
              createdAt: new Date().toISOString()
            };
            await saveUser(profile);
          }

          setCurrentUser(profile);

          // Now that user is authenticated, seed and load all database entities
          await seedInitialData();
          await loadAllData();

          // Once profile is loaded, check if we have scopes & process sync queue
          if (token) {
            await handleTriggerQueueSync(token);
          }
        } catch (err: any) {
          console.error('Error handling auth state change:', err);
          setErrorMessage('Could not load user profile from Firestore.');
        } finally {
          setIsAuthLoading(false);
        }
      },
      () => {
        setCurrentUser(null);
        setGoogleToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch all hospital entities
  const loadAllData = async () => {
    setIsDataLoading(true);
    try {
      const [u, d, t, s, a, sw, h, sp] = await Promise.all([
        fetchUsers(),
        fetchDepartments(),
        fetchShiftTemplates(),
        fetchShifts(),
        fetchAvailabilities(),
        fetchShiftSwaps(),
        fetchHolidays(),
        fetchSchedulePeriod()
      ]);

      setUsers(u);
      setDepartments(d);
      setTemplates(t);
      setShifts(s);
      setAvailabilities(a);
      setSwaps(sw);
      setHolidays(h);
      setSchedulePeriod(sp);

      setErrorMessage('');

    } catch (err: any) {
      console.error('Error loading Firestore collections:', err);
      setErrorMessage('Database connection slow. Attempting reconnection...');
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
        setGoogleToken(result.accessToken);
        setCachedToken(result.accessToken);
        // Reload directories
        await loadAllData();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Sign-in cancelled or credentials refused by provider.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Google Calendar Sync Queue Trigger
  const handleTriggerQueueSync = async (overrideToken?: string) => {
    const token = overrideToken || googleToken;
    if (!token) {
      // Prompt user to link calendar
      setInfoMessage('Please click "Authorize Calendar Sync" in your Settings tab to sync pending duty schedules.');
      setTimeout(() => setInfoMessage(''), 6000);
      return;
    }

    setIsProcessingSync(true);
    try {
      const { successCount, failureCount } = await processSyncQueue(
        token,
        shifts,
        templates,
        departments,
        (taskId) => {
          console.log(`Sync task ${taskId} finished successfully.`);
        },
        (taskId, err) => {
          console.error(`Sync task ${taskId} failed:`, err);
        }
      );

      setSyncQueue(getSyncQueue());
      if (successCount > 0) {
        setInfoMessage(`Calendar synchronized: updated ${successCount} duty items.`);
        setTimeout(() => setInfoMessage(''), 5000);
      }
    } catch (err) {
      console.error('Queue processing crashed:', err);
    } finally {
      setIsProcessingSync(false);
    }
  };

  // Queue a new Google Calendar Sync task from child scheduler dashboard
  const handleQueueCalendarSync = (task: { shiftId: string; action: 'create' | 'update' | 'delete'; calendarId: string }) => {
    addToSyncQueue(task);
    setSyncQueue(getSyncQueue());

    // Auto trigger if token exists
    if (googleToken) {
      handleTriggerQueueSync();
    } else {
      setInfoMessage('Shift published and queued. Sign in to Google Calendar in Settings tab to authorize automatic synchronizations.');
      setTimeout(() => setInfoMessage(''), 8000);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center font-sans text-white relative">
        <div className="mesh-bg" />
        <div className="glass border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-4 animate-spin">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div className="text-sm font-bold text-slate-100 font-display">Initializing DutyFlow Platform</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Synchronizing rosters & directories...</div>
        </div>
      </div>
    );
  }

  // If not logged in, show elegant medical themed sign-in
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} isLoading={isAuthLoading} />;
  }

  // Navigation tab configurations based on user permissions
  const renderDashboard = () => {
    if (activeTab === 'admin' && currentUser.role === 'admin') {
      return (
        <AdminDashboard
          currentUser={currentUser}
          users={users}
          departments={departments}
          templates={templates}
          holidays={holidays}
          schedulePeriod={schedulePeriod}
          onRefresh={loadAllData}
        />
      );
    }

    if (activeTab === 'schedule' && (currentUser.role === 'admin' || currentUser.role === 'scheduler')) {
      return (
        <SchedulerDashboard
          currentUser={currentUser}
          users={users}
          departments={departments}
          templates={templates}
          shifts={shifts}
          availabilities={availabilities}
          holidays={holidays}
          schedulePeriod={schedulePeriod}
          onRefresh={loadAllData}
          onQueueSync={handleQueueCalendarSync}
        />
      );
    }

    // Default or Fallback to User Portal
    return (
      <UserDashboard
        currentUser={currentUser}
        users={users}
        departments={departments}
        templates={templates}
        shifts={shifts}
        availabilities={availabilities}
        swaps={swaps}
        holidays={holidays}
        googleAccessToken={googleToken}
        schedulePeriod={schedulePeriod}
        onRefresh={loadAllData}
        onTriggerCalendarSync={handleLogin} // Reuse OAuth popup
        activeTab={activeTab}
      />
    );
  };


  return (
    <div className="min-h-screen bg-transparent text-slate-200 flex flex-col font-sans select-none pb-12 relative" id="app-root">
      <div className="mesh-bg" />
      <Navbar
        user={currentUser}
        syncQueueLength={syncQueue.length}
        isProcessingSync={isProcessingSync}
        onTriggerSync={() => handleTriggerQueueSync()}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
