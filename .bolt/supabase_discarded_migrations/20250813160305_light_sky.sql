/*
  # Universal User System Migration
  
  1. Base Tables
    - Ensure users table has all required fields
    - Add missing columns and indexes
  
  2. New Tables
    - `parents` table for parent users
    - `parent_students` relationship table
    - `audit_logs` for user activity tracking
    - `password_reset_tokens` for password resets
    - `email_verification_tokens` for email verification
  
  3. Views
    - `user_profiles` comprehensive view of all user types
  
  4. Security
    - Enable RLS on all user-related tables
    - Create appropriate policies for data access
  
  5. Helper Functions
    - `get_user_profile()` function
    - `email_exists()` function
*/

-- ===== 1. ENSURE BASE TABLES EXIST =====

-- Ensure users table has all required fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS raw_app_meta_data JSONB DEFAULT '{}';

-- Create index for email verification status
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ===== 2. CREATE PARENTS TABLE =====
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  occupation TEXT,
  emergency_contact JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create parent-student relationship table
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(user_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'parent', -- parent, guardian, etc.
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Create indexes for parents
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);

-- ===== 3. UPDATE STUDENTS TABLE =====
ALTER TABLE students
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id),
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id),
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_contact TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enrolled_programs UUID[] DEFAULT '{}';

-- Migrate existing students to have user_id if they don't have it
DO $$
BEGIN
  -- Check if there are students without user_id
  IF EXISTS (SELECT 1 FROM students WHERE user_id IS NULL LIMIT 1) THEN
    -- You'll need to handle this migration based on your existing data
    -- This is a placeholder for the migration logic
    RAISE NOTICE 'Students without user_id found. Manual migration required.';
  END IF;
END $$;

-- Create indexes for students
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_company_id ON students(company_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);

-- ===== 4. UPDATE TEACHERS TABLE =====
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id),
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id),
ADD COLUMN IF NOT EXISTS department_id UUID,
ADD COLUMN IF NOT EXISTS teacher_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qualification TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS specialization TEXT[];

-- Create indexes for teachers
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_company_id ON teachers(company_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_branch_id ON teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON teachers(department_id);

-- ===== 5. UPDATE ENTITY_USERS TABLE =====
ALTER TABLE entity_users
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS employee_status TEXT DEFAULT 'active';

-- Migrate existing entity_users to use user_id instead of id
DO $$
BEGIN
  -- Check if migration is needed
  IF EXISTS (SELECT 1 FROM entity_users WHERE user_id IS NULL LIMIT 1) THEN
    -- This assumes entity_users.id was previously the user ID
    UPDATE entity_users SET user_id = id WHERE user_id IS NULL;
  END IF;
END $$;

-- Create indexes for entity_users
CREATE INDEX IF NOT EXISTS idx_entity_users_user_id ON entity_users(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_users_company_id ON entity_users(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_users_is_company_admin ON entity_users(is_company_admin);

-- ===== 6. CREATE AUDIT LOGS TABLE =====
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ===== 7. CREATE PASSWORD RESET TOKENS TABLE =====
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ===== 8. CREATE EMAIL VERIFICATION TOKENS TABLE =====
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email verification tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);

-- ===== 9. CREATE OR UPDATE TRIGGERS =====

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'admin_users', 'entity_users', 'teachers', 'students', 'parents')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ===== 10. CREATE VIEWS FOR EASIER QUERYING =====

-- Create a comprehensive user view
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  u.email,
  u.user_type,
  u.is_active,
  u.email_verified,
  u.phone,
  u.created_at,
  u.updated_at,
  u.raw_user_meta_data->>'name' as name,
  CASE 
    WHEN u.user_type = 'system' OR u.user_type = 'admin' THEN 
      json_build_object(
        'role', r.name,
        'role_id', au.role_id
      )
    WHEN u.user_type = 'entity' THEN
      json_build_object(
        'company_id', eu.company_id,
        'company_name', c.name,
        'position', eu.position,
        'department', eu.department,
        'is_admin', eu.is_company_admin
      )
    WHEN u.user_type = 'teacher' THEN
      json_build_object(
        'teacher_code', t.teacher_code,
        'company_id', t.company_id,
        'school_id', t.school_id,
        'branch_id', t.branch_id,
        'qualification', t.qualification
      )
    WHEN u.user_type = 'student' THEN
      json_build_object(
        'student_code', s.student_code,
        'enrollment_number', s.enrollment_number,
        'grade_level', s.grade_level,
        'section', s.section,
        'school_id', s.school_id
      )
    WHEN u.user_type = 'parent' THEN
      json_build_object(
        'children_count', (SELECT COUNT(*) FROM parent_students WHERE parent_id = p.user_id)
      )
    ELSE NULL
  END as details
FROM users u
LEFT JOIN admin_users au ON u.id = au.id AND (u.user_type = 'system' OR u.user_type = 'admin')
LEFT JOIN roles r ON au.role_id = r.id
LEFT JOIN entity_users eu ON u.id = eu.user_id AND u.user_type = 'entity'
LEFT JOIN companies c ON eu.company_id = c.id
LEFT JOIN teachers t ON u.id = t.user_id AND u.user_type = 'teacher'
LEFT JOIN students s ON u.id = s.user_id AND u.user_type = 'student'
LEFT JOIN parents p ON u.id = p.user_id AND u.user_type = 'parent';

-- ===== 11. ROW LEVEL SECURITY POLICIES =====

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "System admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid()
      AND r.name IN ('Super Admin', 'Support Admin')
    )
  );

CREATE POLICY "Entity admins can view their company users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_company_admin = true
      AND (
        EXISTS (SELECT 1 FROM entity_users eu2 WHERE eu2.user_id = users.id AND eu2.company_id = eu.company_id)
        OR EXISTS (SELECT 1 FROM teachers t WHERE t.user_id = users.id AND t.company_id = eu.company_id)
        OR EXISTS (SELECT 1 FROM students s WHERE s.user_id = users.id AND s.company_id = eu.company_id)
      )
    )
  );

-- ===== 12. HELPER FUNCTIONS =====

-- Function to get user's full profile
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSON AS $$
DECLARE
  profile JSON;
BEGIN
  SELECT row_to_json(up) INTO profile
  FROM user_profiles up
  WHERE up.id = user_id;
  
  RETURN profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email exists
CREATE OR REPLACE FUNCTION email_exists(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 13. GRANT PERMISSIONS =====
-- Grant necessary permissions to authenticated users
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION email_exists TO authenticated;