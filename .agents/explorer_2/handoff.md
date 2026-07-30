# Handoff Report — R3: Fix & Scope PDF Export for Duty Schedules

## 1. Observation

### Implementation Locations & Current Architecture
- **Primary PDF Export Trigger & Handler**: `src/components/SchedulerDashboard.tsx`
  - Import statement (line 27): `import jsPDF from 'jspdf';`
  - Export state (line 75): `const [isExportingPDF, setIsExportingPDF] = useState(false);`
  - Export handler (lines 408-482): `const handleExportPDF = () => { ... }`
  - Export button UI (lines 820-832): `id="export-pdf-btn"`
- **Missing Utility**: `src/utils/pdfExport.ts` does not yet exist. All PDF generation logic is currently inline inside `SchedulerDashboard.tsx`.
- **Secondary Dashboard**: `src/components/UserDashboard.tsx` contains export buttons for `.ics` and calendar sync (lines 1342-1375), but lacks a PDF export trigger.

### Observed Root Causes of PDF Export Bugs & Scoping Failures

1. **Unscoped User & Shift Inclusion (Scoping Violation)**:
   Lines 445-466 in `SchedulerDashboard.tsx`:
   ```ts
   // Rows for each user
   users.forEach((u, uIdx) => {
     ...
     datesArray.forEach((dateStr, dIdx) => {
       const shift = shifts.find(s => s.userId === u.id && s.date === dateStr);
       if (shift) {
         const temp = templates.find(t => t.id === shift.templateId);
         if (temp) {
           doc.text(temp.name.substring(0, 3), 50 + (dIdx * colWidth), currentY + 5);
         }
       }
     });
   });
   ```
   - **Bug**: `users.forEach(...)` iterates over ALL users in the database without checking group membership. `shifts.find(...)` matches any shift for user `u` on `dateStr` regardless of home group or cross-group rules.
   - **Impact**: Exported PDFs leak shifts from unrelated doctor groups and include staff who do not belong to the active home group or allowed cross-group assignments.

2. **Thai Character / Unicode Encoding Failures in jsPDF**:
   Lines 453 and 462 in `SchedulerDashboard.tsx`:
   ```ts
   doc.text(u.name.substring(0, 15), 16, currentY + 5);
   ...
   doc.text(temp.name.substring(0, 3), 50 + (dIdx * colWidth), currentY + 5);
   ```
   - **Bug**: Standard jsPDF built-in fonts (`helvetica`) use WinAnsi/ASCII encoding and do NOT support Thai Unicode glyphs (e.g. `เวรวันธรรมดา`, `เวรวันหยุด`, `เช้า`, `บ่าย`, `ดึก`, Thai doctor names).
   - **Impact**: `doc.text()` throws encoding errors, outputs unprintable garbage (`???`), or fails completely when attempting to render Thai text. Furthermore, `temp.name.substring(0, 3)` truncates Thai UTF-16 multi-byte characters mid-string (e.g., `เวร`), corrupting text metrics.

3. **Multi-Page Layout & Header Pagination Glitch**:
   Lines 468-471 in `SchedulerDashboard.tsx`:
   ```ts
   if (currentY > 185) {
     doc.addPage();
     currentY = 20;
   }
   ```
   - **Bug**: When `doc.addPage()` is triggered, `currentY` resets to 20, but the dark slate header row (`Staff Member` + date indices `1..28`) is NOT re-rendered on page 2+.
   - **Impact**: Multi-page PDF exports display rows without column headers or day numbers on all pages past page 1.

---

## 2. Logic Chain

### Step 1: Shift & User Scoping Algorithm for PDF Export
To satisfy requirement R3 ("strictly includes home group staff shifts and the user's own cross-group shifts"), the export engine must calculate:

1. **Active Home Group ID (`myHomeGroupId`)**:
   - Determine `currentUser`'s active group assignment for the schedule period:
     `const myHomeGroupId = rotationAssignments.find(a => a.userId === currentUser.id && (a.periodId === periodId || !a.periodId))?.groupId || '';`

2. **Filtered Export Users (`exportUsers`)**:
   - **Home Group Staff**: Users assigned to `myHomeGroupId` in `rotationAssignments`.
   - **Cross-Group Staff in Home Group**: Users from allowed cross-group source groups (`CROSS_GROUP_RULES[myHomeGroupId]`) who have shifts assigned in `myHomeGroupId` during the period.
   - **Logged-in User**: Ensure `currentUser` is explicitly included in `exportUsers`.
   - **Exclusions**: Staff from unrelated groups with no shifts in `myHomeGroupId` are excluded.

3. **Filtered Shifts per User (`getExportShiftsForUser(u)`)**:
   - For `currentUser`: Include shifts where `s.userId === currentUser.id` AND either:
     - Shift is for `myHomeGroupId` (home group shift), OR
     - Shift is `currentUser`'s own cross-group shift (`s.targetGroupId` is an allowed cross-group target outside `myHomeGroupId`).
   - For any other staff member `u` (`u.id !== currentUser.id`): Include ONLY shifts where `s.targetGroupId === myHomeGroupId` or template belongs to `myHomeGroupId`/universal/pooled. Exclude cross-group shifts of other doctors outside `myHomeGroupId`.

### Step 2: Safe Font & Text Formatting Engine
To prevent jsPDF encoding crashes and unprintable Thai glyphs:
1. **Shift Code Mapping (`getShiftShortCode`)**:
   Map shift templates to clean ASCII short codes:
   - `temp-group-weekday` or "ธรรมดา" / "Weekday" $\rightarrow$ `"WD"`
   - `temp-group-holiday` or "หยุด" / "Holiday" $\rightarrow$ `"HD"`
   - "เช้า" / "Morning" $\rightarrow$ `"M"`
   - "บ่าย" / "Afternoon" $\rightarrow$ `"A"`
   - "ดึก" / "Night" $\rightarrow$ `"N"`
   - "1650" $\rightarrow$ `"1650"`
   - "สระบุรี" $\rightarrow$ `"SRB"`
   - Fallback: ASCII alphanumeric extract `template.name.replace(/[^\x00-\x7F]/g, '').trim().substring(0, 3) || 'SFT'`
2. **Safe Staff Name Formatting (`getSafeUserName`)**:
   - Extract clean ASCII name representation or format as `Dr. ${u.name}` / `Dr. ${u.email.split('@')[0]}` if non-ASCII, ensuring safe rendering in standard Helvetica.

### Step 3: PDF Table Pagination & Layout Engine
1. **Landscape Page Geometry**:
   - A4 Landscape width = 297mm, height = 210mm.
   - Margins: Left = 14mm, Right = 14mm, Printable width = 269mm.
   - Column 0 (Staff Member): width = 38mm.
   - Date columns (Days 1..28): `colWidth = (269 - 38) / datesArray.length` (~8.25mm per column).
2. **Header Redraw Helper (`drawTableHeader(startY)`)**:
   - Renders dark slate header background (`#1e293b`).
   - Renders "Staff Member" label and day numbers `1..28` + day-of-week abbreviations (`Mo`, `Tu`, `Sa`, `Su`).
   - Invoked on page 1 and whenever `doc.addPage()` is called.
3. **Legend Footer**:
   - Appends a legend key at the bottom of the table: `WD = Weekday Shift | HD = Holiday Shift | * = Cross-Group Shift`.

---

## 3. Caveats

1. **Shift Template Name Fallback**:
   If custom shift templates with custom non-ASCII Thai names are added, `getShiftShortCode` will use fallback ASCII initials or template ID suffixes to ensure jsPDF does not throw an encoding error.
2. **Read-Only Investigation**:
   This report provides precise implementation instructions. Source code changes will be applied by the implementer agent.
3. **No External Dependencies Required**:
   The solution leverages existing `jspdf` package (`^4.2.1`) already installed in `package.json` without requiring external binary canvas engines.

---

## 4. Conclusion

By creating `src/utils/pdfExport.ts` with strict user/shift filtering, safe ASCII short-code formatting, and repeatable table header pagination, PDF export will execute without rendering errors or layout glitches and strictly output home group staff shifts plus the user's own cross-group shifts.

---

## 5. Precise Implementation Instructions for Implementer

### File 1: Create `src/utils/pdfExport.ts`

Create a new file `src/utils/pdfExport.ts` with the following implementation:

```typescript
import jsPDF from 'jspdf';
import { User, Shift, ShiftTemplate, SchedulePeriod, DoctorGroup, GroupRotationAssignment, CROSS_GROUP_RULES } from '../types';

export interface ExportPDFParams {
  currentUser: User;
  users: User[];
  templates: ShiftTemplate[];
  shifts: Shift[];
  groups: DoctorGroup[];
  rotationAssignments: GroupRotationAssignment[];
  schedulePeriod: SchedulePeriod | null;
  datesArray: string[];
}

/**
 * Maps shift template to a safe ASCII short code for jsPDF rendering.
 */
export const getShiftShortCode = (template?: ShiftTemplate): string => {
  if (!template) return '';
  const id = template.id || '';
  const name = template.name || '';

  if (id === 'temp-group-weekday' || name.includes('ธรรมดา') || name.toLowerCase().includes('weekday')) {
    return 'WD';
  }
  if (id === 'temp-group-holiday' || name.includes('หยุด') || name.toLowerCase().includes('holiday')) {
    return 'HD';
  }
  if (name.includes('เช้า') || name.toLowerCase().includes('morning')) return 'M';
  if (name.includes('บ่าย') || name.toLowerCase().includes('afternoon')) return 'A';
  if (name.includes('ดึก') || name.toLowerCase().includes('night')) return 'N';
  if (name.includes('1650')) return '1650';
  if (name.includes('สระบุรี')) return 'SRB';

  const asciiName = name.replace(/[^\x00-\x7F]/g, '').trim();
  if (asciiName.length > 0) {
    return asciiName.substring(0, 3).toUpperCase();
  }
  return 'SFT';
};

/**
 * Formats user name safely for jsPDF Helvetica standard font.
 */
export const getSafeUserName = (user: User): string => {
  const name = user.name || '';
  const asciiName = name.replace(/[^\x00-\x7F]/g, '').trim();
  if (asciiName.length >= 2) {
    return asciiName.substring(0, 16);
  }
  if (user.email) {
    const handle = user.email.split('@')[0];
    return `Dr. ${handle.charAt(0).toUpperCase() + handle.slice(1)}`.substring(0, 16);
  }
  return `Staff ${user.id.substring(0, 4)}`;
};

/**
 * Exports duty schedule to PDF with strict home group & own cross-group scoping.
 */
export const exportScheduleToPDF = ({
  currentUser,
  users,
  templates,
  shifts,
  groups,
  rotationAssignments,
  schedulePeriod,
  datesArray
}: ExportPDFParams): void => {
  const periodId = schedulePeriod?.id || 'current';
  const periodTitle = schedulePeriod?.title || 'Schedule Period';
  const periodRange = schedulePeriod ? `${schedulePeriod.startDate} to ${schedulePeriod.endDate}` : '';

  // 1. Identify active home group ID for currentUser
  const currentUserAssignment = rotationAssignments.find(
    a => a.userId === currentUser.id && (a.periodId === periodId || !a.periodId)
  );
  const myHomeGroupId = currentUserAssignment?.groupId || '';
  const myGroupObj = groups.find(g => g.id === myHomeGroupId);
  const myGroupName = myGroupObj ? myGroupObj.name : 'Duty Schedule';

  // 2. Identify Home Group Staff
  const homeGroupUsers = users.filter(u => {
    const assignment = rotationAssignments.find(
      a => a.userId === u.id && (a.periodId === periodId || !a.periodId)
    );
    return assignment && assignment.groupId === myHomeGroupId;
  });

  // 3. Identify Cross-Group Staff working in myHomeGroupId
  const allowedHomeGroupsForTarget = CROSS_GROUP_RULES[myHomeGroupId] || [];
  const crossGroupStaffInMyGroup = users.filter(u => {
    const assignment = rotationAssignments.find(
      a => a.userId === u.id && (a.periodId === periodId || !a.periodId)
    );
    const homeGroupId = assignment?.groupId;
    if (!homeGroupId || homeGroupId === myHomeGroupId) return false;
    if (!allowedHomeGroupsForTarget.includes(homeGroupId)) return false;

    return shifts.some(s => {
      if (s.userId !== u.id || !datesArray.includes(s.date)) return false;
      const targetId = s.targetGroupId || templates.find(t => t.id === s.templateId)?.groupId;
      return targetId === myHomeGroupId;
    });
  });

  // 4. Combine into unique Export Users set
  const exportUsersMap = new Map<string, User>();
  homeGroupUsers.forEach(u => exportUsersMap.set(u.id, u));
  crossGroupStaffInMyGroup.forEach(u => exportUsersMap.set(u.id, u));
  if (!exportUsersMap.has(currentUser.id)) {
    exportUsersMap.set(currentUser.id, currentUser);
  }
  const exportUsers = Array.from(exportUsersMap.values());

  // 5. Initialize PDF document (A4 Landscape)
  const doc = new jsPDF('landscape');
  const pageMargin = 14;
  const tableWidth = 269;
  const staffColWidth = 38;
  const numDays = datesArray.length || 28;
  const dayColWidth = (tableWidth - staffColWidth) / numDays;

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`DutyFlow: ${myGroupName} Duty Schedule`, pageMargin, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rotation: ${periodTitle} (${periodRange})`, pageMargin, 23);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | User: ${getSafeUserName(currentUser)}`, pageMargin, 28);

  // Helper to draw table header
  const drawTableHeader = (startY: number): number => {
    doc.setFillColor(30, 41, 59); // Dark slate header
    doc.rect(pageMargin, startY, tableWidth, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Staff Member', pageMargin + 2, startY + 6);

    datesArray.forEach((dateStr, index) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayNum = String(dateObj.getDate());
      const xPos = pageMargin + staffColWidth + (index * dayColWidth);
      doc.text(dayNum, xPos + (dayColWidth / 4), startY + 6);
    });

    doc.setTextColor(50, 50, 50);
    return startY + 9;
  };

  let currentY = drawTableHeader(33);

  // 6. Draw Table Rows
  exportUsers.forEach((u, uIdx) => {
    if (currentY > 180) {
      doc.addPage();
      currentY = drawTableHeader(15);
    }

    const isMe = u.id === currentUser.id;

    // Background highlight
    if (isMe) {
      doc.setFillColor(239, 246, 255); // Light blue tint for current user
      doc.rect(pageMargin, currentY, tableWidth, 7, 'F');
    } else if (uIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // Alternating light gray
      doc.rect(pageMargin, currentY, tableWidth, 7, 'F');
    }

    doc.setFont('helvetica', isMe ? 'bold' : 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isMe ? 37 : 50, isMe ? 99 : 50, isMe ? 235 : 50);
    const displayName = `${getSafeUserName(u)}${isMe ? ' (Me)' : ''}`;
    doc.text(displayName.substring(0, 18), pageMargin + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    // Get shifts for user u
    const userShifts = shifts.filter(s => {
      if (s.userId !== u.id || !datesArray.includes(s.date)) return false;
      const template = templates.find(t => t.id === s.templateId);
      const targetGroupId = s.targetGroupId || template?.groupId;

      if (u.id === currentUser.id) {
        const isHomeGroupShift = targetGroupId === myHomeGroupId || template?.groupId === myHomeGroupId || template?.groupId === 'group-universal' || template?.isPooled;
        const isOwnCrossGroupShift = targetGroupId && targetGroupId !== myHomeGroupId;
        return isHomeGroupShift || isOwnCrossGroupShift;
      }

      return targetGroupId === myHomeGroupId || template?.groupId === myHomeGroupId || template?.groupId === 'group-universal' || template?.isPooled;
    });

    datesArray.forEach((dateStr, dIdx) => {
      const shift = userShifts.find(s => s.date === dateStr);
      if (shift) {
        const template = templates.find(t => t.id === shift.templateId);
        let code = getShiftShortCode(template);
        if (shift.targetGroupId && shift.targetGroupId !== myHomeGroupId) {
          code += '*'; // Mark cross-group shift
        }
        const xPos = pageMargin + staffColWidth + (dIdx * dayColWidth);
        doc.text(code, xPos + 1, currentY + 5);
      }
    });

    currentY += 7;
  });

  // 7. Legend Footer
  currentY += 4;
  if (currentY > 195) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Legend: WD = Weekday Shift | HD = Holiday Shift | M = Morning | A = Afternoon | N = Night | * = Cross-Group Shift', pageMargin, currentY);

  // 8. Save PDF
  const cleanTitle = periodTitle.replace(/\s+/g, '_');
  const cleanGroup = myGroupName.replace(/\s+/g, '_');
  doc.save(`DutyFlow_Schedule_${cleanGroup}_${cleanTitle}.pdf`);
};
```

---

### File 2: Update `src/components/SchedulerDashboard.tsx`

1. **Import `exportScheduleToPDF`**:
   Replace `import jsPDF from 'jspdf';` on line 27 with:
   `import { exportScheduleToPDF } from '../utils/pdfExport';`

2. **Update `handleExportPDF`**:
   Refactor `handleExportPDF` (lines 408-482) to:
   ```typescript
   // Export to PDF
   const handleExportPDF = () => {
     setIsExportingPDF(true);
     try {
       exportScheduleToPDF({
         currentUser,
         users,
         templates,
         shifts,
         groups,
         rotationAssignments,
         schedulePeriod: activePeriod,
         datesArray
       });
       triggerStatus('PDF exported successfully!');
     } catch (err: any) {
       console.error('PDF Export Error:', err);
       triggerStatus(err.message || 'Failed to generate PDF document.', 'error');
     } finally {
       setIsExportingPDF(false);
     }
   };
   ```

---

## 6. Verification Method

1. **Automated Verification**:
   - Execute TypeScript check: `npm run lint`
   - Run unit test suite: `npm test`
   - Test production bundle build: `npm run build`

2. **Manual Verification Procedure**:
   - Log in to DutyFlow as a scheduler in a specific home group (e.g., Saraburi or ICU8S).
   - Assign shifts for home group staff and a cross-group shift for `currentUser`.
   - Click **Export Schedule (PDF)** (`#export-pdf-btn`).
   - Verify the generated PDF opens cleanly without errors.
   - Confirm table includes only home group staff and `currentUser`'s own cross-group shift.
   - Confirm multi-page exports repeat header rows on page 2+.
