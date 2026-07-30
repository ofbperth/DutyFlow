# Handoff Report — Milestone 5 Challenger Verification

## 1. Observation

- **Analyzed Logic in `src/types.ts`**:
  - `getAllowedTargetGroupIdsForHomeGroup` (lines 100-126):
    ```typescript
    export const getAllowedTargetGroupIdsForHomeGroup = (
      homeGroupId: string,
      groups?: DoctorGroup[]
    ): string[] => {
      const allowed = new Set<string>();

      if (homeGroupId) {
        allowed.add(homeGroupId);
      }
      allowed.add('group-pooled');

      const isNonUniversal = groups
        ? groups.find(g => g.id === homeGroupId)?.isUniversal === false || NON_UNIVERSAL_GROUPS.has(homeGroupId)
        : NON_UNIVERSAL_GROUPS.has(homeGroupId);

      if (!isNonUniversal) {
        allowed.add('group-universal');
      }

      for (const [targetGroupId, allowedHomeGroups] of Object.entries(CROSS_GROUP_RULES)) {
        if (allowedHomeGroups.includes(homeGroupId)) {
          allowed.add(targetGroupId);
        }
      }

      return Array.from(allowed);
    };
    ```
  - `CROSS_GROUP_RULES` (lines 91-96) maps target group IDs to allowed home group IDs:
    ```typescript
    export const CROSS_GROUP_RULES: Record<string, string[]> = {
      'group-1650': ['group-nvmdown', 'group-nvm23-asd11'],
      'group-icu8s': ['group-rcu'],
      'group-icu8n': ['group-ccu'],
      'group-icu3': ['group-nvm23-asd11']
    };
    ```
  - `NON_UNIVERSAL_GROUPS` (line 98) exports a `Set<string>` containing `'group-saraburi'` and `'group-1650'`.

- **Analyzed Logic in `src/components/SchedulerDashboard.tsx`**:
  - `filteredTemplates` (lines 562-575): Uses `getAllowedTargetGroupIdsForHomeGroup(myGroupId, groups)` dynamically instead of hardcoded string matching.
  - AST / static code check confirms hardcoded checks like `myGroupId === 'group-saraburi'` or `['เวรวันธรรมดา', 'เวรวันหยุด']` have been eliminated.

- **Empirical Execution Command Results**:
  1. `npm run lint` (`tsc --noEmit`):
     ```
     > react-example@0.0.0 lint
     > tsc --noEmit
     Command exited with code 0 (0 error(s)).
     ```
  2. `npm test` (`tsx tests/run-tests.ts`):
     ```
     SUITE: Milestone 5: Universal Group-Scoped Shift Template & Schedule Filtering
       ✓ R1-TPL-01: Home Group Template Isolation (1ms)
       ✓ R1-TPL-02: Cross-Group Target Template Access (0ms)
       ✓ R1-TPL-03: Universal & Pooled Shift Template Inclusion (0ms)
       ✓ R1-TPL-04: Universal Doctor Group Coverage (1ms)
       ✓ R2-SCHED-01: Home Group Doctor Display (1ms)
       ✓ R2-SCHED-02: Cross-Group Outer Doctor Display (0ms)
       ✓ R2-SCHED-03: Non-Allowed Outer Doctor Exclusion (0ms)
       ✓ R2-SCHED-04: Dynamic Filtering Across All Groups (0ms)
       ✓ R3-PERM-01: Central Helper Logic Verification (1ms)
       ✓ R3-PERM-02: AST / Static Code Inspection Test for Hardcode Elimination (1ms)
       ✓ R3-PERM-03: Full Regression & Robustness Verification (1ms)

     ======================================================
     SUMMARY: Total: 108 | Passed: 108 | Failed: 0
     ======================================================
     ```
  3. `npx tsx tests/m5-edge-cases.ts` (Empirical Harness):
     ```
     === EMPIRICAL STRESS TEST HARNESS FOR M5 ===

     [PASS] Scenario 1: Unknown group ID defaults to self, pooled, and universal
     [PASS] Scenario 2: Empty group ID returns pooled and universal without empty string
     [PASS] Scenario 3a: Missing groups param correctly identifies Saraburi as non-universal via NON_UNIVERSAL_GROUPS Set
     [PASS] Scenario 3b: Missing groups param correctly defaults standard groups to universal
     [PASS] Scenario 4: Group without explicit isUniversal=false defaults to treating as universal
     [PASS] Scenario 5: Explicit isUniversal=false excludes group-universal even if not in hardcoded NON_UNIVERSAL_GROUPS Set
     [PASS] Scenario 6a: RCU home group includes target group-icu8s via CROSS_GROUP_RULES
     [PASS] Scenario 6b: NVM23 home group includes both target group-1650 and group-icu3
     [PASS] Scenario 7: getAllowedTargetGroupIdsForHomeGroup guarantees unique elements in returned array
     [PASS] Scenario 8a: Filtering empty template array returns empty array cleanly
     [PASS] Scenario 8b: Saraburi user gets Pooled and Saraburi templates, NOT Universal or ICU8S

     ======================================================
     Results: 11 Passed, 0 Failed.
     ======================================================
     ```
  4. `npm run build` (`vite build`):
     ```
     vite v6.4.3 building for production...
     ✓ 1957 modules transformed.
     ✓ built in 16.52s
     ```

## 2. Logic Chain

1. **Scoping Logic Verification**:
   - `getAllowedTargetGroupIdsForHomeGroup` calculates allowed target group IDs using a `Set<string>` to ensure no duplicate entries are returned.
   - When given an unknown group ID (`group-unknown-999`), it gracefully includes the unknown group ID itself, `group-pooled`, and `group-universal`, preventing missing group crashes or empty selection dropdowns.
   - When given an empty string `""`, it skips adding `""` to the set and returns `['group-pooled', 'group-universal']`, cleanly supporting unassigned/general staff.
   - When `groups` is undefined, `NON_UNIVERSAL_GROUPS.has(homeGroupId)` provides a robust fallback so non-universal groups like `'group-saraburi'` and `'group-1650'` remain isolated even without optional metadata.
   - Explicit `isUniversal: false` in `DoctorGroup` metadata overrides default universal access for dynamically registered custom groups.

2. **Cross-Group Mapping & Circular Safety**:
   - `CROSS_GROUP_RULES` iteration performs a direct 1-hop lookup (`allowedHomeGroups.includes(homeGroupId)`). Because lookups do not recursively recurse through target groups, circular relationships cannot trigger call-stack overflows.

3. **Schedule & Template Filtering Integration**:
   - In `SchedulerDashboard.tsx`, `filteredTemplates` evaluates allowed target group IDs per user/group and checks `isAllowedForGroup || hasAssignedShift`, allowing historical assigned shifts to remain visible while constraining new template picks.
   - Outer doctors covering cross-group shifts are accurately included in `groupsWithUsers` and `filteredDoctors` based on target group rules without hardcoded group string conditionals.

4. **Build & Test Suite Integrity**:
   - All 108 E2E test cases across 4 Tiers plus Milestone 5 pass cleanly.
   - TypeScript compilation (`tsc --noEmit`) completes with 0 type errors.
   - Production Vite bundle builds without errors.

## 3. Caveats

- `CROSS_GROUP_RULES` is currently defined as a static mapping in `src/types.ts`. If future requirements call for runtime database-driven cross-group rules (e.g. stored in Firebase Firestore), `CROSS_GROUP_RULES` can be replaced with a parameter passed to `getAllowedTargetGroupIdsForHomeGroup` using the exact same algorithm.

## 4. Conclusion

- **VERDICT**: **PASS**
- The refactored group-scoped shift template logic and schedule filtering in `src/types.ts` and `src/components/SchedulerDashboard.tsx` are empirically correct, type-safe, and robust against boundary edge cases.

## 5. Verification Method

To independently verify this result:

1. **Run TypeScript type checker**:
   ```powershell
   npm run lint
   ```
   *Expected result*: Exits with code 0 and 0 errors.

2. **Run full test suite**:
   ```powershell
   npm test
   ```
   *Expected result*: 108 out of 108 tests pass (including 11 M5 test cases).

3. **Run production Vite build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Successfully transforms modules and emits distribution files to `dist/`.
