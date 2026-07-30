# Handoff Report: R6 - Allow Self-Role Switching Between User and Scheduler

## 1. Observation
- **`firestore.rules` (lines 39–43)**:
  ```firestore
  allow update: if isAuthenticated() && (
    isAdmin() ||
    (isOwner(userId) && request.resource.data.role == resource.data.role) ||
    (isScheduler() && resource.data.isVirtual == true && request.resource.data.role == resource.data.role)
  );
  ```
  The rule explicitly requires `request.resource.data.role == resource.data.role` for document owners (`isOwner(userId)`). This prevents any logged-in non-admin user from changing their own `role` field in Firestore. Attempts to update `role` throw a `permission-denied` error.

- **`src/firebase.ts` (lines 137–140)**:
  ```typescript
  export const updateUserRole = async (userId: string, newRole: Role): Promise<User | null> => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    return fetchUserById(userId);
  };
  ```
  The client helper uses `updateDoc` to update `{ role: newRole }` on `/users/{userId}`.

- **`src/App.tsx` (lines 242–251)**:
  ```typescript
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
  ```
  `handleRoleChange` calls `updateUserRole`, updates `currentUser` local state, but currently does not update the `users` array in React state (`setUsers`), nor clear previous error messages.

- **`src/components/Navbar.tsx` (lines 168–184)**:
  Header navigation renders a self-service role select dropdown inside the user profile widget. However, the dropdown includes `<option value="admin">Admin</option>` for all users, which can cause permission errors if selected by a non-admin.

- **`src/components/UserDashboard.tsx` (lines 1391–1419)**:
  Under Settings tab, a "Role Settings" card exists with toggle buttons for `User` and `Scheduler`.

---

## 2. Logic Chain

1. **Firestore Security Rule Fix**:
   - For an authenticated document owner (`isOwner(userId)`), updating the user document should allow setting `role` to `'user'` or `'scheduler'`, or leaving `role` unchanged (`request.resource.data.role == resource.data.role`).
   - Self-elevation to `'admin'` must remain forbidden (`request.resource.data.role == 'admin'` evaluates to `false` for non-admin owners).
   - Target update rule in `firestore.rules`:
     ```firestore
     allow update: if isAuthenticated() && (
       isAdmin() ||
       (isOwner(userId) && (
         request.resource.data.role == 'user' ||
         request.resource.data.role == 'scheduler' ||
         request.resource.data.role == resource.data.role
       )) ||
       (isScheduler() && resource.data.isVirtual == true && request.resource.data.role == resource.data.role)
     );
     ```

2. **Client Component Adjustments**:
   - **`src/components/Navbar.tsx`**: Filter options in the self-service role dropdown so non-admin users only see `'user'` and `'scheduler'`. Admin users can see `'user'`, `'scheduler'`, and `'admin'`.
   - **`src/components/UserDashboard.tsx`**: Ensure the "Role Settings" card toggle buttons (`User` / `Scheduler`) remain fully interactive and trigger `onRoleChange(role)`.
   - **`src/App.tsx`**:
     - Enhance `handleRoleChange`:
       ```typescript
       const handleRoleChange = async (newRole: Role) => {
         if (!currentUser) return;
         try {
           await updateUserRole(currentUser.id, newRole);
           setCurrentUser({ ...currentUser, role: newRole });
           setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, role: newRole } : u));
           setErrorMessage('');
         } catch (err: any) {
           console.error('Error updating role:', err);
           setErrorMessage('Could not update user role.');
         }
       };
       ```
     - In `renderDashboard()`: When `currentUser.role` switches to `'scheduler'`, navigating to/viewing `schedule` tab dynamically grants full access to `SchedulerDashboard` (Rotation Schedules). Switching back to `'user'` returns the user to `UserDashboard`.

---

## 3. Caveats
- Role updates in Firestore modify the user document in the database. Firebase Auth Custom Claims (if used in serverless backends) are separate, but DutyFlow relies on Firestore user document lookup (`get(/databases/.../users/$(auth.uid)).data.role`), which updates instantly.
- Virtual users (`isVirtual: true`) created by schedulers retain their restricted update rule (`isScheduler() && resource.data.isVirtual == true && request.resource.data.role == resource.data.role`), preserving admin control over virtual user roles.

---

## 4. Conclusion
R6 self-role switching between `'user'` and `'scheduler'` requires:
1. Updating `firestore.rules` line 41 to allow `request.resource.data.role == 'user' || request.resource.data.role == 'scheduler' || request.resource.data.role == resource.data.role` for document owners.
2. Adjusting `src/components/Navbar.tsx` to restrict dropdown choices to `'user'` and `'scheduler'` for non-admin users.
3. Updating `src/App.tsx`'s `handleRoleChange` to sync the `users` array in state and clear error banners on successful role change.

---

## 5. Verification Method

1. **TypeScript Type Check**:
   ```bash
   npm run lint
   ```
2. **Project Test Suite**:
   ```bash
   npm test
   ```
3. **Production Build Verification**:
   ```bash
   npm run build
   ```
4. **Manual Rule & UI Verification**:
   - Log in as a standard user.
   - Switch role to "Scheduler" via Navbar dropdown or Settings -> Role Settings card.
   - Verify Firestore update succeeds without `permission-denied` error.
   - Verify UI immediately switches view access to Rotation Schedules (`SchedulerDashboard`).
   - Switch role back to "User" and verify UI updates immediately to User Portal (`UserDashboard`).
   - Confirm non-admin users cannot select "Admin" role.
