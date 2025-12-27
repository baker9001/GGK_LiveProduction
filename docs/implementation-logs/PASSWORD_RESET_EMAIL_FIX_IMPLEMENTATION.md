# Password Reset Email Fix - Implementation Guide

## Executive Summary

**Issue:** Password reset emails are not being delivered to admin users.

**Root Cause:** The application is using Supabase's default email service which has severe rate limits (3-4 emails/hour) and poor deliverability.

**Solution:** Integrate Resend API for reliable email delivery with professional templates.

**Status:** ✅ Edge function already supports Resend - just needs API key configuration!

---

## Current State Analysis

### What's Working ✅
- Edge function (`send-admin-invite`) exists and is properly structured
- Email template HTML is already built into the edge function
- Resend integration code is already implemented (lines 77-176)
- Fallback to Supabase email exists (lines 178-211)

### What's Missing ❌
- `RESEND_API_KEY` environment variable not configured
- `EMAIL_FROM` environment variable not configured
- Currently falling back to Supabase's rate-limited email service

---

## Implementation Steps

### Phase 1: Set Up Resend Account (5 minutes)

#### Step 1.1: Create Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Click "Start Building" or "Sign Up"
3. Sign up with your email (use your work email)
4. Verify your email address

#### Step 1.2: Get Your API Key
1. After login, go to **API Keys** in left sidebar
2. Click "Create API Key"
3. Name it: `GGK-Admin-Emails`
4. Select permission: **Sending access**
5. Click "Create"
6. **IMPORTANT:** Copy the API key immediately (starts with `re_`)
7. Save it securely - you won't see it again!

#### Step 1.3: Domain Verification (Choose One Option)

**Option A: Use Resend Sandbox (Fastest - For Testing)**
- No setup required!
- Can send to verified email addresses only
- Free: 100 emails/day
- Perfect for testing before production
- Your emails will come from: `onboarding@resend.dev`

**Option B: Verify Your Domain (Production Ready)**
1. In Resend dashboard, go to **Domains**
2. Click "Add Domain"
3. Enter your domain: `ggknowledge.com`
4. Resend will provide DNS records:
   - SPF record
   - DKIM records (2-3 records)
   - DMARC record (optional)
5. Add these records to your DNS provider (GoDaddy, Cloudflare, etc.)
6. Wait 5-60 minutes for DNS propagation
7. Click "Verify" in Resend dashboard
8. Once verified, you can send from: `noreply@ggknowledge.com`

**Recommendation:** Start with Option A (Sandbox) for immediate testing, then do Option B for production.

---

### Phase 2: Configure Supabase Edge Function (2 minutes)

#### Step 2.1: Set Supabase Secrets

You need to set these as **Supabase Secrets** (NOT in .env file):

```bash
# Navigate to your project directory
cd /path/to/your/project

# Set Resend API Key
supabase secrets set RESEND_API_KEY="re_YourActualKeyFromResend"

# Set sender email
# If using sandbox:
supabase secrets set EMAIL_FROM="onboarding@resend.dev"

# If using verified domain:
supabase secrets set EMAIL_FROM="noreply@ggknowledge.com"

# Optional: Set custom redirect URL (already has default)
supabase secrets set ADMIN_RESET_REDIRECT_URL="https://ggknowledge.com/reset-password"
```

#### Step 2.2: Verify Secrets Are Set

```bash
# List all secrets (values will be hidden)
supabase secrets list
```

You should see:
```
RESEND_API_KEY
EMAIL_FROM
ADMIN_RESET_REDIRECT_URL (optional)
```

#### Step 2.3: Redeploy Edge Function

```bash
# Redeploy to pick up new secrets
supabase functions deploy send-admin-invite
```

Expected output:
```
Deploying send-admin-invite...
✓ Deployed successfully
```

---

### Phase 3: Update Frontend Configuration (1 minute)

The redirect URL in Supabase Auth needs to include your password reset page.

#### Step 3.1: Add Redirect URLs in Supabase Dashboard

1. Go to Supabase Dashboard: https://YOUR_PROJECT.supabase.co
2. Navigate to: **Authentication** → **URL Configuration**
3. Scroll to **Redirect URLs** section
4. Add these URLs (one per line):

```
http://localhost:5173/reset-password
http://localhost:5173/entity-module
https://ggknowledge.com/reset-password
https://ggknowledge.com/entity-module
```

5. Click **Save**

---

### Phase 4: Testing (5 minutes)

#### Step 4.1: Test Password Reset Flow

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **Login as Entity Admin** (or System Admin)

3. **Navigate to Admin Users page:**
   - Entity Admin: Go to Organization → Admins tab
   - System Admin: Go to Admin Users

4. **Click the Key Icon (🔑)** next to a test user

5. **Check Browser Console:**
   - Should show: "Password reset email sent successfully"
   - Should NOT show any errors

#### Step 4.2: Check Edge Function Logs

Open a new terminal and run:
```bash
supabase functions logs send-admin-invite --tail
```

You should see:
```
2024-12-10T15:30:45.123Z Sending recovery email to: admin@example.com
2024-12-10T15:30:45.456Z Email sent successfully via Resend
```

**If you see "Using Supabase managed email service" instead:**
- ❌ RESEND_API_KEY is not set correctly
- Go back to Phase 2 and verify secrets

#### Step 4.3: Check Email Delivery

1. **Check Inbox** (of the test user)
   - Email should arrive within 10-30 seconds
   - Subject: "Reset Your Admin Password"
   - From: Your configured EMAIL_FROM address

2. **Check Spam Folder** (first time only)
   - Resend emails rarely go to spam
   - If found, mark as "Not Spam"

3. **Verify Email Content:**
   - Should have GGK green branding (#8CC63F)
   - Professional HTML layout
   - "Reset Your Password" button
   - 24-hour expiration warning
   - Footer with copyright

#### Step 4.4: Test Complete Flow

1. **Click "Reset Your Password" button** in email
2. Should redirect to: `https://ggknowledge.com/reset-password?token=...`
3. Should show password reset form
4. **Enter new password** (twice for confirmation)
5. Click "Reset Password"
6. Should show success message
7. **Logout and login with new password**
8. Should successfully authenticate

---

### Phase 5: Monitor and Verify (Ongoing)

#### Monitor Email Delivery in Resend

1. Go to Resend Dashboard
2. Click **Logs** in left sidebar
3. You'll see all sent emails with:
   - Delivery status (✓ Delivered, ⏳ Pending, ✗ Failed)
   - Recipient email
   - Timestamp
   - Open/click tracking (if enabled)

#### Check Supabase Function Analytics

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** → **send-admin-invite**
3. View metrics:
   - Invocations (number of calls)
   - Errors (should be zero)
   - Duration (should be <2 seconds)

---

## Troubleshooting Guide

### Issue: "Email sent successfully" but no email received

**Check 1: Verify Resend API Key**
```bash
supabase secrets list
# Should show RESEND_API_KEY in the list
```

**Check 2: Verify in Resend Dashboard**
- Go to Resend → Logs
- Look for your email send attempt
- Check delivery status

**Check 3: Spam Folder**
- Check recipient's spam folder
- Mark as "Not Spam" if found

**Check 4: Verify Recipient Email**
- Ensure email address is correct in users table
- Ensure no typos in email address

---

### Issue: Edge function logs show "Using Supabase managed email service"

**Cause:** RESEND_API_KEY is not set or not recognized

**Fix:**
```bash
# Re-set the secret
supabase secrets set RESEND_API_KEY="re_YourActualKey"

# Verify it's set
supabase secrets list

# Redeploy
supabase functions deploy send-admin-invite

# Test again
```

---

### Issue: "Failed to send email via Resend" error

**Check 1: API Key Valid**
- Go to Resend Dashboard → API Keys
- Ensure key is active (not deleted)
- Check key has "Sending access" permission

**Check 2: From Email Domain**
- If using custom domain: Ensure domain is verified
- If using sandbox: Use `onboarding@resend.dev`

**Check 3: Rate Limits**
- Free tier: 100 emails/day, 3,000/month
- Check Resend dashboard for usage
- Upgrade plan if needed

**Check 4: Edge Function Logs**
```bash
supabase functions logs send-admin-invite --tail
```
Look for specific error messages

---

### Issue: Email arrives but link doesn't work

**Check 1: Redirect URL Configuration**
- Go to Supabase Dashboard → Authentication → URL Configuration
- Ensure your domain is in Redirect URLs list
- Must include: `https://ggknowledge.com/reset-password`

**Check 2: Token Expiration**
- Password reset links expire in 24 hours
- Generate a new link

**Check 3: Frontend Route**
- Ensure `/reset-password` route exists
- Should show password reset form
- Check browser console for errors

---

## Advanced Configuration

### Custom Email Template

The email template is in `send-admin-invite/index.ts` lines 104-163.

To customize:
1. Edit the HTML in the edge function
2. Update colors, logos, text as needed
3. Redeploy: `supabase functions deploy send-admin-invite`

Key style variables:
- Brand color: `#8CC63F` (GGK green)
- Background: `#f9f9f9`
- Button: `#8CC63F` with white text

### Email Tracking

Enable open/click tracking in Resend:
1. Go to Resend Dashboard → Settings
2. Enable "Track Opens"
3. Enable "Track Clicks"
4. View analytics in Logs section

### Rate Limits

**Resend Free Tier:**
- 100 emails per day
- 3,000 emails per month
- No credit card required

**Resend Pro Tier ($20/month):**
- 50,000 emails per month
- Better deliverability
- Priority support

---

## Production Checklist

Before going to production, ensure:

- [ ] Resend account created
- [ ] API key generated and saved securely
- [ ] Domain verified in Resend (not using sandbox)
- [ ] DNS records added and verified
- [ ] RESEND_API_KEY set in Supabase secrets
- [ ] EMAIL_FROM set to domain email (e.g., noreply@ggknowledge.com)
- [ ] Edge function redeployed
- [ ] Redirect URLs configured in Supabase Auth
- [ ] Password reset flow tested end-to-end
- [ ] Email deliverability tested (inbox, not spam)
- [ ] Edge function logs monitored for errors
- [ ] Resend dashboard shows successful deliveries
- [ ] Email template reviewed and approved
- [ ] Rate limits understood and acceptable

---

## Quick Reference Commands

```bash
# Set secrets
supabase secrets set RESEND_API_KEY="re_XXX"
supabase secrets set EMAIL_FROM="noreply@ggknowledge.com"

# List secrets
supabase secrets list

# Deploy edge function
supabase functions deploy send-admin-invite

# Watch logs in real-time
supabase functions logs send-admin-invite --tail

# Test from terminal (optional)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-invite \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Support Resources

- **Resend Documentation:** https://resend.com/docs
- **Resend Status Page:** https://status.resend.com
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Edge Function Logs:** Supabase Dashboard → Edge Functions → send-admin-invite

---

## Next Steps

1. **Complete Phase 1:** Set up Resend account (5 min)
2. **Complete Phase 2:** Configure secrets (2 min)
3. **Complete Phase 3:** Add redirect URLs (1 min)
4. **Complete Phase 4:** Test thoroughly (5 min)
5. **Monitor Phase 5:** Check logs and analytics

**Total Implementation Time:** ~15 minutes

**Expected Result:** Reliable password reset emails delivered within seconds, every time.

---

## Success Criteria

You'll know it's working when:

✅ Edge function logs show: "Email sent successfully via Resend"
✅ Resend dashboard shows: "Delivered" status
✅ Email arrives in inbox within 30 seconds
✅ Email has professional GGK branding
✅ Password reset link works correctly
✅ Complete flow tested successfully
✅ No errors in browser console
✅ No errors in edge function logs

---

**Last Updated:** 2024-12-10
**Status:** Ready for implementation
**Estimated Completion:** 15 minutes
