# Resend Setup - Quick Start Guide

## 🚀 5-Minute Setup

This is the fastest path to get password reset emails working.

---

## Step 1: Create Resend Account (2 minutes)

1. **Go to Resend:** https://resend.com
2. **Click "Start Building"** (top right)
3. **Sign up** with your work email
4. **Verify your email** (check inbox)
5. **Login to dashboard**

---

## Step 2: Get API Key (1 minute)

1. **In Resend dashboard**, click **"API Keys"** (left sidebar)
2. **Click "Create API Key"**
3. **Name:** `GGK-Admin-Emails`
4. **Permission:** Select "Sending access"
5. **Click "Create"**
6. **COPY THE KEY** immediately (starts with `re_`)
   - ⚠️ You won't see it again!
   - Save it somewhere safe temporarily

---

## Step 3: Configure Supabase (2 minutes)

Open your terminal in the project directory and run:

```bash
# Set the Resend API key
supabase secrets set RESEND_API_KEY="re_YourKeyHere"

# Set the sender email (use sandbox for testing)
supabase secrets set EMAIL_FROM="onboarding@resend.dev"

# Verify secrets are set
supabase secrets list

# Redeploy edge function to pick up new secrets
supabase functions deploy send-admin-invite
```

Expected output:
```
✓ RESEND_API_KEY saved
✓ EMAIL_FROM saved
✓ Edge function deployed successfully
```

---

## Step 4: Test It! (1 minute)

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Login as Entity Admin**

3. **Go to Organization → Admins tab**

4. **Click the 🔑 Key icon** next to any user

5. **Check the user's email inbox**
   - Should arrive within 10-30 seconds
   - Subject: "Reset Your Admin Password"
   - Professional GGK branded email

6. **Verify in logs:**
   ```bash
   supabase functions logs send-admin-invite --tail
   ```

   Should show:
   ```
   ✅ "Email sent successfully via Resend"
   ```

---

## ✅ Success Checklist

You'll know it's working when:

- [ ] Edge function logs show: "Email sent successfully via Resend"
- [ ] Email arrives in inbox within 30 seconds
- [ ] Email has green GGK branding
- [ ] "Reset Password" button works
- [ ] No errors in browser console
- [ ] Password reset flow completes successfully

---

## 🔧 Quick Troubleshooting

### Problem: "Using Supabase managed email service" in logs

**Solution:** RESEND_API_KEY not set correctly

```bash
# Check if secret exists
supabase secrets list

# If missing, set it again
supabase secrets set RESEND_API_KEY="re_YourKeyHere"

# Redeploy
supabase functions deploy send-admin-invite
```

---

### Problem: Email not arriving

**Check:**
1. Spam folder (first time only)
2. Resend dashboard logs: https://resend.com/logs
3. Verify API key is correct
4. Check edge function logs for errors

---

### Problem: "Failed to send email via Resend"

**Causes:**
- Invalid API key
- API key deleted or expired
- Rate limit exceeded (unlikely on free tier: 100/day)

**Solution:**
1. Go to Resend dashboard → API Keys
2. Verify key is active
3. Create new key if needed
4. Update secret: `supabase secrets set RESEND_API_KEY="re_NewKey"`

---

## 📊 Testing Commands

```bash
# Watch edge function logs in real-time
supabase functions logs send-admin-invite --tail

# List configured secrets
supabase secrets list

# Test from command line
node scripts/test-password-reset-email.mjs admin@example.com

# Run diagnostics
node scripts/diagnose-email-issue.mjs
```

---

## 🎯 Using Sandbox vs Production

### Sandbox (For Testing - Fastest)
- **No domain verification needed**
- **Free:** 100 emails/day
- **From:** `onboarding@resend.dev`
- **Limitation:** Can only send to verified email addresses in Resend dashboard

```bash
supabase secrets set EMAIL_FROM="onboarding@resend.dev"
```

### Production (Your Domain)
- **Requires domain verification** (DNS records)
- **Better branding:** `noreply@ggknowledge.com`
- **Better deliverability**

```bash
supabase secrets set EMAIL_FROM="noreply@ggknowledge.com"
```

**To verify domain:**
1. Go to Resend → Domains
2. Add domain: `ggknowledge.com`
3. Add provided DNS records to your DNS provider
4. Wait 5-60 minutes
5. Click "Verify"

---

## 📖 Full Documentation

For detailed information, see: `PASSWORD_RESET_EMAIL_FIX_IMPLEMENTATION.md`

---

## 🆘 Need Help?

1. **Check edge function logs:**
   ```bash
   supabase functions logs send-admin-invite --tail
   ```

2. **Check Resend dashboard:** https://resend.com/logs

3. **Run diagnostics:**
   ```bash
   node scripts/diagnose-email-issue.mjs
   ```

4. **Common issues:**
   - API key not set → Run `supabase secrets list`
   - Email in spam → Mark as "Not Spam"
   - Link not working → Check Redirect URLs in Supabase Dashboard

---

**Total Setup Time:** 5 minutes
**Result:** Professional, reliable password reset emails
**Cost:** Free (100 emails/day)

🎉 **You're all set!** Enjoy reliable password reset emails with zero hassle.
