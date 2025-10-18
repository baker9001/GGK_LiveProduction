/*
  # Fix khaddash27@gmail.com User - Password Reset

  1. Purpose
     - Reset password for user khaddash27@gmail.com to Khaddash@2027
     - This migration uses pg_crypto extension to hash the password
     - Updates auth.users table with the new password hash

  2. Changes
     - Update password in auth.users for khaddash27@gmail.com
     - Set email_confirmed_at to enable login
     - Update encrypted_password with bcrypt hash

  3. Security
     - Password meets complexity requirements (8+ chars, uppercase, lowercase, number, special char)
     - Uses bcrypt with default cost factor
     - Email is marked as confirmed

  4. Notes
     - User can change password after first login
     - This is a one-time administrative password reset
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the password in auth.users
-- Bcrypt hash for: Khaddash@2027
UPDATE auth.users
SET 
  encrypted_password = crypt('Khaddash@2027', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'khaddash27@gmail.com';

-- Log the password reset action
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  details,
  created_at
)
SELECT 
  id,
  'password_reset_migration',
  'admin_user',
  id,
  jsonb_build_object(
    'email', 'khaddash27@gmail.com',
    'reset_by', 'system_migration',
    'reason', 'Account repair and setup',
    'new_password_set', true,
    'timestamp', NOW()::text
  ),
  NOW()
FROM users
WHERE email = 'khaddash27@gmail.com';
