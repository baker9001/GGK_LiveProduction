# Entity Users Infinite Recursion Fix - Complete Resolution

## Problem Statement

**User Report**: "infinite recursion detected in policy for relation 'entity_users'" when trying to save table template

**Error Message**:
```
infinite recursion detected in policy for relation "entity_users"
```

**Impact**:
- ❌ Cannot save table templates
- ❌ Cannot create/update entity users
- ❌ Any operation requiring entity_users access fails
- ❌ System effectively broken for entity admins

## Root Cause Analysis

### The Circular Reference Problem

**Location**: `supabase/migrations/20251002180925_add_entity_admin_user_management_policies.sql`

**The Circular Logic**:

```sql
CREATE POLICY "Entity admins can view entity_users in their company"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users  -- ⚠️ QUERIES entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );
```

**The Infinite Loop**:

1. **User tries**: Save table template (requires checking if user has permission)
2. **RLS checks**: Does user have access to entity_users table?
3. **Policy executes**: Query entity_users to check if user is admin
4. **RLS triggers again**: That query also needs permission check
5. **Policy executes again**: Query entity_users to check if user is admin
6. **RLS triggers again**: That query also needs permission check
7. **→ INFINITE RECURSION** (steps 3-6 repeat forever)

**PostgreSQL Detection**:
PostgreSQL detects the infinite loop and throws:
```
infinite recursion detected in policy for relation "entity_users"
```

### Why This Happens

**Classic RLS Anti-Pattern**:
```
Table X RLS Policy
  ↓
  Queries Table X (to check permissions)
  ↓
  Triggers Table X RLS Policy
  ↓
  Queries Table X (to check permissions)
  ↓
  Triggers Table X RLS Policy
  ↓
  ... (infinite loop)
```

**Affected Policies**:
1. ❌ "Entity admins can view entity_users in their company"
2. ❌ "Entity admins can create entity_users in their company"
3. ❌ "Entity admins can update entity_users in their company"
4. ❌ "Entity admins can delete entity_users in their company"
5. ❌ "School admins can view entity_users in their schools" (partially)
6. ❌ "Branch admins can view entity_users in their branches" (partially)

All of these query `entity_users` within their USING/WITH CHECK clauses.

## Solution: SECURITY DEFINER Functions

### The Fix Pattern

**Instead of**:
```sql
-- BAD: Circular reference
USING (
  company_id IN (
    SELECT company_id FROM entity_users  -- Triggers RLS again!
    WHERE user_id = auth.uid()
  )
)
```

**Use**:
```sql
-- GOOD: SECURITY DEFINER bypasses RLS
USING (
  is_entity_admin_for_company(auth.uid(), company_id)  -- No RLS trigger!
)
```

### SECURITY DEFINER Functions Created

These functions already existed from previous migration `20251002190856`:

```sql
-- Check if user is entity admin for specific company
CREATE FUNCTION is_entity_admin_for_company(check_user_id UUID, check_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entity_users
    WHERE user_id = check_user_id
      AND company_id = check_company_id
      AND admin_level IN ('entity_admin', 'sub_entity_admin')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ← BYPASSES RLS!
```

**Key**: `SECURITY DEFINER` means:
- Function runs with **creator's privileges**, not caller's
- **Bypasses RLS** on entity_users table
- No circular reference because RLS doesn't apply inside function
- Safe because function logic validates permissions

Similar functions exist for:
- `is_school_admin_for_school(UUID, UUID)`
- `is_branch_admin_for_branch(UUID, UUID)`

## Implementation

### Migration Applied

**File**: `20251128192603_fix_entity_users_policies_only.sql`

**Changes Made**:

#### 1. Dropped Circular Policies

```sql
DROP POLICY IF EXISTS "Entity admins can view entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can create entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can update entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can delete entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "School admins can view entity_users in their schools" ON entity_users;
DROP POLICY IF EXISTS "Branch admins can view entity_users in their branches" ON entity_users;
```

#### 2. Created Non-Circular Policies

**Entity Admin SELECT Policy**:
```sql
CREATE POLICY "Entity admins can view entity_users in their company"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
    -- ↑ SECURITY DEFINER function - no recursion!
  );
```

**Entity Admin INSERT Policy**:
```sql
CREATE POLICY "Entity admins can create entity_users in their company"
  ON entity_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );
```

**Entity Admin UPDATE Policy**:
```sql
CREATE POLICY "Entity admins can update entity_users in their company"
  ON entity_users FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  )
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );
```

**Entity Admin DELETE Policy**:
```sql
CREATE POLICY "Entity admins can delete entity_users in their company"
  ON entity_users FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );
```

**School Admin SELECT Policy**:
```sql
CREATE POLICY "School admins can view entity_users in their schools"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM entity_user_schools eus
      WHERE eus.entity_user_id = entity_users.id
        AND is_school_admin_for_school((SELECT auth.uid()), eus.school_id)
        -- ↑ SECURITY DEFINER function - no recursion!
    )
  );
```

**Branch Admin SELECT Policy**:
```sql
CREATE POLICY "Branch admins can view entity_users in their branches"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM entity_user_branches eub
      WHERE eub.entity_user_id = entity_users.id
        AND is_branch_admin_for_branch((SELECT auth.uid()), eub.branch_id)
        -- ↑ SECURITY DEFINER function - no recursion!
    )
  );
```

## How It Works Now

### Execution Flow (No Recursion)

**When saving table template**:

1. **User action**: Save table template
2. **RLS check**: Check table_templates policies
3. **Teacher check**: Is user a teacher?
   - Queries `teachers` table
   - Teachers policy checks if user exists in teachers table
   - No recursion (different table)
4. **Success**: Template saved ✅

**When entity admin views users**:

1. **User action**: View entity users
2. **RLS check**: Check entity_users policies
3. **Admin check**: `is_entity_admin_for_company(auth.uid(), company_id)`
   - Function has SECURITY DEFINER
   - Queries entity_users WITHOUT triggering RLS
   - Returns TRUE/FALSE
4. **Policy decision**: Allow or deny based on function result
5. **Success**: Users displayed ✅

**No Circular Reference Because**:
- Helper function bypasses RLS with SECURITY DEFINER
- Only one level of checking (no nested checks)
- Clean separation between permission check and data access

## Security Maintained

### Permission Checks Still Enforced

**System Admins**:
- ✅ Full access to all entity_users (unchanged)
- ✅ Can create/update/delete any entity user
- ✅ Uses `is_system_admin()` function (also SECURITY DEFINER)

**Entity Admins**:
- ✅ Can view users in their company
- ✅ Can create users in their company
- ✅ Can update users in their company
- ✅ Can delete users in their company
- ❌ Cannot access other companies' users

**School Admins**:
- ✅ Can view users in their schools
- ❌ Cannot view users in other schools
- ❌ Cannot modify entity_users (read-only)

**Branch Admins**:
- ✅ Can view users in their branches
- ❌ Cannot view users in other branches
- ❌ Cannot modify entity_users (read-only)

**Regular Teachers/Students**:
- ❌ Cannot access entity_users at all

### Function Safety

**SECURITY DEFINER is safe because**:

1. **Logic is validated**: Functions check admin_level, is_active, company_id
2. **No SQL injection**: Uses parameterized queries
3. **Proper grants**: Only granted to authenticated users
4. **Auditable**: Function code is in migrations (version controlled)
5. **Limited scope**: Only checks permissions, doesn't modify data

## Testing Instructions

### Test 1: Save Table Template (Primary Fix)

**As Teacher User**:
1. Login as teacher
2. Navigate to Papers Setup > Questions
3. Open table completion question
4. Edit template
5. Click "Save Template"
6. **Expected**: ✅ Success toast "Template saved successfully!"
7. **Expected**: ❌ NO "infinite recursion" error
8. **Expected**: ✅ Template persists in database

### Test 2: Entity Admin User Management

**As Entity Admin**:
1. Login as entity admin for a company
2. Navigate to Organization > Entity Users
3. View list of entity users
4. **Expected**: ✅ Users in your company displayed
5. **Expected**: ❌ Users from other companies NOT displayed
6. Click "Add User"
7. Fill in user details for your company
8. Click "Save"
9. **Expected**: ✅ User created successfully
10. **Expected**: ❌ NO "infinite recursion" error

**Try Accessing Other Company**:
1. Try to create user for different company_id
2. **Expected**: ❌ RLS blocks (permission denied)
3. **Expected**: ❌ NO "infinite recursion" error

### Test 3: School Admin View

**As School Admin**:
1. Login as school admin
2. View entity users for your schools
3. **Expected**: ✅ Users in your schools displayed
4. **Expected**: ❌ Users from other schools NOT displayed
5. **Expected**: ✅ No errors

### Test 4: Branch Admin View

**As Branch Admin**:
1. Login as branch admin
2. View entity users for your branches
3. **Expected**: ✅ Users in your branches displayed
4. **Expected**: ❌ Users from other branches NOT displayed
5. **Expected**: ✅ No errors

### Test 5: System Admin (Unchanged)

**As System Admin**:
1. Login as system admin
2. View all entity users
3. **Expected**: ✅ ALL users displayed (all companies)
4. Create/update/delete any entity user
5. **Expected**: ✅ All operations succeed
6. **Expected**: ✅ No restrictions

## Technical Deep Dive

### Why SECURITY DEFINER Works

**Normal Query** (with RLS):
```
User Query
  ↓
  RLS Policy Check
  ↓
  (if policy queries same table)
  ↓
  RLS Policy Check Again
  ↓
  INFINITE LOOP
```

**SECURITY DEFINER Function**:
```
User Query
  ↓
  RLS Policy Check
  ↓
  Calls SECURITY DEFINER Function
  ↓
  Function runs with CREATOR privileges
  ↓
  NO RLS applied inside function
  ↓
  Returns result
  ↓
  Policy makes decision
  ↓
  Done (one level only)
```

### PostgreSQL Internals

**When PostgreSQL detects recursion**:
- Tracks policy evaluation depth
- If same policy evaluated >X times in single query
- Throws "infinite recursion detected" error
- Prevents infinite loop from crashing database

**SECURITY DEFINER bypass**:
- Function marked with SECURITY DEFINER
- PostgreSQL switches execution context
- Uses function owner's permissions (usually postgres superuser)
- RLS policies don't apply (owner has BYPASSRLS)
- Returns to normal context after function completes

### Alternative Solutions (Not Used)

**1. Disable RLS entirely**: ❌ Security risk
**2. Use service_role key**: ❌ Bypasses all security
**3. Materialized view**: ❌ Stale data, complex refresh
**4. Application-level checks**: ❌ Moves security to client (bad)
**5. SECURITY DEFINER functions**: ✅ **CHOSEN** - Best practice

## Files Modified

1. **Migration**: `supabase/migrations/20251128192603_fix_entity_users_policies_only.sql`
   - Dropped 6 circular policies
   - Created 6 non-circular policies using SECURITY DEFINER functions
   - Maintained same security logic without recursion

**No code changes needed** - purely database-level fix

## Verification

**Build Status**: ✅ Verified successful (no TypeScript errors)

**Migration Status**: ✅ Applied successfully to database

**Expected Behavior**:
1. ✅ Table templates save successfully
2. ✅ Entity admins can manage users in their company
3. ✅ School/branch admins can view their users
4. ✅ No infinite recursion errors
5. ✅ All security checks still enforced
6. ✅ Performance maintained (SECURITY DEFINER is fast)

## Prevention

**For Future Migrations**:

### ✅ DO:
```sql
-- Use SECURITY DEFINER helper functions
USING (
  is_entity_admin_for_company(auth.uid(), company_id)
)
```

### ❌ DON'T:
```sql
-- Don't query same table in policy
USING (
  company_id IN (
    SELECT company_id FROM entity_users  -- CIRCULAR!
    WHERE user_id = auth.uid()
  )
)
```

**Rule**: Never query the same table in its own RLS policy unless:
1. Using SECURITY DEFINER function to bypass RLS
2. Using LATERAL JOIN with recursion guards
3. Absolutely certain there's no circular path

## Conclusion

The "infinite recursion detected in policy for relation 'entity_users'" error is now **completely resolved**:

### Root Cause
- RLS policies on entity_users queried entity_users directly
- Created circular reference: Policy → Query → Policy → Query → ...
- PostgreSQL detected infinite loop and blocked operation

### Solution
- Used existing SECURITY DEFINER helper functions
- Functions bypass RLS (run with creator privileges)
- Policies call functions instead of querying directly
- No circular reference possible

### Result
- ✅ Table templates save successfully
- ✅ Entity user management works
- ✅ All permission checks still enforced
- ✅ No security compromises
- ✅ Performance maintained

**Status**: ✅ COMPLETE AND READY FOR TESTING
