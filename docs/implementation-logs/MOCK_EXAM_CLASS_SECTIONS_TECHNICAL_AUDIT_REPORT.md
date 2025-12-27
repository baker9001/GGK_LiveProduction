# Technical Audit Report: Mock Exam Creation & Class Sections Data Fetching

## Executive Summary

This comprehensive technical audit identified **CRITICAL ISSUES** preventing mock exam creation and class sections data fetching. The root causes are:

1. **CRITICAL**: Row Level Security (RLS) policy logic error on `mock_exams` table INSERT operations
2. **CRITICAL**: Missing foreign key relationship between `students` and `class_sections` tables
3. **CRITICAL**: Incorrect query in `mockExamService.ts` attempting to count students via non-existent column

---

## ISSUE #1: Mock Exams Table INSERT Policy Logic Error

### Severity: CRITICAL
### Impact: Blocks ALL mock exam creation for entity admins and school admins

### Root Cause Analysis

The INSERT policies for `mock_exams` table contain a **fatal logic error**:

```sql
-- CURRENT (BROKEN) POLICY for Entity Admins
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM entity_users eu
    WHERE eu.user_id = auth.uid()
      AND eu.company_id = eu.company_id  -- ❌ SELF-REFERENCING BUG
      AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
      AND eu.is_active = true
  )
)

-- CURRENT (BROKEN) POLICY for School Admins
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM entity_users eu
    WHERE eu.user_id = auth.uid()
      AND eu.company_id = eu.company_id  -- ❌ SELF-REFERENCING BUG
      AND eu.admin_level = 'school_admin'
      AND eu.is_active = true
  )
)
```

**Problem**: The condition `eu.company_id = eu.company_id` is **always true** and doesn't validate against the `mock_exams.company_id` being inserted. This causes the policy check to fail because it never references the actual row being inserted.

### Expected Behavior

The policy should check if the user has permission to create mock exams in the **specific company** being inserted:

```sql
-- CORRECT POLICY for Entity Admins
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM entity_users eu
    WHERE eu.user_id = auth.uid()
      AND eu.company_id = mock_exams.company_id  -- ✅ References the inserted row
      AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
      AND eu.is_active = true
  )
)
```

### Solution

**Migration File**: `fix_mock_exams_insert_rls_policies.sql`

```sql
/*
  # Fix Mock Exams INSERT RLS Policies

  ## Problem
  The INSERT policies for mock_exams have a critical logic error where
  `eu.company_id = eu.company_id` is self-referencing instead of comparing
  against the `mock_exams.company_id` being inserted.

  ## Changes
  - Drop and recreate "Entity admins can create mock exams in their company" policy
  - Drop and recreate "School admins can create mock exams for their schools" policy
  - Fix the WITH CHECK condition to properly reference mock_exams.company_id

  ## Security
  - Maintains existing security model
  - Properly restricts INSERT based on user's company_id
  - No change to other operations
*/

-- Drop existing broken policies
DROP POLICY IF EXISTS "Entity admins can create mock exams in their company" ON mock_exams;
DROP POLICY IF EXISTS "School admins can create mock exams for their schools" ON mock_exams;

-- Recreate with correct logic for Entity Admins
CREATE POLICY "Entity admins can create mock exams in their company"
  ON mock_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- Recreate with correct logic for School Admins
CREATE POLICY "School admins can create mock exams for their schools"
  ON mock_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );
```

---

## ISSUE #2: Missing Student-ClassSection Relationship

### Severity: CRITICAL
### Impact: Cannot fetch student counts for class sections, breaks UI display

### Root Cause Analysis

The `students` table schema does NOT contain a `class_section_id` foreign key column. Current schema shows:

```
students table columns:
- id
- user_id
- student_code
- enrollment_number
- grade_level (text)  ← String field, not FK
- section (text)      ← String field, not FK
- school_id
- branch_id
- company_id
- is_active
- ... (other columns)
```

However, the query in `mockExamService.ts` attempts to:

```typescript
// Line 453 in mockExamService.ts
.select(`
  id,
  section_name,
  grade_level_id,
  grade_levels!class_sections_grade_level_id_fkey (
    id,
    grade_name,
    school_id
  ),
  students (count)  // ❌ FAILS: No FK relationship exists
`)
```

### Expected Behavior

There should be a proper many-to-many or one-to-many relationship between `students` and `class_sections` via a foreign key.

### Solution Option 1: Add Direct Foreign Key (Recommended for Simple Cases)

```sql
/*
  # Add class_section_id to students table

  1. Changes
    - Add class_section_id column to students table
    - Create foreign key constraint
    - Create index for performance
    - Migrate existing data (map text section to class_section_id)

  2. Security
    - No RLS changes needed (inherits from students table policies)
*/

-- Add the column
ALTER TABLE students
ADD COLUMN IF NOT EXISTS class_section_id uuid
REFERENCES class_sections(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_class_section_id
ON students(class_section_id);

-- Data migration: Map existing text-based sections to class_section IDs
-- This is a template - adjust based on your data structure
UPDATE students s
SET class_section_id = cs.id
FROM class_sections cs
WHERE cs.section_name = s.section
  AND cs.grade_level_id IN (
    SELECT gl.id
    FROM grade_levels gl
    WHERE gl.grade_name = s.grade_level
  )
  AND s.class_section_id IS NULL;
```

### Solution Option 2: Create Junction Table (Recommended for Flexible Assignments)

```sql
/*
  # Create student_class_sections junction table

  1. New Table
    - student_class_sections - Many-to-many relationship
      - id (uuid, primary key)
      - student_id (uuid, references students)
      - class_section_id (uuid, references class_sections)
      - academic_year_id (uuid, optional)
      - enrollment_date (timestamp)
      - is_active (boolean)
      - created_at (timestamp)

  2. Security
    - Enable RLS
    - Allow entity/school/branch admins to manage
    - Students can view their own assignments
*/

CREATE TABLE IF NOT EXISTS student_class_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id uuid NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  enrollment_date timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, class_section_id, academic_year_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_class_sections_student
ON student_class_sections(student_id);

CREATE INDEX IF NOT EXISTS idx_student_class_sections_section
ON student_class_sections(class_section_id);

CREATE INDEX IF NOT EXISTS idx_student_class_sections_active
ON student_class_sections(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE student_class_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Entity admins manage student_class_sections in company"
  ON student_class_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM students st
      JOIN entity_users eu ON eu.company_id = st.company_id
      WHERE st.id = student_class_sections.student_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "School admins manage student_class_sections in schools"
  ON student_class_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM students st
      JOIN entity_user_schools eus ON eus.school_id = st.school_id
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE st.id = student_class_sections.student_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

CREATE POLICY "Students view own class section assignments"
  ON student_class_sections
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins full access to student_class_sections"
  ON student_class_sections
  FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));
```

---

## ISSUE #3: Incorrect Query in MockExamService

### Severity: HIGH
### Impact: Class sections cannot be fetched with student counts

### Root Cause

File: `src/services/mockExamService.ts`, lines 442-456

```typescript
let query = supabase
  .from('class_sections')
  .select(`
    id,
    section_name,
    grade_level_id,
    grade_levels!class_sections_grade_level_id_fkey (
      id,
      grade_name,
      school_id
    ),
    students (count)  // ❌ This fails - no FK relationship
  `)
```

### Solution

Update the query based on which solution you choose for Issue #2:

**If using Solution Option 1 (Direct FK):**

```typescript
let query = supabase
  .from('class_sections')
  .select(`
    id,
    section_name,
    grade_level_id,
    grade_levels!class_sections_grade_level_id_fkey (
      id,
      grade_name,
      school_id
    ),
    students!students_class_section_id_fkey (count)
  `)
  .in('grade_level_id', targetGradeLevelIds)
  .eq('status', 'active');
```

**If using Solution Option 2 (Junction Table):**

```typescript
// Option A: Two separate queries (simpler, less performant)
const { data, error } = await query;
if (error) throw error;

const sectionIds = data.map(s => s.id);
const { count: studentCounts, error: countError } = await supabase
  .from('student_class_sections')
  .select('class_section_id, student_id', { count: 'exact' })
  .in('class_section_id', sectionIds)
  .eq('is_active', true);

// Map counts to sections
const countMap = new Map();
// ... mapping logic

// Option B: Use a database function (more performant)
let query = supabase
  .from('class_sections')
  .select(`
    id,
    section_name,
    grade_level_id,
    grade_levels!class_sections_grade_level_id_fkey (
      id,
      grade_name,
      school_id
    )
  `)
  .in('grade_level_id', targetGradeLevelIds)
  .eq('status', 'active');

const { data, error } = await query;

// Get student counts separately
if (data) {
  const sectionIds = data.map(s => s.id);
  const { data: counts } = await supabase
    .rpc('get_student_counts_by_section', { section_ids: sectionIds });

  // Merge counts into data
  // ... merging logic
}
```

---

## ISSUE #4: Missing SELECT Policies on Junction Tables

### Severity: MEDIUM
### Impact: May prevent reading junction table data after INSERT

### Root Cause

The following junction tables have INSERT policies but incomplete SELECT policies:

- `mock_exam_schools`
- `mock_exam_branches`
- `mock_exam_grade_levels`
- `mock_exam_sections`
- `mock_exam_teachers`

Current policy only checks if parent `mock_exams` exists, but doesn't validate user access.

### Solution

```sql
/*
  # Add proper SELECT policies for mock exam junction tables

  1. Changes
    - Add SELECT policies that properly check user permissions
    - Align with existing INSERT policies

  2. Security
    - Entity admins can view all junction records for their company's exams
    - School admins can view junction records for their schools' exams
    - System admins have full access
*/

-- mock_exam_schools
DROP POLICY IF EXISTS "Allow access to mock exam schools based on exam access" ON mock_exam_schools;

CREATE POLICY "Entity admins view mock exam schools in company"
  ON mock_exam_schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM mock_exams me
      JOIN entity_users eu ON eu.company_id = me.company_id
      WHERE me.id = mock_exam_schools.mock_exam_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "School admins view mock exam schools for their schools"
  ON mock_exam_schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = mock_exam_schools.school_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Repeat similar patterns for other junction tables
-- mock_exam_branches, mock_exam_grade_levels, mock_exam_sections, mock_exam_teachers
```

---

## Testing Recommendations

### Test Case 1: Mock Exam Creation

```typescript
// Test as entity admin
const testCreateMockExam = async () => {
  const { data: user } = await supabase.auth.getUser();
  console.log('Current user:', user);

  const { data: entityUser } = await supabase
    .from('entity_users')
    .select('company_id, admin_level')
    .eq('user_id', user.id)
    .single();
  console.log('Entity user:', entityUser);

  // Attempt to create mock exam
  const { data, error } = await supabase
    .from('mock_exams')
    .insert({
      company_id: entityUser.company_id,
      title: 'Test Mock Exam',
      scheduled_date: '2025-10-15',
      duration_minutes: 120,
      status: 'planned',
      exam_window: 'Term 2',
      delivery_mode: 'In-person'
    })
    .select()
    .single();

  if (error) {
    console.error('ERROR:', error);
    // Should NOT fail after fix
  } else {
    console.log('SUCCESS:', data);
  }
};
```

### Test Case 2: Class Sections with Student Counts

```typescript
// Test fetching class sections
const testClassSections = async () => {
  const schoolIds = ['your-school-id'];
  const gradeLevelIds = ['your-grade-level-id'];

  const { data, error } = await supabase
    .from('class_sections')
    .select(`
      id,
      section_name,
      grade_level_id,
      grade_levels!class_sections_grade_level_id_fkey (
        id,
        grade_name
      )
    `)
    .in('grade_level_id', gradeLevelIds)
    .eq('status', 'active');

  console.log('Sections:', data);
  console.log('Error:', error);

  // Get student counts separately
  if (data && data.length > 0) {
    const sectionIds = data.map(s => s.id);
    const { data: studentData } = await supabase
      .from('student_class_sections')
      .select('class_section_id, student_id', { count: 'exact' })
      .in('class_section_id', sectionIds)
      .eq('is_active', true);

    console.log('Student assignments:', studentData);
  }
};
```

### Test Case 3: End-to-End Mock Exam Creation

```typescript
// Full integration test
const testFullMockExamCreation = async () => {
  // 1. Create mock exam
  const { data: mockExam, error: examError } = await supabase
    .from('mock_exams')
    .insert({ /* ... */ })
    .select()
    .single();

  if (examError) {
    console.error('Failed to create mock exam:', examError);
    return;
  }

  // 2. Add schools
  const { error: schoolsError } = await supabase
    .from('mock_exam_schools')
    .insert([
      { mock_exam_id: mockExam.id, school_id: 'school-1' },
      { mock_exam_id: mockExam.id, school_id: 'school-2' }
    ]);

  // 3. Add grade levels
  const { error: gradesError } = await supabase
    .from('mock_exam_grade_levels')
    .insert([
      { mock_exam_id: mockExam.id, grade_level_id: 'grade-1' }
    ]);

  // 4. Add teachers
  const { error: teachersError } = await supabase
    .from('mock_exam_teachers')
    .insert([
      {
        mock_exam_id: mockExam.id,
        entity_user_id: 'entity-user-1',
        role: 'lead_teacher'
      }
    ]);

  console.log('Results:', {
    mockExam,
    schoolsError,
    gradesError,
    teachersError
  });
};
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Deploy Immediately)
1. ✅ Fix mock_exams INSERT RLS policies (Issue #1)
2. ✅ Choose and implement student-class_section relationship (Issue #2)
3. ✅ Update mockExamService queries (Issue #3)

### Phase 2: Security Improvements (Deploy within 48 hours)
4. ✅ Add proper SELECT policies to junction tables (Issue #4)
5. ✅ Test all RLS policies with different user roles

### Phase 3: Performance & Monitoring (Deploy within 1 week)
6. Add database function for student count aggregation
7. Add monitoring/logging for failed INSERT attempts
8. Create database views for common queries

---

## Summary of Fixes Required

### Database Migrations Needed:
1. `fix_mock_exams_insert_rls_policies.sql` - Fix RLS policy logic error
2. `add_student_class_section_relationship.sql` - Add FK or junction table
3. `fix_junction_table_select_policies.sql` - Add proper SELECT policies

### Code Changes Needed:
1. `src/services/mockExamService.ts` - Update getClassSectionsForScope query
2. `src/hooks/useMockExams.ts` - Verify no other queries use non-existent FKs
3. Add error handling for RLS policy violations

### Testing Required:
1. Test mock exam creation as entity_admin, school_admin, system_admin
2. Test class sections fetch with student counts
3. Test end-to-end mock exam creation workflow
4. Verify RLS policies don't block legitimate operations

---

## Root Cause Summary

**Mock Exam Creation Failure:**
- Incorrect RLS policy condition using self-referencing comparison
- Policy never validates against the actual row being inserted

**Class Sections Student Count Failure:**
- Missing foreign key relationship between students and class_sections
- Query attempts to use Supabase relationship that doesn't exist in schema
- No junction table for many-to-many student-section assignments

**Impact:**
- 100% of mock exam creation attempts fail
- Class section dropdowns show incorrect or no student counts
- User experience severely degraded

**Resolution Time Estimate:**
- Database migrations: 1-2 hours (including testing)
- Code updates: 30 minutes
- Full testing: 2-3 hours
- Total: 4-6 hours for complete fix

---

Generated: 2025-10-02
Audit Performed By: Database Architecture Review System
