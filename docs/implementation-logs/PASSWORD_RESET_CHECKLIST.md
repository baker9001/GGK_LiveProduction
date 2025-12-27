# Password Reset Email - Implementation Checklist

Use this checklist to track your progress implementing the password reset email fix.

---

## 🎯 Pre-Implementation

- [ ] Read `PASSWORD_RESET_EMAIL_FIX_IMPLEMENTATION.md`
- [ ] Read `RESEND_SETUP_QUICK_START.md`
- [ ] Have terminal access to project directory
- [ ] Have access to Supabase dashboard
- [ ] Ready to create Resend account

---

## 📧 Resend Account Setup

### Create Account
- [ ] Go to https://resend.com
- [ ] Click "Start Building" / "Sign Up"
- [ ] Sign up with work email
- [ ] Verify email address
- [ ] Login to Resend dashboard

### Generate API Key
- [ ] Navigate to "API Keys" in sidebar
- [ ] Click "Create API Key"
- [ ] Name it: `GGK-Admin-Emails`
- [ ] Select permission: "Sending access"
- [ ] Click "Create"
- [ ] Copy API key (starts with `re_`)
- [ ] Save API key securely

### Domain Configuration (Choose One)

**Option A: Sandbox (Testing)**
- [ ] Use sandbox: `onboarding@resend.dev`
- [ ] No setup required
- [ ] Can send to any email for testing

**Option B: Custom Domain (Production)**
- [ ] Go to Domains in Resend dashboard
- [ ] Click "Add Domain"
- [ ] Enter: `ggknowledge.com`
- [ ] Copy DNS records (SPF, DKIM)
- [ ] Add DNS records to domain provider
- [ ] Wait for DNS propagation (5-60 min)
- [ ] Click "Verify" in Resend
- [ ] Verify domain is "Active"

---

## 🔧 Supabase Configuration

### Set Secrets
```bash
# In project directory, run these commands:
```

- [ ] Run: `supabase secrets set RESEND_API_KEY="re_YourActualKey"`
- [ ] Run: `supabase secrets set EMAIL_FROM="onboarding@resend.dev"` (or your domain)
- [ ] Run: `supabase secrets list` to verify
- [ ] Verify secrets appear in list

### Deploy Edge Function
- [ ] Run: `supabase functions deploy send-admin-invite`
- [ ] Verify deployment successful
- [ ] No errors in deployment output

### Configure Redirect URLs
- [ ] Go to Supabase Dashboard
- [ ] Navigate to: Authentication → URL Configuration
- [ ] Scroll to "Redirect URLs"
- [ ] Add: `http://localhost:5173/reset-password`
- [ ] Add: `https://ggknowledge.com/reset-password`
- [ ] Click "Save"

---

## ✅ Testing

### Run Diagnostics
- [ ] Run: `node scripts/diagnose-email-issue.mjs`
- [ ] Review diagnostic output
- [ ] Fix any reported issues

### Test Email Sending
- [ ] Run: `npm run dev` to start application
- [ ] Login as Entity Admin
- [ ] Navigate to Organization → Admins tab
- [ ] Click 🔑 key icon next to test user
- [ ] Check browser console for success message
- [ ] No errors in console

### Verify Email Delivery
- [ ] Open terminal: `supabase functions logs send-admin-invite --tail`
- [ ] Look for: "Email sent successfully via Resend"
- [ ] NOT: "Using Supabase managed email service"
- [ ] Check recipient's email inbox
- [ ] Email arrives within 30 seconds
- [ ] Check spam folder (first time only)

### Verify Email Content
- [ ] Subject: "Reset Your Admin Password"
- [ ] From address matches EMAIL_FROM
- [ ] GGK green branding (#8CC63F)
- [ ] Professional HTML layout
- [ ] "Reset Your Password" button present
- [ ] 24-hour expiration warning present
- [ ] Footer with copyright

### Test Complete Flow
- [ ] Click "Reset Your Password" button in email
- [ ] Redirects to password reset page
- [ ] Password reset form displays
- [ ] Enter new password (twice)
- [ ] Click "Reset Password"
- [ ] Success message displays
- [ ] Logout from application
- [ ] Login with new password
- [ ] Login successful

### Verify in Resend Dashboard
- [ ] Go to https://resend.com/logs
- [ ] Find sent email in logs
- [ ] Status shows "Delivered"
- [ ] No errors in Resend logs

---

## 🔍 Troubleshooting (If Issues Found)

### If logs show "Using Supabase managed email service"
- [ ] Verify: `supabase secrets list` shows RESEND_API_KEY
- [ ] Re-set: `supabase secrets set RESEND_API_KEY="re_YourKey"`
- [ ] Redeploy: `supabase functions deploy send-admin-invite`
- [ ] Test again

### If email not arriving
- [ ] Check spam folder
- [ ] Check Resend dashboard logs
- [ ] Verify API key is valid (Resend → API Keys)
- [ ] Check edge function logs for errors
- [ ] Verify recipient email is correct

### If password reset link not working
- [ ] Check Redirect URLs in Supabase Dashboard
- [ ] Verify `/reset-password` route exists in app
- [ ] Check browser console for errors
- [ ] Verify token hasn't expired (24 hours)

---

## 📊 Monitoring

### Set Up Regular Checks
- [ ] Bookmark Resend logs: https://resend.com/logs
- [ ] Bookmark Supabase Edge Functions dashboard
- [ ] Set up email delivery monitoring
- [ ] Review rate limits (100/day free tier)

### Monitor Edge Function
- [ ] Check invocation count
- [ ] Check error rate (should be 0%)
- [ ] Check average duration (<2 seconds)
- [ ] Review logs for any issues

---

## 🚀 Production Ready

### Pre-Production Checks
- [ ] All tests passing
- [ ] Using verified domain (not sandbox)
- [ ] Email deliverability tested
- [ ] Edge function stable
- [ ] No errors in logs
- [ ] Rate limits understood
- [ ] Monitoring in place

### Launch Checklist
- [ ] Inform team password reset is working
- [ ] Document process for admins
- [ ] Test with multiple users
- [ ] Monitor initial usage
- [ ] Ready to handle issues

---

## 📝 Post-Implementation

### Documentation
- [ ] Update internal documentation
- [ ] Share implementation guide with team
- [ ] Document any custom changes
- [ ] Save API keys securely

### Training
- [ ] Show admins how to reset passwords
- [ ] Explain email delivery times
- [ ] Show where to check for issues
- [ ] Provide troubleshooting guide

---

## ✅ Final Verification

- [ ] Password reset emails working reliably
- [ ] Delivery time < 30 seconds
- [ ] Professional email appearance
- [ ] Complete flow tested end-to-end
- [ ] No errors in production
- [ ] Team trained on process
- [ ] Monitoring in place
- [ ] Documentation complete

---

## 🎉 Success Criteria

You can mark this complete when:

✅ All checkboxes above are checked
✅ Password reset emails deliver reliably
✅ Edge function logs show Resend usage
✅ Email branding looks professional
✅ Complete flow works without errors
✅ Team knows how to use the feature
✅ Monitoring is in place

---

**Status:** [ ] Not Started / [ ] In Progress / [ ] Complete

**Completion Date:** _______________

**Verified By:** _______________

**Notes:**
```
_____________________________________________________________

_____________________________________________________________

_____________________________________________________________
```

---

**Estimated Time:** 15-20 minutes
**Difficulty:** Easy
**Impact:** High (Critical functionality)
**Priority:** High
