# RLS FIX IMPLEMENTATION PLAN

**Date:** October 2, 2025
**Priority:** HIGH - Security & Access Control Improvements
**Estimated Total Time:** 10-12 days
**Status:** READY FOR IMPLEMENTATION

---

## OVERVIEW

This implementation plan addresses the findings from the Complete RLS Security Audit Report. Issues are prioritized by security risk and business impact.

---

## PHASE 1: HIGH PRIORITY FIXES (2-3 Days)

### Issue H1: Protect Student Gamification Data

**Risk Level:** 🔴 HIGH - Student personal data unprotected
**Impact:** Students can potentially access/modify other students' achievements and stats
**Affected Tables:** student_achievements, student_daily_challenges, student_game_stats

**Migration File:** `fix_student_gamification_rls.sql`

```sql
/*
  # Enable RLS for Student Gamification Tables

  ## Priority: HIGH - Student Data Protection

  ## Changes:
  1. Enable RLS on student gamification tables
  2. Add self-access policies for students
  3. Add system admin access policies
  4. Add entity admin scoped access policies

  ## Tables Affected:
  - student_achievements
  - student_daily_challenges
  - student_game_stats
*/

-- Enable RLS
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_game_stats ENABLE ROW LEVEL SECURITY;

-- student_achievements policies
CREATE POLICY "Students view own achievements"
  ON student_achievements FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins manage student achievements"
  ON student_achievements FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Entity admins view achievements in scope"
  ON student_achievements FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.is_active = true
    )
  );

-- student_daily_challenges policies
CREATE POLICY "Students view own challenges"
  ON student_daily_challenges FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students manage own challenges"
  ON student_daily_challenges FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins manage student challenges"
  ON student_daily_challenges FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- student_game_stats policies
CREATE POLICY "Students view own game stats"
  ON student_game_stats FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students update own game stats"
  ON student_game_stats FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins manage game stats"
  ON student_game_stats FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Service role full access to student gamification"
  ON student_achievements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to student challenges"
  ON student_daily_challenges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to game stats"
  ON student_game_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id
  ON student_achievements(student_id);

CREATE INDEX IF NOT EXISTS idx_student_daily_challenges_student_id
  ON student_daily_challenges(student_id);

CREATE INDEX IF NOT EXISTS idx_student_game_stats_student_id
  ON student_game_stats(student_id);
```

**Testing Checklist:**
- [ ] Student can view their own achievements
- [ ] Student cannot view other students' achievements
- [ ] System admin can view all achievements
- [ ] Entity admin can view achievements in their company
- [ ] Service role has full access

---

### Issue H2: Entity Admins Manage Teachers

**Risk Level:** 🟠 HIGH - Business functionality blocked
**Impact:** Entity admins must use edge functions instead of direct access
**Affected Tables:** teachers

**Migration File:** `add_entity_admin_teacher_policies.sql`

```sql
/*
  # Add Entity Admin Policies for Teachers Table

  ## Priority: HIGH - Business Functionality

  ## Changes:
  1. Add entity admin scoped management of teachers
  2. Add school admin scoped management
  3. Add branch admin scoped management

  ## Security:
  - Entity admins can only manage teachers in their company
  - School admins can only manage teachers in assigned schools
  - Branch admins can only manage teachers in assigned branches
*/

-- Entity Admin: Manage teachers in entire company
CREATE POLICY "Entity admins manage teachers in company"
  ON teachers FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admin: Manage teachers in assigned schools
CREATE POLICY "School admins manage teachers in schools"
  ON teachers FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id
      FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT eus.school_id
      FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admin: Manage teachers in assigned branches
CREATE POLICY "Branch admins manage teachers in branches"
  ON teachers FOR ALL TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id
      FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT eub.branch_id
      FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_teachers_company_id ON teachers(company_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_branch_id ON teachers(branch_id);
```

**Testing Checklist:**
- [ ] Entity admin can create teachers in their company
- [ ] Entity admin can view all teachers in their company
- [ ] Entity admin cannot view teachers in other companies
- [ ] School admin can manage teachers in assigned schools only
- [ ] Branch admin can manage teachers in assigned branches only

---

### Issue H3: Entity Admins Manage Students

**Risk Level:** 🟠 HIGH - Business functionality blocked
**Impact:** Entity admins must use edge functions instead of direct access
**Affected Tables:** students

**Migration File:** `add_entity_admin_student_policies.sql`

```sql
/*
  # Add Entity Admin Policies for Students Table

  ## Priority: HIGH - Business Functionality

  ## Changes:
  1. Add entity admin scoped management of students
  2. Add school admin scoped management
  3. Add branch admin scoped management

  ## Security:
  - Entity admins can only manage students in their company
  - School admins can only manage students in assigned schools
  - Branch admins can only manage students in assigned branches
*/

-- Entity Admin: Manage students in entire company
CREATE POLICY "Entity admins manage students in company"
  ON students FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admin: Manage students in assigned schools
CREATE POLICY "School admins manage students in schools"
  ON students FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id
      FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT eus.school_id
      FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admin: Manage students in assigned branches
CREATE POLICY "Branch admins manage students in branches"
  ON students FOR ALL TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id
      FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT eub.branch_id
      FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_company_id ON students(company_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);
```

**Testing Checklist:**
- [ ] Entity admin can create students in their company
- [ ] Entity admin can view all students in their company
- [ ] Entity admin cannot view students in other companies
- [ ] School admin can manage students in assigned schools only
- [ ] Branch admin can manage students in assigned branches only
- [ ] Students can still view their own record

---

### Issue H4: Educational Content RLS Consistency

**Risk Level:** 🟡 MEDIUM - Inconsistent security model
**Impact:** Unclear whether edu content is public or restricted
**Affected Tables:** edu_units, edu_topics, edu_subtopics, edu_learning_objectives, edu_specific_concepts

**Decision Required:** Choose approach:
1. **Option A:** Enable RLS (content is restricted/premium)
2. **Option B:** Disable RLS on edu_subjects (all content is public)

**Recommended:** Option B - Make all educational content publicly readable

**Migration File:** `standardize_educational_content_rls.sql`

```sql
/*
  # Standardize Educational Content RLS

  ## Priority: MEDIUM - Consistency

  ## Decision: Make all educational content publicly readable

  ## Changes:
  1. Disable RLS on edu_subjects (to match other edu tables)
  2. Document that edu content is public reference data

  ## Rationale:
  - Educational content (subjects, units, topics) is reference data
  - All users need access for dropdowns, filters, learning paths
  - No sensitive data in these tables
  - Consistent with other reference tables (regions, programs, providers)
*/

-- Disable RLS on edu_subjects to match other edu tables
ALTER TABLE edu_subjects DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "System admins can manage edu_subjects" ON edu_subjects;

-- Document decision
COMMENT ON TABLE edu_subjects IS 'Educational subjects - Public reference data accessible to all users';
COMMENT ON TABLE edu_units IS 'Educational units - Public reference data accessible to all users';
COMMENT ON TABLE edu_topics IS 'Educational topics - Public reference data accessible to all users';
COMMENT ON TABLE edu_subtopics IS 'Educational subtopics - Public reference data accessible to all users';
COMMENT ON TABLE edu_learning_objectives IS 'Learning objectives - Public reference data accessible to all users';
COMMENT ON TABLE edu_specific_concepts IS 'Specific concepts - Public reference data accessible to all users';

-- Note: If future requirements change and content becomes premium/restricted,
-- re-enable RLS and add appropriate policies
```

**Alternative: If content should be restricted (Option A)**

```sql
-- Enable RLS on all edu tables
ALTER TABLE edu_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_specific_concepts ENABLE ROW LEVEL SECURITY;

-- Add policies to all tables (repeat for each)
CREATE POLICY "Authenticated users can view edu content"
  ON edu_units FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu content"
  ON edu_units FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));
```

**Testing Checklist:**
- [ ] All users can access edu content for dropdowns
- [ ] Application features using edu content work correctly
- [ ] System admins can still manage content (via UI or service role)

---

## PHASE 2: MEDIUM PRIORITY FIXES (3-4 Days)

### Issue M1: Scope Licenses Table by Company

**Risk Level:** 🟡 MEDIUM - Cross-entity data exposure
**Impact:** Users can see licenses not assigned to their entity
**Affected Tables:** licenses

**Migration File:** `scope_licenses_by_company.sql`

```sql
/*
  # Scope Licenses Table by Company

  ## Priority: MEDIUM - Data Isolation

  ## Changes:
  1. Replace overly permissive "view all" policy
  2. Add company-scoped viewing policy
  3. Maintain system admin full access

  ## Security:
  - Entity users only see licenses for their company
  - Teachers see licenses for their company
  - Students see licenses for their company
  - System admins see all licenses
*/

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view licenses" ON licenses;

-- Add company-scoped policy
CREATE POLICY "Users view licenses in their company"
  ON licenses FOR SELECT TO authenticated
  USING (
    -- System admins see all
    is_admin_user(auth.uid())
    OR
    -- Entity users see company licenses
    company_id IN (
      SELECT company_id FROM entity_users WHERE user_id = auth.uid()
    )
    OR
    -- Teachers see company licenses
    company_id IN (
      SELECT company_id FROM teachers WHERE user_id = auth.uid()
    )
    OR
    -- Students see company licenses
    company_id IN (
      SELECT company_id FROM students WHERE user_id = auth.uid()
    )
  );

-- System admin management policy already exists, keep it
```

**Testing Checklist:**
- [ ] Entity admin sees only their company's licenses
- [ ] Teacher sees only their company's licenses
- [ ] Student sees only their company's licenses
- [ ] System admin sees all licenses
- [ ] User from Company A cannot see Company B licenses

---

### Issue M2: Standardize Admin Check Functions

**Risk Level:** 🟢 LOW - Code quality/maintainability
**Impact:** Inconsistent patterns make code harder to maintain
**Affected Tables:** schools, branches

**Migration File:** `standardize_admin_check_functions.sql`

```sql
/*
  # Standardize Admin Check Functions

  ## Priority: MEDIUM - Code Quality

  ## Changes:
  1. Replace inline admin checks with helper functions
  2. Ensure consistency across all policies

  ## Benefits:
  - Consistent pattern across all tables
  - Easier to maintain
  - Better performance (function can be optimized once)
*/

-- Schools table: Replace inline checks
DROP POLICY IF EXISTS "System admins can view all schools" ON schools;
DROP POLICY IF EXISTS "System admins can update all schools" ON schools;
DROP POLICY IF EXISTS "System admins can delete schools" ON schools;

-- Recreate with helper function
CREATE POLICY "System admins can view all schools"
  ON schools FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update all schools"
  ON schools FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete schools"
  ON schools FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Branches table: Replace inline checks
DROP POLICY IF EXISTS "System admins can view all branches" ON branches;
DROP POLICY IF EXISTS "System admins can update all branches" ON branches;
DROP POLICY IF EXISTS "System admins can delete branches" ON branches;

-- Recreate with helper function
CREATE POLICY "System admins can view all branches"
  ON branches FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update all branches"
  ON branches FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete branches"
  ON branches FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));
```

---

### Issue M3: Teacher Access to Student Data

**Risk Level:** 🟡 MEDIUM - Business functionality
**Impact:** Teachers may need to view student lists for their classes
**Affected Tables:** students

**Requires:** Application code review to understand teacher-student relationships

**Migration File:** `add_teacher_student_access.sql`

```sql
/*
  # Add Teacher Access to Student Data

  ## Priority: MEDIUM - Classroom Management

  ## Changes:
  1. Add policy for teachers to view students they teach
  2. Use teacher_sections junction table to determine relationships

  ## Security:
  - Teachers can only view students in their assigned sections
  - Teachers cannot modify student records
  - Read-only access for classroom management
*/

-- Teachers can view students in their assigned sections
CREATE POLICY "Teachers view students in their sections"
  ON students FOR SELECT TO authenticated
  USING (
    is_teacher(auth.uid())
    AND id IN (
      SELECT DISTINCT s.id
      FROM students s
      JOIN class_sections cs ON cs.id = s.class_section_id
      JOIN teacher_sections ts ON ts.class_section_id = cs.id
      JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = auth.uid()
        AND t.is_active = true
    )
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_students_class_section_id
  ON students(class_section_id);
```

**Note:** Review application code to confirm this is the correct relationship pattern.

**Testing Checklist:**
- [ ] Teacher can view students in their assigned sections
- [ ] Teacher cannot view students in other sections
- [ ] Teacher cannot modify student records
- [ ] Query performs well with indexes

---

## PHASE 3: LOW PRIORITY & DOCUMENTATION (3-4 Days)

### Task L1: Document Service Role Usage

**File:** `SERVICE_ROLE_DOCUMENTATION.md`

Document which edge functions use service role and why:
- User creation functions
- Email sending functions
- Migration functions
- Audit log functions

### Task L2: Review Answer Analytics RLS

Determine if these tables contain student-specific data:
- answer_analytics
- exam_answers_extended

If yes, enable RLS and add appropriate policies.

### Task L3: Create RLS Testing Framework

Create automated tests for each user type:

```typescript
// Example test structure
describe('RLS Policies - Students', () => {
  it('student can view own record', async () => {
    // Test implementation
  });

  it('student cannot view other students', async () => {
    // Test implementation
  });

  it('student can view own achievements', async () => {
    // Test implementation
  });
});
```

### Task L4: Performance Test RLS Policies

Test query performance with:
- 10,000+ students
- 100+ schools
- Complex scoped queries

Monitor and optimize slow queries.

### Task L5: Update Documentation

- Document RLS policy patterns
- Create developer onboarding guide
- Update schema documentation
- Create RLS decision tree

---

## IMPLEMENTATION ORDER

### Week 1 (Days 1-5)
**Day 1:**
- Apply H1: Student gamification RLS
- Test student gamification policies

**Day 2:**
- Apply H2: Entity admin teacher policies
- Test entity admin teacher access

**Day 3:**
- Apply H3: Entity admin student policies
- Test entity admin student access

**Day 4:**
- Apply H4: Educational content standardization
- Review and decide on approach

**Day 5:**
- Apply M1: Scope licenses by company
- Apply M2: Standardize admin checks
- Review and test all Phase 1 & 2 fixes

### Week 2 (Days 6-10)
**Day 6-7:**
- Review application code for teacher-student relationships
- Apply M3: Teacher student access (if confirmed)
- Test teacher access patterns

**Day 8:**
- Document service role usage
- Review analytics tables
- Decision on analytics RLS

**Day 9:**
- Create RLS testing framework
- Write initial test suite
- Run tests against all policies

**Day 10:**
- Performance testing
- Documentation updates
- Final review and sign-off

---

## ROLLBACK PROCEDURES

For each migration, keep rollback script:

```sql
-- Rollback for student_gamification_rls
ALTER TABLE student_achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_daily_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_game_stats DISABLE ROW LEVEL SECURITY;
-- etc.
```

Store rollback scripts in: `.bolt/supabase_rollbacks/`

---

## SUCCESS CRITERIA

✅ **Phase 1 Complete When:**
- All student gamification data protected
- Entity admins can manage teachers/students via UI
- Educational content access is consistent
- All high-priority tests pass

✅ **Phase 2 Complete When:**
- Licenses scoped by company
- All policies use consistent patterns
- Teacher access clarified and implemented
- All medium-priority tests pass

✅ **Phase 3 Complete When:**
- Service role usage documented
- RLS testing framework operational
- Performance benchmarks met
- Documentation updated and reviewed

---

## SIGN-OFF CHECKLIST

Before marking complete:
- [ ] All migrations applied successfully
- [ ] All automated tests passing
- [ ] Manual testing completed for each user type
- [ ] Performance tests show acceptable query times
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Rollback scripts prepared and tested
- [ ] Production deployment plan approved

---

**Implementation Plan Created By:** Database Security Team
**Date:** October 2, 2025
**Status:** READY FOR APPROVAL
**Next Step:** Review and approve plan, then begin Phase 1 implementation

---
