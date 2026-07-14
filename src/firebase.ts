import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Department, ShiftTemplate, Shift, Availability, ShiftSwap, Holiday, SchedulePeriod } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// In-memory token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Listen to Auth State
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      console.warn('Could not get custom Google Calendar access token immediately from Firebase Auth result.');
      // Sometimes standard auth doesn't pack it or token is already in memory
    } else {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Set token manually (e.g. if we get it from credential or local memory fallback)
export const setCachedToken = (token: string) => {
  cachedAccessToken = token;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Logout
export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Validate Firestore Connection
export const testFirestoreConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('offline')) {
      console.error("Please check your Firebase configuration: Firestore client is offline.");
    }
  }
};

// Firestore CRUD Helpers

// Users
export const fetchUsers = async (): Promise<User[]> => {
  const q = query(collection(db, 'users'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const saveUser = async (user: User): Promise<void> => {
  await setDoc(doc(db, 'users', user.id), user);
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), data);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId));
};

// Departments
export const fetchDepartments = async (): Promise<Department[]> => {
  const snap = await getDocs(collection(db, 'departments'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
};

export const saveDepartment = async (dept: Department): Promise<void> => {
  await setDoc(doc(db, 'departments', dept.id), dept);
};

export const deleteDepartment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'departments', id));
};

// Shift Templates
export const fetchShiftTemplates = async (): Promise<ShiftTemplate[]> => {
  const snap = await getDocs(collection(db, 'shiftTemplates'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftTemplate));
};

export const saveShiftTemplate = async (template: ShiftTemplate): Promise<void> => {
  await setDoc(doc(db, 'shiftTemplates', template.id), template);
};

export const deleteShiftTemplate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'shiftTemplates', id));
};

// Shifts
export const fetchShifts = async (): Promise<Shift[]> => {
  const snap = await getDocs(collection(db, 'shifts'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
};

export const saveShift = async (shift: Shift): Promise<void> => {
  await setDoc(doc(db, 'shifts', shift.id), shift);
};

export const deleteShift = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'shifts', id));
};

// Availabilities
export const fetchAvailabilities = async (): Promise<Availability[]> => {
  const snap = await getDocs(collection(db, 'availabilities'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Availability));
};

export const saveAvailability = async (avail: Availability): Promise<void> => {
  await setDoc(doc(db, 'availabilities', avail.id), avail);
};

export const deleteAvailability = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'availabilities', id));
};

// Shift Swaps
export const fetchShiftSwaps = async (): Promise<ShiftSwap[]> => {
  const snap = await getDocs(collection(db, 'shiftSwaps'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftSwap));
};

export const saveShiftSwap = async (swap: ShiftSwap): Promise<void> => {
  await setDoc(doc(db, 'shiftSwaps', swap.id), swap);
};

export const deleteShiftSwap = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'shiftSwaps', id));
};

// Holidays
export const fetchHolidays = async (): Promise<Holiday[]> => {
  const snap = await getDocs(collection(db, 'holidays'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday));
};

export const saveHoliday = async (h: Holiday): Promise<void> => {
  await setDoc(doc(db, 'holidays', h.id), h);
};

export const deleteHoliday = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'holidays', id));
};

// Schedule Period / Rotations
export const fetchSchedulePeriod = async (): Promise<SchedulePeriod> => {
  const docRef = doc(db, 'config', 'schedulePeriod');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as SchedulePeriod;
  }
  // Default fallback schedule period
  return {
    id: 'current',
    title: 'July 2026 Rotation Cycle',
    startDate: '2026-07-01',
    endDate: '2026-07-14'
  };
};

export const saveSchedulePeriod = async (period: SchedulePeriod): Promise<void> => {
  await setDoc(doc(db, 'config', 'schedulePeriod'), period);
};


// Seeding Initial Data if Collections are Empty
export const seedInitialData = async () => {
  try {
    const depts = await fetchDepartments();
    if (depts.length === 0) {
      console.log('Seeding initial departments...');
      const initialDepts: Department[] = [
        { id: 'dept-general', name: 'General', color: '#3b82f6' }
      ];
      for (const d of initialDepts) {
        await saveDepartment(d);
      }
    }

    const templates = await fetchShiftTemplates();
    if (templates.length === 0) {
      console.log('Seeding initial shift templates...');
      const initialTemplates: ShiftTemplate[] = [
        { id: 'temp-morning', name: 'Morning Duty', startTime: '07:00', endTime: '15:00', color: '#10b981', departmentId: 'dept-general' },
        { id: 'temp-evening', name: 'Evening Duty', startTime: '15:00', endTime: '23:00', color: '#f97316', departmentId: 'dept-general' },
        { id: 'temp-night', name: 'Night Cover', startTime: '23:00', endTime: '07:00', color: '#6366f1', departmentId: 'dept-general' }
      ];
      for (const t of initialTemplates) {
        await saveShiftTemplate(t);
      }
    }

    const hols = await fetchHolidays();
    if (hols.length === 0) {
      console.log('Seeding initial holidays...');
      const initialHolidays: Holiday[] = [
        { id: 'hol-1', date: '2026-01-01', name: "New Year's Day" },
        { id: 'hol-2', date: '2026-07-04', name: 'Independence Day' },
        { id: 'hol-3', date: '2026-11-26', name: 'Thanksgiving Day' },
        { id: 'hol-4', date: '2026-12-25', name: 'Christmas Day' }
      ];
      for (const h of initialHolidays) {
        await saveHoliday(h);
      }
    }

    const docRef = doc(db, 'config', 'schedulePeriod');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      console.log('Seeding default schedule period...');
      await saveSchedulePeriod({
        id: 'current',
        title: 'July 2026 Rotation Cycle',
        startDate: '2026-07-01',
        endDate: '2026-07-14'
      });
    }

  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
};
