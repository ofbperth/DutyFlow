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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Role, ShiftTemplate, Shift, Availability, ShiftSwap, Holiday, SchedulePeriod, DoctorGroup, GroupRotationAssignment } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Keep the roster directory available between page loads.  The multi-tab cache
// retains Firestore's normal server synchronization semantics while avoiding a
// cold network read for data that has not changed since the previous visit.
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  },
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
// Listen to Auth State
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In
let isSigningIn = false;
export const googleSignIn = async (): Promise<{ user: FirebaseUser } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout
export const googleLogout = async () => {
  await signOut(auth);
};

// Validate Firestore Connection
export const testFirestoreConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    console.error("Firestore connection test failed:", error);
    if (error?.message?.includes('offline')) {
      console.error("Please check your Firebase configuration: Firestore client is offline.");
    }
    throw error;
  }
};

// Firestore CRUD Helpers

// Users
export const fetchUsers = async (): Promise<User[]> => {
  const q = query(collection(db, 'users'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const fetchUserById = async (userId: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
};

export const updateUserGroupAssignment = async (userId: string, periodId: string, groupId: string): Promise<void> => {
  // Try to find if user already has an assignment for this period
  const q = query(collection(db, 'rotationAssignments'), where('periodId', '==', periodId), where('userId', '==', userId));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    // Update existing
    const existingDoc = snap.docs[0];
    await updateDoc(existingDoc.ref, { groupId });
  } else {
    // Create new
    const newId = `rot-${userId}-${periodId}`;
    const assignment: GroupRotationAssignment = {
      id: newId,
      periodId,
      groupId,
      userId,
      displayOrder: 0
    };
    await setDoc(doc(db, 'rotationAssignments', newId), assignment);
  }

  // Keep the immutable, rule-readable scheduler scope on the user's profile in
  // sync with the active rotation. Firestore rules deliberately only let admins
  // change this field, so a self-promoted scheduler cannot widen their scope.
  if (periodId === 'current') {
    await updateDoc(doc(db, 'users', userId), { homeGroupId: groupId });
  }
};

export const syncUserHomeGroupScopes = async (
  users: User[],
  assignments: GroupRotationAssignment[],
  periodId: string
): Promise<User[]> => {
  const groupByUserId = new Map(
    assignments
      .filter(assignment => assignment.periodId === periodId)
      .map(assignment => [assignment.userId, assignment.groupId])
  );

  const scopedUsers = users.map(user => {
    const homeGroupId = groupByUserId.get(user.id);
    return homeGroupId && user.homeGroupId !== homeGroupId
      ? { ...user, homeGroupId }
      : user;
  });

  await Promise.all(
    scopedUsers
      .filter((user, index) => user !== users[index])
      .map(user => updateDoc(doc(db, 'users', user.id), { homeGroupId: user.homeGroupId }))
  );

  return scopedUsers;
};

export const saveUser = async (user: User): Promise<void> => {
  await setDoc(doc(db, 'users', user.id), user);
  // Auto-assign to 'unassigned' if no group assignment exists for 'current' period
  try {
    const assignments = await getRotationAssignments('current');
    if (!assignments.some(a => a.userId === user.id)) {
      await updateUserGroupAssignment(user.id, 'current', 'unassigned');
    }
  } catch (err) {
    console.warn('Could not auto-assign rotation group for user (will be prompted to select):', err);
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), data);
};

export const updateUserRole = async (userId: string, newRole: Role): Promise<User | null> => {
  await updateDoc(doc(db, 'users', userId), { role: newRole });
  return fetchUserById(userId);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId));
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


// Doctor Groups
export const getDoctorGroups = async (): Promise<DoctorGroup[]> => {
  const snap = await getDocs(collection(db, 'doctorGroups'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DoctorGroup));
};

export const saveDoctorGroup = async (group: DoctorGroup): Promise<void> => {
  await setDoc(doc(db, 'doctorGroups', group.id), group);
};

export const deleteDoctorGroup = async (id: string): Promise<void> => {
  const q = query(collection(db, 'rotationAssignments'), where('groupId', '==', id));
  const snap = await getDocs(q);
  const promises = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(promises);
  await deleteDoc(doc(db, 'doctorGroups', id));
};

// Rotation Assignments
export const getRotationAssignments = async (periodId: string): Promise<GroupRotationAssignment[]> => {
  const q = query(collection(db, 'rotationAssignments'), where('periodId', '==', periodId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupRotationAssignment));
};

export const saveRotationAssignments = async (assignments: GroupRotationAssignment[]): Promise<void> => {
  const promises = assignments.map(a => setDoc(doc(db, 'rotationAssignments', a.id), a));
  await Promise.all(promises);
};

export const deleteRotationAssignment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'rotationAssignments', id));
};

export const resetUserGroupAssignmentsForNewRotation = async (): Promise<void> => {
  const users = await fetchUsers();
  const assignments = await getRotationAssignments('current');
  const realUsers = users.filter(u => !u.isVirtual);
  const promises = realUsers.map(async (u) => {
    const existing = assignments.find(a => a.userId === u.id);
    if (existing) {
      await updateDoc(doc(db, 'rotationAssignments', existing.id), { groupId: 'unassigned' });
    } else {
      await updateUserGroupAssignment(u.id, 'current', 'unassigned');
    }
  });
  await Promise.all(promises);
};


// Double Shift Check
export const checkDoubleShift = (shifts: Shift[], userId: string, date: string, templateId?: string, templates?: ShiftTemplate[]): boolean => {
  if (!templateId || !templates) {
    return shifts.some(s => s.userId === userId && s.date === date);
  }

  const temp = templates.find(t => t.id === templateId);
  if (!temp) return false;

  const getShiftTimeRange = (shiftDate: string, t: ShiftTemplate) => {
    const [sy, sm, sd] = shiftDate.split('-').map(Number);
    const [startH, startM] = t.startTime.split(':').map(Number);
    const [endH, endM] = t.endTime.split(':').map(Number);
    
    const startObj = new Date(sy, sm - 1, sd, startH, startM);
    const endObj = new Date(sy, sm - 1, sd, endH, endM);
    
    if (t.startTime > t.endTime) {
      endObj.setDate(endObj.getDate() + 1);
    }
    return { start: startObj, end: endObj };
  };

  const newShiftRange = getShiftTimeRange(date, temp);
  
  // Pre-filter shifts to +/- 1 day
  const [dy, dm, dd] = date.split('-').map(Number);
  const targetDateObj = new Date(dy, dm - 1, dd);
  
  const prevDateObj = new Date(targetDateObj);
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const nextDateObj = new Date(targetDateObj);
  nextDateObj.setDate(nextDateObj.getDate() + 1);

  const formatD = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const targetStr = date;
  const prevStr = formatD(prevDateObj);
  const nextStr = formatD(nextDateObj);

  const userShifts = shifts.filter(s => s.userId === userId && (s.date === targetStr || s.date === prevStr || s.date === nextStr));

  for (const us of userShifts) {
    const ut = templates.find(t => t.id === us.templateId);
    if (!ut) continue;
    
    const existingRange = getShiftTimeRange(us.date, ut);
    
    if (newShiftRange.start < existingRange.end && newShiftRange.end > existingRange.start) {
      return true;
    }
  }

  return false;
};

// Seeding Initial Data if Collections are Empty
export const seedInitialData = async () => {
  try {
    // Default data is provisioned once, not rewritten every time an admin
    // signs in. Rewriting the same 31 documents serially was the dominant
    // startup cost and could also overwrite an administrator's configuration.
    const bootstrapRef = doc(db, 'config', 'initial-data-v1');
    const bootstrapSnap = await getDoc(bootstrapRef);
    if (bootstrapSnap.exists()) {
      return;
    }

    console.log('Seeding/updating initial doctor groups...');
    const initialGroups: DoctorGroup[] = [
      { id: 'group-nvm22', name: 'NVM22', color: '#ef4444', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-nvm21', name: 'NVM21', color: '#f97316', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-nvm20', name: 'NVM20', color: '#eab308', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-nvm19', name: 'NVM19', color: '#84cc16', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-nvmdown', name: 'NVMล่าง', color: '#22c55e', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-icu8n', name: 'ICU8N', color: '#10b981', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-icu8s', name: 'ICU8S', color: '#14b8a6', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-icu3', name: 'ICU3 วธ', color: '#06b6d4', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-ccu', name: 'CCU', color: '#0ea5e9', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-rcu', name: 'RCU', color: '#3b82f6', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-84-72-9', name: '84 & 72/9', color: '#6366f1', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-nvm23-asd11', name: 'NVM23 ASD11 ทองคำ', color: '#8b5cf6', weekdayShiftTime: '17:00-07:00', holidayShiftTime: '10:00-07:00' },
      { id: 'group-1650', name: 'เวร1650', color: '#a855f7' },
      { id: 'group-saraburi', name: 'สระบุรี', color: '#ec4899', weekdayShiftTime: '16:30-08:30', holidayShiftTime: '08:30-08:30' },
      { id: 'group-universal', name: 'Universal / General Shifts', color: '#d946ef' }
    ];
    console.log('Seeding/updating initial shift templates...');
    const initialTemplates: ShiftTemplate[] = [
      { id: 'temp-group-weekday', name: 'เวรวันธรรมดา', startTime: '17:00', endTime: '07:00', color: '#3b82f6', groupId: 'group-universal' },
      { id: 'temp-group-holiday', name: 'เวรวันหยุด', startTime: '10:00', endTime: '07:00', color: '#eab308', groupId: 'group-universal' },
      { id: 'temp-1650-morning', name: '1650 เช้า(วันหยุด)', startTime: '07:00', endTime: '18:00', color: '#f97316', groupId: 'group-1650' },
      { id: 'temp-1650-afternoon', name: '1650 บ่ายดึก', startTime: '18:00', endTime: '07:00', color: '#6366f1', groupId: 'group-1650' },
      { id: 'temp-saraburi-top', name: 'เวรบน', startTime: '16:30', endTime: '08:30', color: '#ec4899', groupId: 'group-saraburi' },
      { id: 'temp-saraburi-bottom', name: 'เวรล่าง', startTime: '16:30', endTime: '08:30', color: '#f43f5e', groupId: 'group-saraburi' },
      { id: 'temp-saraburi-top-holiday', name: 'เวรบน(วันหยุด)', startTime: '08:30', endTime: '08:30', color: '#eab308', groupId: 'group-saraburi' },
      { id: 'temp-saraburi-bottom-holiday', name: 'เวรล่าง(วันหยุด)', startTime: '08:30', endTime: '08:30', color: '#a855f7', groupId: 'group-saraburi' },
      { id: 'temp-icu8s-shift', name: 'เวร ICU8S', startTime: '17:00', endTime: '07:00', color: '#14b8a6', groupId: 'group-icu8s' },
      { id: 'temp-icu8n-shift', name: 'เวร ICU8N', startTime: '17:00', endTime: '07:00', color: '#10b981', groupId: 'group-icu8n' },
      { id: 'temp-icu3-shift', name: 'เวร ICU3 วธ', startTime: '17:00', endTime: '07:00', color: '#06b6d4', groupId: 'group-icu3' },
      { id: 'temp-uni-blood', name: 'รับบริจาคเลือด', startTime: '07:00', endTime: '18:00', color: '#ef4444', isPooled: true, groupId: 'group-pooled' },
      { id: 'temp-uni-morning', name: 'เวรคอกเช้า', startTime: '06:00', endTime: '12:00', color: '#f59e0b', isPooled: true, groupId: 'group-pooled' },
      { id: 'temp-uni-noon', name: 'เวรคอกเที่ยง', startTime: '12:00', endTime: '18:00', color: '#84cc16', isPooled: true, groupId: 'group-pooled' },
      { id: 'temp-uni-evening', name: 'เวรคอกเย็น', startTime: '18:00', endTime: '24:00', color: '#10b981', isPooled: true, groupId: 'group-pooled' },
      { id: 'temp-uni-night', name: 'เวรคอกดึก', startTime: '00:00', endTime: '06:00', color: '#06b6d4', isPooled: true, groupId: 'group-pooled' },
      { id: 'temp-uni-nightdown', name: 'เวรคอกดึกดาวน์', startTime: '00:00', endTime: '08:00', color: '#3b82f6', isPooled: true, groupId: 'group-pooled' }
    ];
    // Preserve any existing administrator configuration. For an existing
    // installation being upgraded to this marker, only missing defaults are
    // added; a new installation receives the complete set in one commit.
    const [existingGroups, existingTemplates] = await Promise.all([
      getDoctorGroups(),
      fetchShiftTemplates()
    ]);
    const existingGroupIds = new Set(existingGroups.map(group => group.id));
    const existingTemplateIds = new Set(existingTemplates.map(template => template.id));

    // These independent defaults are committed atomically in one Firestore
    // round trip instead of one request per document.
    const missingGroups = initialGroups.filter(group => !existingGroupIds.has(group.id));
    const missingTemplates = initialTemplates.filter(template => !existingTemplateIds.has(template.id));
    if (missingGroups.length > 0 || missingTemplates.length > 0) {
      const defaultsBatch = writeBatch(db);
      missingGroups.forEach(group => defaultsBatch.set(doc(db, 'doctorGroups', group.id), group));
      missingTemplates.forEach(template => defaultsBatch.set(doc(db, 'shiftTemplates', template.id), template));
      await defaultsBatch.commit();
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
    
    // Seed rotation assignments for current period if none exist
    const assignments = await getRotationAssignments('current');
    if (assignments.length === 0) {
      console.log('Seeding initial rotation assignments...');
      let users = await fetchUsers();
      
      const groupIds = [
        'group-nvm22', 'group-nvm21', 'group-nvm20', 'group-nvm19', 'group-nvmdown', 
        'group-icu8n', 'group-icu8s', 'group-icu3', 'group-ccu', 'group-rcu', 
        'group-84-72-9', 'group-nvm23-asd11', 'group-1650'
      ];

      if (users.length === 0) {
        console.log('No users found. Seeding virtual demo doctors...');
        // Create one demo doctor for each group
        for (let i = 0; i < groupIds.length; i++) {
          const demoUser: User = {
            id: `demo-doc-${i+1}`,
            name: `Dr. Demo ${i+1}`,
            email: `demo${i+1}@hospital.local`,
            role: 'user',
            isVirtual: true,
            createdAt: new Date().toISOString()
          };
          await saveUser(demoUser); // This will also auto-assign to 'unassigned' because assignments list we fetched earlier is empty in DB, but we will overwrite it below
        }
        users = await fetchUsers(); // Re-fetch
      }

      if (users.length > 0) {
        const newAssignments: GroupRotationAssignment[] = [];
        for (let index = 0; index < users.length; index++) {
          const u = users[index];
          const groupId = groupIds[index % groupIds.length];
          // use updateUserGroupAssignment to ensure it overwrites the 'unassigned' one created by saveUser
          await updateUserGroupAssignment(u.id, 'current', groupId);
        }
      }
    }

    const existingShifts = await fetchShifts();
    if (existingShifts.length === 0) {
      console.log('Seeding initial published duty shifts...');
      const users = await fetchUsers();
      const templates = await fetchShiftTemplates();
      if (users.length > 0 && templates.length > 0) {
        const sampleShifts: Shift[] = [];
        users.forEach((u, idx) => {
          sampleShifts.push({
            id: `shift-seed-${u.id}-1`,
            userId: u.id,
            date: '2026-07-28',
            templateId: templates[idx % templates.length].id,
            status: 'published',
            assignedBy: 'System Admin',
            notes: 'Scheduled Clinical Rotation'
          });
          sampleShifts.push({
            id: `shift-seed-${u.id}-2`,
            userId: u.id,
            date: '2026-07-30',
            templateId: templates[(idx + 1) % templates.length].id,
            status: 'published',
            assignedBy: 'System Admin',
            notes: 'Scheduled On-Call Shift'
          });
        });
        for (const s of sampleShifts) {
          await saveShift(s);
        }
      }
    }

    // Write the marker only after all dependent seed work completed so a
    // transient failure remains retryable on the next admin session.
    await setDoc(bootstrapRef, { version: 1 });

  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
};

