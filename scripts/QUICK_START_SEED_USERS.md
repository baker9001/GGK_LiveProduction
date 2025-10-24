# Quick Start: Seed Test Users

## TL;DR

```bash
# Run the seeding script
npm run seed-test-users

# Or run directly
npx tsx scripts/seedTestUsers.ts
```

**All test accounts use password:** `TestPass123!`

## What Gets Created

For each active school:
- **4 teachers** with random specializations
- **40 students** across 5 grade levels (8 students per grade)
- All distributed across available branches
- Proper parent/guardian information for students

## Example Login Credentials

After running the script, you'll see output like:

```
Teachers created:
- john.smith.teacher1@testschool.edu
- mary.johnson.teacher2@testschool.edu
...

Students created:
- robert.williams.student1@testschool.edu
- patricia.brown.student2@testschool.edu
...
```

**Login with any email + password:** `TestPass123!`

## Quick Customization

Edit `scripts/seedTestUsers.ts`:

```typescript
// Line ~394
const TEACHERS_PER_SCHOOL = 4;  // Change this
const STUDENTS_PER_GRADE = 8;   // Change this
```

## Requirements

✅ At least one active school with branches in database
✅ Supabase environment variables configured
✅ Edge Function deployed (or fallback will be used)

## Cleanup Test Data

```sql
DELETE FROM users WHERE raw_user_meta_data->>'test_account' = 'true';
```

## Troubleshooting

**"No active schools found"**
→ Create a school and branch first

**"Email already exists"**
→ Normal on multiple runs, script will skip duplicates

**"Failed to create user"**
→ Check Supabase connection and Edge Function logs

## Full Documentation

See [README_SEED_USERS.md](./README_SEED_USERS.md) for complete details.
