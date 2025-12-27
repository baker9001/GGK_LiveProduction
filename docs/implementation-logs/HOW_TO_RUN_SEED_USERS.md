# How to Run the Test Users Seeding Script

## Quick Command

```bash
npm run seed-test-users
```

That's it! The script will create teachers and students for all active schools in your database.

---

## What Happens When You Run It

1. **Database Analysis** (5 seconds)
   - Fetches all active schools
   - Fetches all branches
   - Fetches or creates grade levels

2. **Teacher Creation** (2-3 minutes)
   - Creates 4 teachers per school
   - Assigns random specializations
   - Distributes across branches

3. **Student Creation** (5-7 minutes)
   - Creates 40 students per school (8 per grade)
   - Assigns to appropriate grades and sections
   - Includes parent information

4. **Report Generation** (instant)
   - Outputs complete list of created accounts
   - Shows all login credentials

---

## Expected Total Time

- **Small database** (1-2 schools): ~3-5 minutes
- **Medium database** (3-5 schools): ~10-15 minutes
- **Large database** (6+ schools): ~20-30 minutes

*Time varies based on number of schools and network speed*

---

## Live Output Example

```
🚀 Starting Test Data Seeding Process

============================================================
📊 Fetching schools and branches...
✅ Found 3 schools and 8 branches

📊 Fetching grade levels...
✅ Found 10 grade levels

📋 Summary of Database Structure:
  - Schools: 3
  - Branches: 8
  - Grade Levels: 10
============================================================


👨‍🏫 CREATING TEACHERS
============================================================

👨‍🏫 Creating 4 teachers for Lincoln High School...
  Creating teacher: John Smith (john.smith.teacher1@testschool.edu)
  ✅ Created teacher: John Smith
  Creating teacher: Mary Johnson (mary.johnson.teacher2@testschool.edu)
  ✅ Created teacher: Mary Johnson
  [continues...]

👨‍🎓 CREATING STUDENTS
============================================================

👨‍🎓 Creating students for Lincoln High School...

  Grade Grade 1:
    Creating student: Robert Williams - Section A
    ✅ Created student: Robert Williams
    [continues...]

============================================================

✅ TEST DATA SEEDING COMPLETED SUCCESSFULLY!
============================================================

Total users created: 52
- Teachers: 12
- Students: 40

All accounts use password: TestPass123!
```

---

## After Running

### Test Login

1. Copy any email from the output
2. Go to your login page
3. Enter the email
4. Enter password: `TestPass123!`
5. Sign in

### Example Credentials

**Teacher Login:**
```
Email: john.smith.teacher1@testschool.edu
Password: TestPass123!
```

**Student Login:**
```
Email: robert.williams.student1@testschool.edu
Password: TestPass123!
```

---

## Customization (Optional)

Before running, you can edit `scripts/seedTestUsers.ts`:

```typescript
// Around line 394
const TEACHERS_PER_SCHOOL = 4;   // Change to 2, 6, 10, etc.
const STUDENTS_PER_GRADE = 8;    // Change to 5, 10, 15, etc.
```

---

## Troubleshooting

### Error: "No active schools found"

**You need to create a school first:**

1. Go to System Admin → Tenants
2. Create a company (if not exists)
3. Create a school
4. Create at least one branch
5. Run the script again

### Error: "tsx not found" or "Command failed"

**Install tsx:**

```bash
npm install -D tsx
```

Or run directly:

```bash
npx tsx scripts/seedTestUsers.ts
```

### Script Takes Too Long

**Normal!** Creating users with proper authentication takes time:
- Each user: ~0.5-1 second
- 50 users: ~5-10 minutes

The script includes delays to avoid rate limiting.

---

## Cleanup

### Remove All Test Users

When you're done testing:

```sql
DELETE FROM users WHERE raw_user_meta_data->>'test_account' = 'true';
```

This removes all test accounts and cascades to teachers/students tables.

---

## Support

For more details, see:
- `scripts/QUICK_START_SEED_USERS.md` - Quick reference
- `scripts/README_SEED_USERS.md` - Complete documentation
- `TEST_USERS_IMPLEMENTATION_SUMMARY.md` - Full implementation details

---

## Ready to Start?

```bash
npm run seed-test-users
```

Grab a coffee ☕ and watch the magic happen! ✨
