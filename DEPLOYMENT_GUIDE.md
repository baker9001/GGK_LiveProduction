# Deployment Guide

## Root Cause of White Page Issue

The white page issue in production was caused by:

1. **Missing SPA Redirect Configuration**: React Router requires all routes to be redirected to `index.html` for client-side routing to work. Without this, navigating to any route other than `/` would return a 404.

2. **Missing Environment Variables**: Production environment needs the Supabase credentials configured.

## Fixes Applied

### 1. Created `public/_redirects` File
This file tells the deployment platform to serve `index.html` for all routes, enabling React Router to handle routing.

### 2. Created `netlify.toml`
Provides comprehensive deployment configuration including:
- Build settings
- SPA redirect rules
- Security headers
- Asset caching

### 3. Updated `vite.config.ts`
Added `base: '/'` to ensure assets load correctly from the root path.

## Deployment Steps

### For Netlify Deployment:

1. **Build the Project**
   ```bash
   npm run build
   ```

2. **Set Environment Variables in Netlify**
   - Go to: Site Settings > Environment Variables
   - Add the following variables:
     - `VITE_SUPABASE_URL` = Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
     - `VITE_API_URL` = Your Supabase functions URL

3. **Deploy**
   - Connect your Git repository to Netlify
   - Netlify will automatically detect the build settings from `netlify.toml`
   - Or manually deploy the `dist` folder

### For Vercel Deployment:

1. **Create `vercel.json`** (if using Vercel)
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

2. **Set Environment Variables in Vercel**
   - Go to: Project Settings > Environment Variables
   - Add the same variables as above

3. **Deploy**
   - Connect your Git repository
   - Vercel will auto-detect the build settings

### For Other Platforms:

Ensure the following:
1. Build command: `npm run build`
2. Publish directory: `dist`
3. All routes redirect to `/index.html` (for SPA routing)
4. Environment variables are set with `VITE_` prefix

## Testing Production Build Locally

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Preview the production build**
   ```bash
   npm run preview
   ```

3. **Test navigation**
   - Navigate to different routes
   - Refresh the page on different routes
   - Verify no white pages or 404 errors

## Common Issues

### Issue: White page on refresh
**Solution**: Ensure `_redirects` file is in the `dist` folder after build. The file should be automatically copied from `public/` during build.

### Issue: Environment variables not working
**Solution**:
- Verify variables have `VITE_` prefix
- Rebuild after changing environment variables
- Check deployment platform has variables set

### Issue: Assets not loading (404 errors)
**Solution**:
- Verify `base: '/'` is set in `vite.config.ts`
- Check asset paths in browser console
- Ensure build completed successfully

## Verification Checklist

After deployment, verify:
- [ ] Landing page loads correctly
- [ ] Can navigate to all routes (subjects, about, contact, etc.)
- [ ] Refreshing page on any route doesn't show white page
- [ ] Login works (requires valid Supabase credentials)
- [ ] Assets (images, CSS, JS) load correctly
- [ ] Console has no critical errors
- [ ] Favicon displays correctly

## Important Notes

1. **Environment Variables**: Never commit actual credentials to Git. Use the `.env.production.example` as a template.

2. **_redirects File**: The `public/_redirects` file is automatically copied to `dist/` during build. Don't manually edit `dist/`.

3. **Caching**: After deployment, you may need to hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to see changes.

4. **Build Warnings**: The large chunk size warnings are normal for this app and don't affect functionality.
