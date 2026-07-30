# Milestone 5 Test Suite Coverage & Verification Analysis Report (R1, R2, R3)

## 1. Observation

### Standard Command Verification Results
Execution of all standard project commands was performed and verified:
1. `npm run lint` (`tsc --noEmit`):
   - Command result: Exit code `0`. Passed cleanly with 0 TypeScript compilation errors.
2. `npm test` (`tsx tests/run-tests.ts`):
   - Command result: Exit code `0`.
   - Executed 97 test cases across Tier 1 (4-Week Grid Layout, View Switcher, Glowing User Highlights, Drag & Drop, Batch Assignment, Touch Menu, Copy/Paste Roster, Day Inspector), Tier 2 (Boundary & Corner Cases), Tier 3 (Cross-Feature Combinations), and Tier 4 (Real-World Application Workloads). All 97 passed.
3. `npm run build` (`vite build`):
   - Command result: Exit code `0`. Transformed 1957 modules and generated production assets in `dist/` cleanly.

### Existing Test Suite Inspection (`tests/`)
- Existing test files:
  - `tests/run-tests.ts`
  - `tests/test-framework.ts`
  - `tests/calendar-model.ts`
  - `tests/tier1-feature-coverage.test.ts`
  - `tests/tier2-boundary-corner-cases.test.ts`
  - `tests/tier3-cross-feature-combinations.test.ts`
  - `tests/tier4-real-world-scenarios.test.ts`
  - `tests/r1-r4-verification.ts` (Legacy Milestone 4 verification script for drag & drop modal prompt, batch assign control button, manage group relocation to admin dashboard, backdrop blur styling).
  - `tests/adversarial-stress.ts`
- **Key Finding**: Grep search for `ShiftTemplate`, `getAllowedTargetGroupIdsForHomeGroup`, or `CROSS_GROUP_RULES` in `tests/` yielded 0 results. Existing tests focus on 4-week grid state, UI view switching, drag-and-drop, and roster copy-paste, but **there is currently ZERO test coverage** for Milestone 5 requirements (R1 shift template scoping, R2 group-scoped schedule filtering, R3 hardcode removal).

### Hardcode Special-Casing Observations in Source Code (`src/`)
1. `src/types.ts`:
   - Line 91-96: `CROSS_GROUP_RULES` defines cross-group relationships.
   - Line 98-119: `getAllowedTargetGroupIdsForHomeGroup(homeGroupId: string)` contains hardcoded conditional logic:
     ```ts
     if (homeGroupId !== 'group-saraburi' && homeGroupId !== 'group-1650') {
       allowed.push('group-universal');
     }
     if (homeGroupId === 'group-saraburi') {
       allowed.push('group-saraburi');
     }
     if (homeGroupId === 'group-1650' || homeGroupId === 'group-nvmdown' || homeGroupId === 'group-nvm23-asd11') {
       allowed.push('group-1650');
     }
     ```
2. `src/components/SchedulerDashboard.tsx`:
   - Line 566:
     ```ts
     if ((myGroupId === 'group-saraburi' || myGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
       return false;
     }
     ```
   - Line 1291:
     ```ts
     if ((userGroupId === 'group-saraburi' || userGroupId === 'group-1650') && (t.groupId === 'group-universal' || ['เวรวันธรรมดา', 'เวรวันหยุด'].includes(t.name))) {
       return false;
     }
     ```
3. `src/firebase.ts`:
   - Line 348-364: `initialGroups` seeds 15 doctor groups including Saraburi, 1650, ICU8N, ICU8S, ICU3, CCU, RCU, NVM22, NVM21, NVM20, NVM19, NVMdown, 84 & 72/9, NVM23 ASD11, Universal/General.
   - Line 370-388: `initialTemplates` seeds universal, pooled, and group-specific templates.

---

## 2. Logic Chain

1. **Test Infrastructure Readiness**:
   - The test framework (`tests/test-framework.ts`) and runner (`tests/run-tests.ts`) use `tsx` and operate without external test runner dependencies.
   - All standard build/test/lint tools (`npm run lint`, `npm test`, `npm run build`) execute cleanly.

2. **Gap Analysis**:
   - Milestone 5 requires universal and group-specific shift template scoping (R1), group-scoped schedule viewing (R2), and removal of hardcoded special cases in favor of central permission helpers (R3).
   - Because `tests/` currently contains 0 tests for `ShiftTemplate` scoping or permission helpers, implementing M5 without expanding test coverage risks regressions or unverified special-casing bugs.

3. **Required Test Suite Expansion for Milestone 5**:
   - To verify R1, R2, and R3 comprehensively, a new test suite file `tests/m5-group-scoping-filtering.test.ts` (or `tests/m5-r1-r3-verification.ts`) must be created and integrated into `tests/run-tests.ts`.

---

## 3. Detailed Test Plan for R1, R2, and R3

### Requirement 1 (R1): Universal & Group-Specific Shift Template Scoping Test Requirements
- **Goal**: Verify that shift templates owned by any group are visible ONLY to users belonging to that home group or allowed target groups (`getAllowedTargetGroupIdsForHomeGroup`), and that universal/pooled templates are accessible according to central permission rules across all 15 doctor groups.
- **Required Unit & Integration Tests**:
  1. `R1-TPL-01`: **Home Group Template Isolation**:
     - Given a user in `group-saraburi`, only `group-saraburi` templates and allowed pooled/universal templates are returned. Templates from `group-1650`, `group-icu8s`, `group-icu8n`, `group-icu3` must be excluded.
  2. `R1-TPL-02`: **Cross-Group Target Template Access**:
     - Given a user in `group-rcu` where `CROSS_GROUP_RULES['group-icu8s']` includes `group-rcu`, the user can access templates for `group-icu8s`.
  3. `R1-TPL-03`: **Universal & Pooled Shift Template Inclusion**:
     - Given a doctor in a general group (e.g. `group-nvm22`), templates with `groupId: 'group-universal'`, `groupId: 'group-pooled'`, or `isPooled: true` are accessible.
  4. `R1-TPL-04`: **Universal Doctor Group Coverage**:
     - Parameterized verification for all doctor groups (`group-saraburi`, `group-1650`, `group-icu8s`, `group-icu8n`, `group-icu3`, `group-ccu`, `group-rcu`, `group-nvm23-asd11`, `group-nvmdown`, `group-84-72-9`, `group-nvm22`, `group-nvm21`, `group-nvm20`, `group-nvm19`) to confirm template filtering resolves dynamically for every group.

### Requirement 2 (R2): Group-Scoped Schedule & Shift View Test Requirements
- **Goal**: Verify that schedule view and doctor list rendering filters displayed groups and doctors dynamically based on user's home group and cross-group permissions without hardcoded special cases.
- **Required Unit & Integration Tests**:
  1. `R2-SCHED-01`: **Home Group Doctor Display**:
     - Given a home group view (e.g. `group-icu8s`), all doctors assigned to `group-icu8s` for the active schedule period are displayed.
  2. `R2-SCHED-02`: **Cross-Group Outer Doctor Display**:
     - Given an outer doctor from `group-rcu` assigned a shift in `group-icu8s` (where `group-rcu` is in `CROSS_GROUP_RULES['group-icu8s']`), the outer doctor is included in the `group-icu8s` schedule view with the `"จาก RCU"` indicator.
  3. `R2-SCHED-03`: **Non-Allowed Outer Doctor Exclusion**:
     - Given a doctor from an unrelated group (e.g. `group-saraburi`) who is not in `CROSS_GROUP_RULES` for `group-icu8s`, the doctor is excluded from the `group-icu8s` schedule view.
  4. `R2-SCHED-04`: **Dynamic Filtering Across All Groups**:
     - Verify schedule filtering produces consistent, group-scoped results across all 15 doctor groups without relying on group ID string matching in UI components.

### Requirement 3 (R3): Hardcode Removal & Dynamic Permission Helpers Test Requirements
- **Goal**: Ensure central permission helpers (`getAllowedTargetGroupIdsForHomeGroup`, `CROSS_GROUP_RULES`) handle all permission logic declaratively and that zero hardcoded group string checks remain in UI components.
- **Required Unit & Integration Tests**:
  1. `R3-PERM-01`: **Central Helper Logic Verification**:
     - Test `getAllowedTargetGroupIdsForHomeGroup(homeGroupId)` for all group IDs. Ensure rules return correct target group lists cleanly based on declarative data structures (such as `DoctorGroup.isUniversal` or `CROSS_GROUP_RULES`).
  2. `R3-PERM-02`: **AST / Code Inspection Test for Hardcode Elimination**:
     - Automated static analysis test scanning `src/components/SchedulerDashboard.tsx`, `src/types.ts`, `src/firebase.ts`, and `src/components/AssignShiftModal.tsx` to verify ZERO instances of hardcoded string checks like `myGroupId === 'group-saraburi' || myGroupId === 'group-1650'`.
  3. `R3-PERM-03`: **Full Regression Verification**:
     - Run complete suite (`npm test`) ensuring all 97 existing tests plus all new M5 tests pass with 0 failures.

---

## 4. Caveats

- **Network Mode**: Operates under strict CODE_ONLY network constraints. Verification was performed entirely via local command execution (`npm run lint`, `npm test`, `npm run build`) and file inspection.
- **Implementation Non-Interference**: As Explorer 3, no source code files in `src/` were modified. Proposed test suite code and verification criteria are documented here for the implementer and test runner.

---

## 5. Conclusion

1. **Current Test Suite Health**: All existing project build, lint, and test scripts (`npm run lint`, `npm test`, `npm run build`) pass with 0 errors across 97 test cases.
2. **Identified Gap**: Current tests do NOT cover shift template scoping, schedule group filtering, or permission helper functions.
3. **Actionable Plan**: Implement a dedicated M5 test suite `tests/m5-group-scoping-filtering.test.ts` containing 11 tests covering R1 (Template Scoping), R2 (Schedule Filtering), and R3 (Central Helper Resolution & Hardcode Elimination static analysis).

---

## 6. Verification Method

To verify this analysis and the upcoming M5 implementation:
1. Run lint check:
   ```powershell
   npm run lint
   ```
   *Expected result*: Exit code `0`, no TypeScript errors.

2. Run test suite:
   ```powershell
   npm test
   ```
   *Expected result*: Exit code `0`, 97+ tests passing (including new M5 test suite).

3. Run build:
   ```powershell
   npm run build
   ```
   *Expected result*: Exit code `0`, production assets compiled in `dist/`.

4. Specific files to inspect for M5 verification:
   - `src/types.ts` (Verify clean `getAllowedTargetGroupIdsForHomeGroup` and `CROSS_GROUP_RULES`)
   - `src/components/SchedulerDashboard.tsx` (Verify removal of lines 566 and 1291 hardcoded checks)
   - `tests/run-tests.ts` (Verify integration of M5 test suite)
