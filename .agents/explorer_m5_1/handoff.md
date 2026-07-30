# Milestone 5 Analysis Report: Universal Group-Scoped Shift Template & Schedule Filtering

## 1. Observation

### 1.1 Hardcoded Group IDs and Overrides Across Codebase
A comprehensive search across `src/` revealed several instances of hardcoded group IDs (`group-saraburi`, `group-1650`), group names (`สระบุรี`, `เวร1650`), and template names (`เวรวันธรรมดา`, `เวรวันหยุด`) used as special cases:

1. **`src/types.ts` (Lines 98–119)**:
   ```ts
   export const getAllowedTargetGroupIdsForHomeGroup = (homeGroupId: string): string[] => {
     const allowed: string[] = ['group-pooled'];
     if (homeGroupId !== 'group-saraburi' && homeGroupId !== 'group-1650') {
       allowed.push('group-universal');
     }
     if (homeGroupId === 'group-saraburi') {
       allowed.push('group-saraburi');
     }
     if (homeGroupId === 'group-1650' || homeGroupId === 'group-nvmdown' || homeGroupId === 'group-nvm23-asd11') {
       allowed.push('group-1650');
     }
     if (homeGroupId === 'group-nvm23-asd11' || homeGroupId === 'group-icu3') {
       allowed.push('group-icu3');
     }
     if (homeGroupId === 'group-rcu' || homeGroupId === 'group-icu8s') {
       allowed.push('group-icu8s');
     }
     if (homeGroupId === 'group-ccu' || homeGroupId === 'group-icu8n') {
       allowed.push('group-icu8n');
     }
     return allowed;
   };
   ```
   - **Issues Identified**:
     - Hardcoded exclusion of `'group-universal'` for `'group-saraburi'` and `'group-1650'`.
     - Hardcoded `if` statements for every single group relationship instead of deriving target group access dynamically from `CROSS_GROUP_RULES`.
     - Omission of pushing `homeGroupId` itself for generic home groups not explicitly listed in an `if` block.

2. **`src/components/SchedulerDashboard.tsx` (Lines 566–568)**:
   ```tsx
   if ((myGroupId === 'group-saraburi' || myGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
     return false;
   }
   ```
   - **Issues Identified**: Hardcoded suppression of universal templates for Saraburi and 1650 groups inside `filteredTemplates`.

3. **`src/components/SchedulerDashboard.tsx` (Lines 1291–1293)**:
   ```tsx
   if ((userGroupId === 'group-saraburi' || userGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
     return false;
   }
   ```
   - **Issues Identified**: Duplicate hardcoded suppression of universal templates inside the assigning modal backdrop dropdown (`templates.filter`).

4. **`src/components/SchedulerDashboard.tsx` (Lines 873, 877, 900)**:
   ```tsx
   // Line 873 & 877: General Templates filter
   filteredTemplates.filter(t => !t.isPooled && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name)))
   
   // Line 900: Group Specific Templates filter
   const groupTemps = filteredTemplates.filter(t => !t.isPooled && t.groupId === g.id && !['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name));
   ```
   - **Issues Identified**: Hardcoded Thai shift template strings (`'เวรวันธรรมดา'`, `'เวรวันหยุด'`) used as hardcoded checks in the sidebar UI rendering.

5. **`src/firebase.ts` (Lines 361–362, 373–378, 425–429)**:
   - Initial group seeding includes `group-saraburi` and `group-1650`.
   - Initial template seeding creates templates with `groupId: 'group-saraburi'` and `groupId: 'group-1650'`.
   - Initial demo doctor rotation assignment seeding (lines 425–429) omits `group-saraburi`.

---

### 1.2 Current Architecture of Shift Template Fetching, Storage, & Filtering
- **Data Model (`src/types.ts`)**:
  - `ShiftTemplate` has properties: `{ id: string; name: string; startTime: string; endTime: string; color: string; groupId: string; isPooled?: boolean; }`.
- **Cross-Group Permissions Contract (`src/types.ts`)**:
  - `CROSS_GROUP_RULES: Record<string, string[]>` maps `targetGroupId` -> list of allowed `homeGroupIds`.
    ```ts
    export const CROSS_GROUP_RULES: Record<string, string[]> = {
      'group-1650': ['group-nvmdown', 'group-nvm23-asd11'],
      'group-icu8s': ['group-rcu'],
      'group-icu8n': ['group-ccu'],
      'group-icu3': ['group-nvm23-asd11']
    };
    ```
- **Lifecycle Flow**:
  1. `SchedulerDashboard` fetches templates from Firebase into state `templates`.
  2. Determines user's home group ID (`myGroupId`).
  3. Evaluates `allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(myGroupId)`.
  4. Filters templates into `filteredTemplates`.
  5. Passes `filteredTemplates` to:
     - Sidebar UI (General, Group-Specific, Pooled sections).
     - `<AssignShiftModal templates={filteredTemplates} ... />`
     - `<BatchAssignModal templates={filteredTemplates} ... />`

---

## 2. Logic Chain

1. **Premise 1**: Under Milestone 5 requirements, shift templates owned by a specific group must be visible **ONLY** to users belonging to that home group or users in groups explicitly allowed via cross-group rules (`getAllowedTargetGroupIdsForHomeGroup`). Universal templates (`group-universal`) and pooled templates (`group-pooled`) must be visible to all users.
2. **Premise 2**: Hardcoding special cases (e.g. `if (myGroupId === 'group-saraburi' || myGroupId === 'group-1650') return false;`) violates open-closed principles and prevents DutyFlow from scaling to arbitrary new doctor groups cleanly.
3. **Premise 3**: `getAllowedTargetGroupIdsForHomeGroup` can be constructed 100% dynamically without group-specific hardcoding by inspecting `CROSS_GROUP_RULES`.
   - For any `homeGroupId`:
     - `'group-universal'` and `'group-pooled'` are universally allowed.
     - `homeGroupId` itself is allowed for members of that home group.
     - Any `targetGroupId` in `CROSS_GROUP_RULES` where `CROSS_GROUP_RULES[targetGroupId]` includes `homeGroupId` is allowed.
4. **Premise 4**: Removing hardcoded special-case checks in `SchedulerDashboard.tsx` and updating `getAllowedTargetGroupIdsForHomeGroup` in `src/types.ts` will dynamically deliver the exact intended visibility for Saraburi, 1650, ICU, NVM, and any future groups.

---

## 3. Caveats

- **Existing Mock/Seed Data Compatibility**: Seeding data in `src/firebase.ts` sets `groupId: 'group-universal'` for standard weekday/holiday templates. Ensure all general templates have `groupId: 'group-universal'` so template sidebar section filtering relies solely on `t.groupId === 'group-universal'`.
- **Assigned Shift Visibility**: `filteredTemplates` in `SchedulerDashboard.tsx` includes templates that have active assignments in the current date window (`hasAssignedShift`). This ensures that if a doctor is viewing a roster containing an out-of-group shift assignment, the template name and metadata still render properly.

---

## 4. Conclusion & Recommended Refactoring Plan

### 4.1 Refactoring `src/types.ts`
Replace lines 98–119 of `src/types.ts` with a fully dynamic implementation:

```ts
export const getAllowedTargetGroupIdsForHomeGroup = (homeGroupId: string): string[] => {
  const allowed = new Set<string>(['group-pooled', 'group-universal']);
  if (homeGroupId) {
    allowed.add(homeGroupId);
  }
  for (const [targetGroupId, allowedHomeGroupIds] of Object.entries(CROSS_GROUP_RULES)) {
    if (allowedHomeGroupIds.includes(homeGroupId)) {
      allowed.add(targetGroupId);
    }
  }
  return Array.from(allowed);
};
```

### 4.2 Refactoring `src/components/SchedulerDashboard.tsx`
1. **Lines 562–581 (`filteredTemplates`)**:
   Remove lines 566–568. Simplify filter:
   ```tsx
   const filteredTemplates = templates.filter(t => {
     if (!myGroupId) return true;
     const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(myGroupId);

     const isAllowedForGroup =
       !!t.isPooled ||
       allowedGroupIds.includes(t.groupId);
     
     const hasAssignedShift = shifts.some(
       s => s.templateId === t.id && datesArray.includes(s.date) && filteredDoctors.some(d => d.id === s.userId)
     );

     return isAllowedForGroup || hasAssignedShift;
   });
   ```

2. **Lines 1284–1301 (Assigning Cell Modal Filter)**:
   Remove lines 1291–1293. Simplify filter:
   ```tsx
   templates.filter(t => {
     const userAssignment = rotationAssignments.find(a => a.userId === assigningCell.userId);
     const userGroupId = userAssignment?.groupId;
     if (!userGroupId) return true;
     
     const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(userGroupId);

     return (
       !!t.isPooled ||
       allowedGroupIds.includes(t.groupId)
     );
   })
   ```

3. **Lines 873, 877, 900 (Sidebar UI Grouping)**:
   Clean up hardcoded Thai string comparisons:
   - General templates: `filteredTemplates.filter(t => !t.isPooled && t.groupId === 'group-universal')`
   - Group-specific templates: `filteredTemplates.filter(t => !t.isPooled && t.groupId === g.id)`

---

## 5. Verification Method

1. **Automated Unit & E2E Test Suite**:
   Run `npm test` to verify that all 97 test cases pass without regressions.
2. **Type Checking**:
   Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
3. **Manual Verification of Permission Rules**:
   - Verify `getAllowedTargetGroupIdsForHomeGroup('group-saraburi')` returns `['group-pooled', 'group-universal', 'group-saraburi']`.
   - Verify `getAllowedTargetGroupIdsForHomeGroup('group-1650')` returns `['group-pooled', 'group-universal', 'group-1650']`.
   - Verify `getAllowedTargetGroupIdsForHomeGroup('group-nvmdown')` returns `['group-pooled', 'group-universal', 'group-nvmdown', 'group-1650']`.
