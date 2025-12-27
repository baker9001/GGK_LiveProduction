# Netlify Deployment Error Fix

## Error Diagnosis

**Error Message**: `Failed during stage 'fetching build zip': extracting zip file: zip: not a valid zip file`

**Root Cause**: Netlify's build cache is corrupted. This is a Netlify infrastructure issue, not a code issue.

## Solution: Clear Build Cache and Redeploy

### Method 1: Clear Cache via Netlify UI (Recommended)

1. **Go to your Netlify site dashboard**
   - Navigate to: https://app.netlify.com/

2. **Clear the build cache**
   - Click on "Site settings"
   - Go to "Build & deploy" section
   - Scroll down to "Build settings"
   - Click "Clear cache and retry deploy" button
   - OR click "Edit settings" → "Clear cache and save"

3. **Trigger a new deployment**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

### Method 2: Clear Cache via Netlify CLI

If you have the Netlify CLI installed:

```bash
# Clear cache
netlify build --clear-cache

# Then deploy
netlify deploy --prod
```

### Method 3: Force Fresh Build (Alternative)

1. **Make a small change to trigger rebuild**
   - Add a comment or space to any file
   - Commit and push to your Git repository

2. **Before deploying, clear cache**
   - Use Method 1 above to clear cache first

3. **Deploy**
   - Netlify will automatically deploy from your Git push

## Environment Variables to Set (Before Deploying)

Make sure these are set in Netlify:

1. **Go to**: Site settings → Environment variables
2. **Add these variables**:
   ```
   VITE_SUPABASE_URL
   Value: [Your Supabase URL from .env file]

   VITE_SUPABASE_ANON_KEY
   Value: [Your Supabase Anon Key from .env file]

   VITE_API_URL
   Value: [Your Supabase Functions URL from .env file]
   ```

3. **Set scope**: All (deploy contexts)

## Step-by-Step Quick Fix

1. ✅ **Clear Netlify cache** (Method 1 above)
2. ✅ **Verify environment variables are set**
3. ✅ **Click "Trigger deploy" → "Clear cache and deploy site"**
4. ✅ **Wait for build to complete**
5. ✅ **Test the deployed site**

## If Issue Persists

If clearing the cache doesn't work:

### Option A: Delete and Recreate Site
1. Go to Site settings → General → Danger zone
2. Delete the site
3. Create a new site from your Git repository
4. Set environment variables again
5. Deploy

### Option B: Deploy from Local Build
1. Build locally:
   ```bash
   npm install
   npm run build
   ```

2. Deploy the dist folder manually:
   ```bash
   netlify deploy --prod --dir=dist
   ```

## Verification Checklist

After successful deployment:
- [ ] Site loads at your Netlify URL
- [ ] No white page on homepage
- [ ] Can navigate to different routes (/subjects, /about, etc.)
- [ ] Page refresh doesn't show 404 or white page
- [ ] Browser console has no critical errors
- [ ] Login page loads correctly

## Common Netlify Build Issues

### Issue: "Command failed with exit code 1"
**Solution**: Check build logs for specific error, usually missing dependencies or build script issues

### Issue: Environment variables not working
**Solution**:
- Verify VITE_ prefix is present
- Clear cache after adding variables
- Redeploy

### Issue: "npm command not found"
**Solution**: Set NODE_VERSION in netlify.toml (already set to 18)

## Support Resources

- Netlify Status: https://www.netlifystatus.com/
- Netlify Support: https://www.netlify.com/support/
- Build logs: Check the full deploy log in Netlify dashboard

---

**Next Steps**: Clear the cache using Method 1 and trigger a new deployment.
