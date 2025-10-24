# Manual QA - Student Pathways Error Rendering

## Scenario: Supabase returns an RLS/schema error
1. Log in as a student user with valid Supabase credentials.
2. In the browser devtools console, run a script (or temporarily patch the code) to force the `student_licenses` query to hit a table with RLS restrictions that the current role cannot access.
   - Example: modify RLS policies in Supabase dashboard to deny `select` for the `student_licenses` table for the student's role.
3. Refresh the `/student-module/pathways` page.

## Expected Results
- A toast/alert appears on the page with the exact `message` provided by Supabase (e.g. `new row violates row-level security policy for table "student_licenses"`).
- The browser console logs `Failed to fetch student learning pathway subjects` alongside the structured Supabase error object for debugging.
- No generic "An unexpected error occurred" placeholder is shown unless Supabase omits a `message` value.
