# Test Users Seeding Script

This script creates realistic test teachers and students in your database following the proper user creation flow used in production.

## Overview

The seeding script will:
- ✅ Create teachers with realistic profiles and specializations
- ✅ Create students distributed across grades and sections
- ✅ Follow the proper authentication flow (Edge Functions + userCreationService)
- ✅ Generate comprehensive documentation of all created accounts
- ✅ Support multiple schools and branches automatically
- ✅ Create proper parent/guardian information for students

## Prerequisites

1. **Active Schools and Branches**: The database must have at least one active school with branches
2. **Supabase Configuration**: Environment variables must be properly configured in `.env`
3. **Edge Functions**: The `create-teacher-student-user` Edge Function should be deployed

## Configuration

### Default Settings

The script uses the following defaults (can be modified in `seedTestUsers.ts`):

- **Teachers per school**: 4
- **Students per grade**: 8
- **Grades per school**: 5 (or all available grades if fewer)
- **Test password**: `TestPass123!` (standardized for all test accounts)

### Customization

Edit `scripts/seedTestUsers.ts` to modify:

```typescript
// At the top of the file
const TEACHERS_PER_SCHOOL = 4;        // Change this number
const STUDENTS_PER_GRADE = 8;         // Change this number
const TEST_PASSWORD = 'TestPass123!'; // Change test password
```

## Usage

### Run the Seeding Script

```bash
npm run seed-test-users
```

### What Happens

1. **Database Analysis**: Fetches all active schools, branches, and grade levels
2. **Teacher Creation**: Creates specified number of teachers per school
3. **Student Creation**: Creates specified number of students per grade per school
4. **Report Generation**: Outputs a comprehensive report with all login credentials

### Expected Output

```
🚀 Starting Test Data Seeding Process

================================================
📊 Fetching schools and branches...
✅ Found 3 schools and 8 branches

📊 Fetching grade levels...
✅ Found 10 grade levels

================================================

👨‍🏫 CREATING TEACHERS
================================================

👨‍🏫 Creating 4 teachers for Lincoln High School...
  Creating teacher: John Smith (john.smith.teacher1@testschool.edu)
  ✅ Created teacher: John Smith
  ...

👨‍🎓 CREATING STUDENTS
================================================

👨‍🎓 Creating students for Lincoln High School...

  Grade Grade 1:
    Creating student: Mary Johnson - Section A
    ✅ Created student: Mary Johnson
    ...

================================================

✅ TEST DATA SEEDING COMPLETED SUCCESSFULLY!
================================================

Total users created: 52
- Teachers: 12
- Students: 40

All accounts use password: TestPass123!
```

## Generated Data Structure

### Teachers

Each teacher includes:
- Full name (realistic first and last name)
- Email: `firstname.lastname.teacherN@testschool.edu`
- Phone: Random format `XXX-XXX-XXXX`
- Teacher code: `TCH-[SCHOOL_CODE]-XXXX`
- Specialization: Random subjects (e.g., "Mathematics, Statistics")
- Qualification: Random degree (e.g., "B.Ed. Mathematics")
- Experience: 1-15 years
- Hire date: Within last 5 years
- School assignment
- Branch assignment

### Students

Each student includes:
- Full name (realistic first and last name)
- Email: `firstname.lastname.studentN@testschool.edu`
- Phone: Random format `XXX-XXX-XXXX`
- Student code: `STU-[SCHOOL_CODE]-G[GRADE]-XXXX`
- Enrollment number: `ENRYEARXXXXXX`
- Grade level: From configured grades
- Section: A, B, or C
- Admission date: Within last 3 years
- School assignment
- Branch assignment
- Parent information:
  - Parent name
  - Parent contact
  - Parent email
  - Emergency contact details

## Test Account Features

All created accounts have:
- ✅ **Active status**: Immediately usable
- ✅ **Test metadata**: Marked as `test_account: true`
- ✅ **Standard password**: Same password for easy testing
- ✅ **Proper RLS**: Respects all Row Level Security policies
- ✅ **Scope-based access**: Works with access control system

## Login Testing

After seeding, you can test with any created account:

1. Go to login page
2. Enter any email from the generated report
3. Use password: `TestPass123!`
4. Sign in and verify proper access levels

### Example Test Scenarios

**Teacher Login:**
```
Email: john.smith.teacher1@testschool.edu
Password: TestPass123!
Expected: Access to teacher module with assigned school/branch
```

**Student Login:**
```
Email: mary.johnson.student1@testschool.edu
Password: TestPass123!
Expected: Access to student module with assigned programs/licenses
```

## Report File

The script generates a detailed Markdown report including:

- Summary statistics (total users, breakdown by type)
- Complete teacher list with assignments
- Complete student list grouped by school and grade
- Login instructions
- Metadata about each account

Example report structure:

```markdown
# Test Users Seeding Report

**Generated:** 2025-10-12T17:30:00.000Z

**Total Users Created:** 52
- Teachers: 12
- Students: 40

**Standard Test Password:** `TestPass123!`

---

## Teachers (12)

| Name | Email | Code | School | Branch | Specialization |
|------|-------|------|--------|--------|----------------|
| John Smith | john.smith.teacher1@... | TCH-LHS-0001 | Lincoln HS | Main Branch | Mathematics, Statistics |
...

## Students (40)

### Lincoln High School (20 students)

| Name | Email | Code | Grade | Section | Enrollment # |
|------|-------|------|-------|---------|-------------|
| Mary Johnson | mary.johnson.student1@... | STU-LHS-G01-0001 | Grade 1 | A | ENR2025000001 |
...
```

## Troubleshooting

### Error: "No active schools found"

**Solution:** Create at least one active school and branch before running the script.

```sql
-- Example: Create a school and branch
INSERT INTO schools (name, code, company_id, status)
VALUES ('Test School', 'TST', '[company-id]', 'active');

INSERT INTO branches (name, code, school_id, status)
VALUES ('Main Branch', 'MAIN', '[school-id]', 'active');
```

### Error: "Failed to create user"

**Possible causes:**
1. Edge Function not deployed or not accessible
2. Email already exists in database
3. Missing required permissions

**Solution:** Check Edge Function deployment and review error messages.

### Error: "No grade levels found"

The script will automatically create default grade levels (1-10) if none exist.

## Cleanup

To remove all test accounts:

```sql
-- Delete test users (cascades to teachers/students tables)
DELETE FROM users WHERE raw_user_meta_data->>'test_account' = 'true';
```

**Warning:** This will permanently delete all test data. Use with caution.

## Integration with Development

### Use Cases

1. **Feature Testing**: Test license assignment, grade management, etc.
2. **Access Control Testing**: Verify scope-based permissions work correctly
3. **UI Testing**: Populate UI with realistic data for screenshots/demos
4. **Performance Testing**: Load test with multiple users
5. **Training**: Create demo accounts for training sessions

### Best Practices

- Run seeding in development/staging only
- Never run in production
- Use distinct password for test accounts
- Mark test accounts clearly in metadata
- Clean up test data regularly

## Advanced Usage

### Custom Grade Levels

If you need specific grade levels:

```typescript
// In seedTestUsers.ts, modify createDefaultGradeLevels()
const customGrades = [
  { name: 'Kindergarten', code: 'K' },
  { name: 'Pre-K', code: 'PK' },
  { name: 'Grade 11', code: '11' },
  { name: 'Grade 12', code: '12' }
];
```

### Multiple Runs

The script handles duplicate emails gracefully. If you run it multiple times:
- Existing emails will be skipped
- New unique users will be created
- Error messages will indicate duplicates

### Programmatic Access

You can also import and use the seeding function:

```typescript
import { seedTestUsers } from './scripts/seedTestUsers';

// In your code
await seedTestUsers();
```

## Support

For issues or questions:
1. Check Edge Function logs in Supabase dashboard
2. Review database RLS policies
3. Verify environment variables in `.env`
4. Check console output for specific error messages

## Security Notes

⚠️ **Important Security Considerations:**

1. **Test Passwords**: All test accounts use the same password - suitable for testing only
2. **Production**: Never run this script in production
3. **Cleanup**: Remove test accounts before going live
4. **Metadata**: Test accounts are marked with `test_account: true` flag
5. **Access**: Test accounts respect all RLS policies and access controls

## Version History

- **v1.0.0** (2025-10-12): Initial release with teacher and student creation
