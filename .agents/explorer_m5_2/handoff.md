# Milestone 5: Universal Group-Scoped Shift Template & Schedule Filtering Analysis

## 1. Observation

### 1.1 Source Code Locations & Findings
- `src/types.ts` lines 91-96:
  ```ts
  export const CROSS_GROUP_RULES: Record<string, string[]> = {
    'group-1650': ['group-nvmdown', 'group-nvm23-asd11'],
    'group-icu8s': ['group-rcu'],
    'group-icu8n': ['group-ccu'],
    'group-icu3': ['group-nvm23-asd11']
  };
  ```
- `src/types.ts` lines 98-119:
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
- `src/components/SchedulerDashboard.tsx` lines 562-581:
  ```ts
  const filteredTemplates = templates.filter(t => {
    if (!myGroupId) return true;
    const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(myGroupId);

    if ((myGroupId === 'group-saraburi' || myGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
      return false;
    }

    const isAllowedForGroup =
      t.groupId === myGroupId ||
      t.groupId === 'group-pooled' ||
      !!t.isPooled ||
      allowedGroupIds.includes(t.groupId);
    
    const hasAssignedShift = shifts.some(
      s => s.templateId === t.id && datesArray.includes(s.date) && filteredDoctors.some(d => d.id === s.userId)
    );

    return isAllowedForGroup || hasAssignedShift;
  });
  ```
- `src/components/SchedulerDashboard.tsx` lines 1284-1300:
  ```ts
  templates.filter(t => {
    const userAssignment = rotationAssignments.find(a => a.userId === assigningCell.userId);
    const userGroupId = userAssignment?.groupId;
    if (!userGroupId) return true;
    
    const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(userGroupId);

    if ((userGroupId === 'group-saraburi' || userGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
      return false;
    }

    return (
      t.groupId === userGroupId ||
      t.groupId === 'group-pooled' ||
      !!t.isPooled ||
      allowedGroupIds.includes(t.groupId)
    );
  })
  ```
- `src/firebase.ts` lines 348-388:
  - Initial doctor groups include 15 groups: NVM22, NVM21, NVM20, NVM19, NVMล่าง (`group-nvmdown`), ICU8N (`group-icu8n`), ICU8S (`group-icu8s`), ICU3 วธ (`group-icu3`), CCU (`group-ccu`), RCU (`group-rcu`), 84 & 72/9 (`group-84-72-9`), NVM23 ASD11 ทองคำ (`group-nvm23-asd11`), เวร1650 (`group-1650`), สระบุรี (`group-saraburi`), Universal / General Shifts (`group-universal`).
  - Shift templates:
    - Universal templates: `temp-group-weekday` (เวรวันธรรมดา, 17:00-07:00, `groupId: 'group-universal'`), `temp-group-holiday` (เวรวันหยุด, 10:00-07:00, `groupId: 'group-universal'`).
    - Group-scoped templates: `temp-1650-morning`, `temp-1650-afternoon` (`group-1650`), `temp-saraburi-top`, `temp-saraburi-bottom`, `temp-saraburi-top-holiday`, `temp-saraburi-bottom-holiday` (`group-saraburi`), `temp-icu8s-shift` (`group-icu8s`), `temp-icu8n-shift` (`group-icu8n`), `temp-icu3-shift` (`group-icu3`).
    - Pooled templates: `temp-uni-blood`, `temp-uni-morning`, `temp-uni-noon`, `temp-uni-evening`, `temp-uni-night`, `temp-uni-nightdown` (`groupId: 'group-pooled'`, `isPooled: true`).

---

## 2. Logic Chain

### 2.1 Current Architectural Limitations
1. **Hardcoded Control Flow in `getAllowedTargetGroupIdsForHomeGroup`**:
   - The current helper relies on individual `if (homeGroupId === ...)` checks for every cross-group permission.
   - If a new group or cross-group relationship is added to `CROSS_GROUP_RULES`, `getAllowedTargetGroupIdsForHomeGroup` must be manually edited.
   - Furthermore, `getAllowedTargetGroupIdsForHomeGroup` omits `homeGroupId` itself for standard groups (e.g. `group-rcu`, `group-ccu`, `group-nvm22`), forcing component code to add redundant checks like `t.groupId === myGroupId`.

2. **Hardcoded UI Overrides**:
   - Both `filteredTemplates` and Assigning Cell Modal in `SchedulerDashboard.tsx` contain identical hardcoded checks:
     `if ((myGroupId === 'group-saraburi' || myGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) return false;`
   - Checking string literals in Thai (`['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name)`) creates brittle dependencies that break if template names are edited in Admin settings.

3. **Inversion of Cross-Group Rules**:
   - `CROSS_GROUP_RULES` maps `targetGroupId -> allowedHomeGroupIds[]`.
   - `getAllowedTargetGroupIdsForHomeGroup(homeGroupId)` is the mathematical inverse mapping: `homeGroupId -> targetGroupIds[]`.
   - By deriving `getAllowedTargetGroupIdsForHomeGroup` directly from `CROSS_GROUP_RULES` and home group metadata, we eliminate hardcoded rules altogether.

### 2.2 Template Mapping & Group Classifications
- **Universal Groups** (NVM22, NVM21, NVM20, NVM19, NVMล่าง, 84 & 72/9, NVM23 ASD11, ICU8N, ICU8S, ICU3, CCU, RCU):
  - Shared weekday shift: 17:00-07:00 (`temp-group-weekday`)
  - Shared holiday shift: 10:00-07:00 (`temp-group-holiday`)
  - Owned by: `group-universal`.
- **Standalone Groups** (Saraburi, 1650):
  - Do not use general `group-universal` templates.
  - Own custom group-scoped shift templates (`group-saraburi`, `group-1650`).
- **Cross-Group Rights Matrix**:
  - `group-nvmdown` -> Allowed to target `group-1650`.
  - `group-nvm23-asd11` -> Allowed to target `group-1650` and `group-icu3`.
  - `group-rcu` -> Allowed to target `group-icu8s`.
  - `group-ccu` -> Allowed to target `group-icu8n`.

---

## 3. Caveats
- **Metadata for Universal Opt-Out**: To ensure standalone groups (`group-saraburi`, `group-1650`) are dynamically identified without hardcoding their IDs in code, `DoctorGroup` can use an optional `isUniversal?: boolean` property (or a centralized constant set `NON_UNIVERSAL_GROUPS = new Set(['group-saraburi', 'group-1650'])`).
- **Data Seeding**: Firebase initial data already seeds `isUniversal: false` or standard group records. Existing Firebase documents without `isUniversal` will fall back safely to `NON_UNIVERSAL_GROUPS`.

---

## 4. Conclusion & Technical Design Proposal

### 4.1 Step 1: Centralized Data-Driven Permission Helper (`src/types.ts`)
Replace the hardcoded `getAllowedTargetGroupIdsForHomeGroup` with a dynamic algorithm:

```ts
// Groups that do not use Universal general weekday/holiday shifts
export const NON_UNIVERSAL_GROUPS = new Set<string>(['group-saraburi', 'group-1650']);

export const getAllowedTargetGroupIdsForHomeGroup = (
  homeGroupId: string,
  groups?: DoctorGroup[]
): string[] => {
  const allowedSet = new Set<string>();

  // 1. Every home group can access its own group templates/shifts
  allowedSet.add(homeGroupId);

  // 2. Every home group can access pooled shift templates
  allowedSet.add('group-pooled');

  // 3. Universal templates (unless group opts out or is in NON_UNIVERSAL_GROUPS)
  const isNonUniversal = groups
    ? groups.find(g => g.id === homeGroupId)?.isUniversal === false || NON_UNIVERSAL_GROUPS.has(homeGroupId)
    : NON_UNIVERSAL_GROUPS.has(homeGroupId);

  if (!isNonUniversal) {
    allowedSet.add('group-universal');
  }

  // 4. Invert CROSS_GROUP_RULES (targetGroupId -> homeGroupIds[]) to find target groups allowed for homeGroupId
  for (const [targetGroupId, allowedHomeGroups] of Object.entries(CROSS_GROUP_RULES)) {
    if (allowedHomeGroups.includes(homeGroupId)) {
      allowedSet.add(targetGroupId);
    }
  }

  return Array.from(allowedSet);
};
```

### 4.2 Step 2: Refactor UI Components (`SchedulerDashboard.tsx`, `AssignShiftModal.tsx`, `UserDashboard.tsx`)
Remove all hardcoded checks (`myGroupId === 'group-saraburi' || myGroupId === 'group-1650'` and `['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name)`).

1. In `SchedulerDashboard.tsx` (`filteredTemplates`):
```ts
const filteredTemplates = templates.filter(t => {
  if (!myGroupId) return true;
  const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(myGroupId, groups);

  const isAllowedForGroup = !!t.isPooled || allowedGroupIds.includes(t.groupId);
  const hasAssignedShift = shifts.some(
    s => s.templateId === t.id && datesArray.includes(s.date) && filteredDoctors.some(d => d.id === s.userId)
  );

  return isAllowedForGroup || hasAssignedShift;
});
```

2. In `SchedulerDashboard.tsx` Assigning Cell Modal:
```ts
templates.filter(t => {
  const userAssignment = rotationAssignments.find(a => a.userId === assigningCell.userId);
  const userGroupId = userAssignment?.groupId;
  if (!userGroupId) return true;

  const allowedGroupIds = getAllowedTargetGroupIdsForHomeGroup(userGroupId, groups);
  return !!t.isPooled || allowedGroupIds.includes(t.groupId);
})
```

3. Schedule Group Row Doctor Filtering:
Unify outer doctor inclusion using `CROSS_GROUP_RULES[g.id] || []`.

---

## 5. Verification Method

### 5.1 Verification Commands
- `npx tsc --noEmit` to verify type safety across `src/types.ts` and UI components.
- `npm run build` to confirm production bundle builds cleanly without TypeScript or JSX errors.

### 5.2 Test Cases & Expected Outcomes
1. **Group Saraburi Doctor**:
   - `getAllowedTargetGroupIdsForHomeGroup('group-saraburi')` returns `['group-saraburi', 'group-pooled']`.
   - `group-universal` templates (เวรวันธรรมดา, เวรวันหยุด) are NOT visible.
2. **Group 1650 Doctor**:
   - `getAllowedTargetGroupIdsForHomeGroup('group-1650')` returns `['group-1650', 'group-pooled']`.
   - `group-universal` templates are NOT visible.
3. **Group NVMล่าง Doctor**:
   - `getAllowedTargetGroupIdsForHomeGroup('group-nvmdown')` returns `['group-nvmdown', 'group-pooled', 'group-universal', 'group-1650']`.
   - Can see 1650 templates when covering cross-group 1650 shifts.
4. **Group RCU Doctor**:
   - `getAllowedTargetGroupIdsForHomeGroup('group-rcu')` returns `['group-rcu', 'group-pooled', 'group-universal', 'group-icu8s']`.
   - Can see ICU8S shift template.
5. **Group CCU Doctor**:
   - `getAllowedTargetGroupIdsForHomeGroup('group-ccu')` returns `['group-ccu', 'group-pooled', 'group-universal', 'group-icu8n']`.
   - Can see ICU8N shift template.
6. **Group NVM23 ASD11 Doctor**:
   - `getAllowedTargetGroupIdsForHomeGroup('group-nvm23-asd11')` returns `['group-nvm23-asd11', 'group-pooled', 'group-universal', 'group-1650', 'group-icu3']`.
   - Can see both 1650 and ICU3 templates.

### 5.3 Invalidation Conditions
- If any group ID is hardcoded in component filtering checks.
- If `getAllowedTargetGroupIdsForHomeGroup` fails to return a group's own `homeGroupId`.
- If template filtering breaks when template names are edited.
