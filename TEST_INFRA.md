# E2E Test Infra: DutyFlow 4-Week Calendar & Adaptive Scheduling

## Test Philosophy
- Opaque-box, requirement-driven testing. No dependency on implementation design details.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | 4-Week Grid Layout (Zero Side-Scroll) | R1 / AC1 | 5 | 5 | ✓ | ✓ |
| 2 | View Switcher (Calendar vs Matrix) | R1 / AC2 | 5 | 5 | ✓ | ✓ |
| 3 | Glowing User Shift Highlights | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Desktop Drag & Drop Scheduling | R2 / AC3 | 5 | 5 | ✓ | ✓ |
| 5 | Desktop Multi-Select Batch Assignment | R2 / AC4 | 5 | 5 | ✓ | ✓ |
| 6 | iPad/Mobile Touch Context Menu | R2 / AC5 | 5 | 5 | ✓ | ✓ |
| 7 | iPad/Mobile Copy & Paste Day Roster | R2 / AC6 | 5 | 5 | ✓ | ✓ |
| 8 | Day Inspector Panel (Collapsible/Expandable) | R3 | 5 | 5 | ✓ | ✓ |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 40)
- Tier 2: ≥5 boundary/edge cases per feature (Total ≥ 40)
- Tier 3: Pairwise combinations of features (Total ≥ 10)
- Tier 4: Real-world 28-day rotation scenarios (Total ≥ 5)
