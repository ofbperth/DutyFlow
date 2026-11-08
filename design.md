# DutyFlow design

DutyFlow uses a modern minimal workbench. The toolbar establishes the active
period, roster scope and view. The roster occupies the remaining width. Forms and
management pages use the same type, controls and semantic colors.

- Surfaces use slate 950 for the app shell, slate 900 for panels and slate 700 for
  visible boundaries. Use emerald for selected views and primary schedule actions.
  Amber identifies drafts or a user's own entry, always with a text label.
- Keep the existing Inter, Space Grotesk and JetBrains Mono stack. Roster names
  and shift labels use 14px as the baseline. Use tabular numerals for dates and times.
- Use one shared row and column layout for matrices. Preserve the staff names and
  dates while scrolling. Default to a seven day window for legibility.
- Calendar uses seven columns on wide screens and a weekly agenda on narrow screens.
  Show a person's name under the shift, and expose overflow in the day roster.
- Put setup, export and other secondary actions away from the reading path. Use
  explicit buttons and focus states for actions, including on touch screens.
- Avoid decorative motion and continuously animated states.

The shared control and roster styles are defined in `src/index.css` using the
existing Tailwind theme tokens.
