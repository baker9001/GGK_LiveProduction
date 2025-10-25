# User Type Quick Reference Guide

## User Type Values & Tables

| User Type | Description | Database Table | Created By Edge Function |
|-----------|-------------|----------------|--------------------------|
| `system` | GGK Admin Panel users | `admin_users` | `create-admin-user-complete` |
| `entity` | Company/School/Branch admins | `entity_users` | `create-entity-users-invite` |
| `teacher` | Teachers | `teachers` | `create-teacher-student-user` |
| `student` | Students | `students` | `create-teacher-student-user` |
| `parent` | Parents/Guardians | `parents` | Direct creation |
| `staff` | Staff members | `staff` | Direct creation |

## Quick Verification Queries

### Check if user_type is correct for an email
```sql
SELECT
  u.email,
  u.user_type,
  CASE
    WHEN au.id IS NOT NULL THEN 'System Admin (admin_users)'
    WHEN eu.user_id IS NOT NULL THEN 'Entity Admin (entity_users)'
    WHEN t.user_id IS NOT NULL THEN 'Teacher (teachers)'
    WHEN s.user_id IS NOT NULL THEN 'Student (students)'
    ELSE 'Other or No Profile'
  END as actual_role
FROM users u
LEFT JOIN admin_users au ON au.id = u.id
LEFT JOIN entity_users eu ON eu.user_id = u.id
LEFT JOIN teachers t ON t.user_id = u.id
LEFT JOIN students s ON s.user_id = u.id
WHERE u.email = 'user@example.com';
```

### Check for any inconsistencies
```sql
SELECT * FROM verify_user_type_consistency() WHERE issue != 'OK';
```

### List all system admin users
```sql
SELECT
  u.email,
  u.user_type,
  au.name,
  r.name as role,
  u.is_active,
  u.created_at
FROM users u
INNER JOIN admin_users au ON au.id = u.id
LEFT JOIN roles r ON r.id = au.role_id
ORDER BY u.created_at DESC;
```

### Check recent user creations (last 7 days)
```sql
SELECT
  u.email,
  u.user_type,
  u.created_at,
  CASE
    WHEN au.id IS NOT NULL THEN 'admin_users ✓'
    WHEN eu.user_id IS NOT NULL THEN 'entity_users ✓'
    WHEN t.user_id IS NOT NULL THEN 'teachers ✓'
    WHEN s.user_id IS NOT NULL THEN 'students ✓'
    ELSE 'No profile ✗'
  END as profile_table
FROM users u
LEFT JOIN admin_users au ON au.id = u.id
LEFT JOIN entity_users eu ON eu.user_id = u.id
LEFT JOIN teachers t ON t.user_id = u.id
LEFT JOIN students s ON s.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;
```

## How to Create Each User Type

### System Admin (GGK Admin Panel Users)
**Frontend:** System Admin → Admin Users → Invite User
**Result:** `user_type='system'`, stored in `admin_users` table
**Access:** GGK Admin Panel with assigned role permissions

### Entity Admin (Company/School/Branch)
**Frontend:** Entity Module → Organisation → Admins
**Result:** `user_type='entity'`, stored in `entity_users` table
**Access:** Entity-level management within assigned scope

### Teacher
**Frontend:** Entity Module → Organisation → Teachers
**Result:** `user_type='teacher'`, stored in `teachers` table
**Access:** Teaching tools and student management

### Student
**Frontend:** Entity Module → Organisation → Students
**Result:** `user_type='student'`, stored in `students` table
**Access:** Learning materials and practice tests

## Common Issues & Solutions

### Issue: User created but can't login
**Check:**
```sql
SELECT email, user_type, is_active, email_verified
FROM users
WHERE email = 'user@example.com';
```
**Fix:** Ensure `is_active=true` and user has completed invitation

### Issue: User has wrong permissions
**Check:**
```sql
-- For system admins
SELECT u.email, au.name, r.name as role, r.permissions
FROM users u
INNER JOIN admin_users au ON au.id = u.id
LEFT JOIN roles r ON r.id = au.role_id
WHERE u.email = 'user@example.com';

-- For entity admins
SELECT u.email, eu.name, eu.admin_level, eu.permissions
FROM users u
INNER JOIN entity_users eu ON eu.user_id = u.id
WHERE u.email = 'user@example.com';
```
**Fix:** Update role or permissions in respective admin table

### Issue: User shows wrong dashboard
**Check:**
```sql
SELECT
  u.email,
  u.user_type,
  u.raw_app_meta_data->>'user_type' as metadata_type
FROM users u
WHERE u.email = 'user@example.com';
```
**Fix:** Ensure both `user_type` column and metadata match

## Monitoring Script

Run this weekly to check for any anomalies:

```sql
-- Comprehensive User Type Audit
WITH user_audit AS (
  SELECT
    u.id,
    u.email,
    u.user_type,
    u.is_active,
    u.created_at,
    (au.id IS NOT NULL) as in_admin_users,
    (eu.user_id IS NOT NULL) as in_entity_users,
    (t.user_id IS NOT NULL) as in_teachers,
    (s.user_id IS NOT NULL) as in_students,
    CASE
      WHEN u.user_type = 'system' AND au.id IS NULL THEN 'ERROR: system type but not in admin_users'
      WHEN u.user_type = 'entity' AND eu.user_id IS NULL THEN 'ERROR: entity type but not in entity_users'
      WHEN u.user_type = 'teacher' AND t.user_id IS NULL THEN 'ERROR: teacher type but not in teachers'
      WHEN u.user_type = 'student' AND s.user_id IS NULL THEN 'ERROR: student type but not in students'
      WHEN au.id IS NOT NULL AND u.user_type != 'system' THEN 'ERROR: in admin_users but type is not system'
      WHEN eu.user_id IS NOT NULL AND u.user_type != 'entity' THEN 'ERROR: in entity_users but type is not entity'
      ELSE 'OK'
    END as status
  FROM users u
  LEFT JOIN admin_users au ON au.id = u.id
  LEFT JOIN entity_users eu ON eu.user_id = u.id
  LEFT JOIN teachers t ON t.user_id = u.id
  LEFT JOIN students s ON s.user_id = u.id
)
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'OK') as correct_users,
  COUNT(*) FILTER (WHERE status != 'OK') as issues_found
FROM user_audit;

-- Show details of any issues
SELECT email, user_type, status
FROM (
  SELECT
    u.email,
    u.user_type,
    CASE
      WHEN u.user_type = 'system' AND au.id IS NULL THEN 'ERROR: system type but not in admin_users'
      WHEN u.user_type = 'entity' AND eu.user_id IS NULL THEN 'ERROR: entity type but not in entity_users'
      WHEN au.id IS NOT NULL AND u.user_type != 'system' THEN 'ERROR: in admin_users but type is not system'
      WHEN eu.user_id IS NOT NULL AND u.user_type != 'entity' THEN 'ERROR: in entity_users but type is not entity'
      ELSE 'OK'
    END as status
  FROM users u
  LEFT JOIN admin_users au ON au.id = u.id
  LEFT JOIN entity_users eu ON eu.user_id = u.id
) audit
WHERE status != 'OK';
```

## Database Constraints

### CHECK Constraint
```sql
-- Enforces valid user_type values
ALTER TABLE users
ADD CONSTRAINT users_user_type_check
CHECK (user_type IN ('system', 'entity', 'teacher', 'student', 'parent', 'staff'));
```

### NOT NULL Constraint
```sql
-- Requires explicit user_type setting
ALTER TABLE users
ALTER COLUMN user_type SET NOT NULL;
```

### Default Value
```sql
-- No default - must be explicitly set
ALTER TABLE users
ALTER COLUMN user_type SET DEFAULT NULL;
```

## Key Differences

### System Admin vs Entity Admin

| Feature | System Admin | Entity Admin |
|---------|-------------|--------------|
| user_type | `system` | `entity` |
| Table | `admin_users` | `entity_users` |
| Access | GGK Admin Panel | Entity Module |
| Scope | Global system | Company/School/Branch |
| Created via | `create-admin-user-complete` | `create-entity-users-invite` |
| Permissions | Role-based (roles table) | Level-based (admin_level) |

---

**Last Updated:** October 25, 2025
**Verified:** All user types correctly configured
