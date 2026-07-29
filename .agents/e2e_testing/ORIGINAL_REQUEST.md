## 2026-07-29T15:36:18Z

You are the E2E Testing Specialist for the DutyFlow project.
Your working directory is c:\DEV\DutyFlow\.agents\e2e_testing. Create this directory if it does not exist.

Your responsibility (E2E Testing Track):
1. Read c:\DEV\DutyFlow\.agents\ORIGINAL_REQUEST.md and c:\DEV\DutyFlow\TEST_INFRA.md.
2. Examine the codebase structure in c:\DEV\DutyFlow\src.
3. Design and implement test cases across 4 Tiers:
   - Tier 1: Feature Coverage (≥5 tests per feature: 4-Week grid layout, View switcher, Glowing highlights, Drag & drop, Batch assign, Touch menu, Copy-paste day, Day inspector).
   - Tier 2: Boundary & Corner Cases (empty dates, overflow dates, multi-date selections, invalid drops).
   - Tier 3: Cross-Feature Combinations (view switching while selecting date, batch assigning with inspector open, copy-pasting into multi-select dates).
   - Tier 4: Real-World Application Scenarios (full 28-day schedule setup and editing).
4. Implement the test runner / test infrastructure (using Vitest/Jest/React Testing Library or a clean TypeScript test runner script that can be executed via `npm test` or `npx tsx ...` or integrated into `npm run build`).
5. Ensure build and lint succeed (`npm run build`, `npm run lint`).
6. Publish c:\DEV\DutyFlow\TEST_READY.md containing the summary of the test infrastructure, test runner execution command, and coverage matrix.
7. Send a message to parent orchestrator when complete with handoff report at c:\DEV\DutyFlow\.agents\e2e_testing\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
