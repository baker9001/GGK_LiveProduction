# Quick Start Guide - Subject Logo Upload

## What Was Fixed

The "new row violates row-level security policy" error when uploading subject logos has been fixed by implementing a secure server-side upload architecture using Supabase Edge Functions.

## What You Need to Do (ONE-TIME SETUP)

### Step 1: Create Storage Policies (Manual Step)

Open your Supabase Dashboard and navigate to **Storage > subject-logos > Policies**, then click "New Policy" and create these two policies:

**Policy 1: Public View Access**
- Policy name: `Public can view subject logos`
- Policy command: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'subject-logos'`

**Policy 2: Service Role Full Access**
- Policy name: `Service role full access to subject logos`
- Policy command: `ALL`
- Target roles: `service_role`
- USING expression: `bucket_id = 'subject-logos'`
- WITH CHECK expression: `bucket_id = 'subject-logos'`

### Alternative: SQL Method

Or run this SQL in your Supabase SQL Editor:

```sql
-- Policy 1: Public read access
CREATE POLICY "Public can view subject logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'subject-logos');

-- Policy 2: Service role full access
CREATE POLICY "Service role full access to subject logos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');
```

## That's It!

Once you've created the two storage policies, the subject logo upload feature is ready to use. Everything else is already deployed and configured.

## How to Use

1. Go to **System Admin > Learning > Education Catalogue**
2. Click on Subjects tab
3. Click "Add Subject" or "Edit" on an existing subject
4. Click the "Upload Logo" button
5. Select your image file (PNG, JPG, JPEG, or SVG, max 2MB)
6. Click "Save"

The logo will upload securely through the server-side Edge Function.

## Troubleshooting

### "Please log in to upload images"
- Make sure you're logged in as a system admin

### "You don't have permission to upload images"
- Only system admins (users in the `admin_users` table) can upload logos
- Contact your system administrator

### "No Edge Function configured for bucket"
- This means the Edge Functions weren't deployed
- Check that Edge Functions are running in your Supabase project

### Upload still fails with RLS error
- Make sure you completed Step 1 above (create storage policies)
- Verify the policies exist in Supabase Dashboard > Storage > subject-logos > Policies
- You should see 2 policies listed

## Technical Details

For developers who want to understand the implementation:

- **Edge Functions**: `upload-subject-logo` and `delete-subject-logo`
- **Authentication**: Custom auth token validated server-side
- **Authorization**: Admin check via `admin_users` table
- **Storage**: service_role credentials bypass RLS for secure uploads

See `SECURE_LOGO_UPLOAD_IMPLEMENTATION.md` for complete technical documentation.

---

Need help? Check the console logs in your browser's developer tools for detailed error messages.
