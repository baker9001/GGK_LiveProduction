@@ .. @@
 -- Migration to standardize user management system across all user types
 
 -- ===== 0. CHECK AND UPDATE USER TYPE ENUM =====
 -- First check if parent is in the enum, if not add it
-DO $
+DO $$
 BEGIN
   -- Check if 'parent' exists in user_type_enum
   IF NOT EXISTS (
@@ .. @@
   ) THEN
     ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'parent';
   END IF;
-END $;
+END $$;
 
 -- ===== 1. ENSURE BASE TABLES EXIST =====
 
@@ .. @@
 -- Create indexes for teachers
 CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
 CREATE INDEX IF NOT EXISTS idx_teachers_company_id ON teachers(company_id);
-CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
-CREATE INDEX IF NOT EXISTS idx_teachers_branch_id ON teachers(branch_id);
-CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON teachers(department_id);
 
 -- ===== 5. UPDATE ENTITY_USERS TABLE =====
-ALTER TABLE entity_users
-ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
-ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
-ADD COLUMN IF NOT EXISTS employee_status TEXT DEFAULT 'active';
-
--- Migrate existing entity_users to use user_id instead of id
-DO $$
-BEGIN
-  -- Check if migration is needed
-  IF EXISTS (SELECT 1 FROM entity_users WHERE user_id IS NULL LIMIT 1) THEN
-    -- This assumes entity_users.id was previously the user ID
-    UPDATE entity_users SET user_id = id WHERE user_id IS NULL;
-  END IF;
-END $$;
+-- entity_users table already has user_id column, just add missing columns
+ALTER TABLE entity_users
+ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
+ADD COLUMN IF NOT EXISTS employee_status TEXT DEFAULT 'active';
 
 -- Create indexes for entity_users
-CREATE INDEX IF NOT EXISTS idx_entity_users_user_id ON entity_users(user_id);
-CREATE INDEX IF NOT EXISTS idx_entity_users_company_id ON entity_users(company_id);
 CREATE INDEX IF NOT EXISTS idx_entity_users_is_company_admin ON entity_users(is_company_admin);
 
 -- ===== 6. CREATE AUDIT LOGS TABLE =====