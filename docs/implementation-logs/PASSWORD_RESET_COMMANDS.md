# Password Reset Email - Command Reference Card

## 🚀 Quick Setup (Copy & Paste)

```bash
# 1. Set Resend API Key (get from resend.com)
supabase secrets set RESEND_API_KEY="re_YourKeyHere"

# 2. Set Sender Email (use sandbox for testing)
supabase secrets set EMAIL_FROM="onboarding@resend.dev"

# 3. Redeploy Edge Function
supabase functions deploy send-admin-invite

# 4. Verify Configuration
supabase secrets list

# 5. Run Diagnostics
npm run diagnose-email

# 6. Test with Your Email
npm run test-password-reset your-email@example.com
```

---

## 🔍 Diagnostic Commands

```bash
# Run full system diagnostics
npm run diagnose-email

# Test email sending to specific address
npm run test-password-reset admin@example.com

# Watch edge function logs in real-time
supabase functions logs send-admin-invite --tail

# List all configured secrets
supabase secrets list

# Check Supabase project status
supabase status
```

---

## 🔧 Configuration Commands

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY="re_XXX"

# Set sender email (sandbox)
supabase secrets set EMAIL_FROM="onboarding@resend.dev"

# Set sender email (custom domain - after verification)
supabase secrets set EMAIL_FROM="noreply@ggknowledge.com"

# Set custom redirect URL (optional)
supabase secrets set ADMIN_RESET_REDIRECT_URL="https://ggknowledge.com/reset-password"

# Remove a secret (if needed)
supabase secrets unset RESEND_API_KEY

# Deploy edge function
supabase functions deploy send-admin-invite

# Deploy all edge functions
supabase functions deploy
```

---

## 📊 Monitoring Commands

```bash
# Watch logs (real-time)
supabase functions logs send-admin-invite --tail

# View recent logs (last 100 lines)
supabase functions logs send-admin-invite

# View logs with timestamps
supabase functions logs send-admin-invite --timestamps

# Check function status
supabase functions list
```

---

## 🧪 Testing Commands

```bash
# Build project
npm run build

# Start development server
npm run dev

# Run diagnostics
npm run diagnose-email

# Test password reset email
npm run test-password-reset admin@example.com

# Run all tests
npm test

# Lint code
npm run lint
```

---

## 🔄 Deployment Commands

```bash
# Deploy edge function
supabase functions deploy send-admin-invite

# Deploy with custom environment
supabase functions deploy send-admin-invite --project-ref YOUR_PROJECT_REF

# View deployment status
supabase functions list

# Check function health
curl https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-invite \
  -X OPTIONS \
  -H "apikey: YOUR_ANON_KEY"
```

---

## 🐛 Debug Commands

```bash
# Check if edge function is accessible
curl -X OPTIONS \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-invite \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"

# Test edge function directly (send test email)
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-invite \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -d '{"email":"test@example.com"}'

# Check Supabase connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"

# View edge function source (to verify deployment)
supabase functions download send-admin-invite
```

---

## 📝 Verification Checklist

```bash
# 1. Verify secrets are set
supabase secrets list
# Should show: RESEND_API_KEY, EMAIL_FROM

# 2. Verify edge function is deployed
supabase functions list
# Should show: send-admin-invite with recent timestamp

# 3. Run diagnostics
npm run diagnose-email
# Should pass all checks

# 4. Test email sending
npm run test-password-reset admin@example.com
# Should send email successfully

# 5. Check logs for Resend usage
supabase functions logs send-admin-invite --tail
# Should show: "Email sent successfully via Resend"
# NOT: "Using Supabase managed email service"
```

---

## 🔐 Security Commands

```bash
# Rotate Resend API key (if compromised)
# 1. Create new key in Resend dashboard
# 2. Update secret
supabase secrets set RESEND_API_KEY="re_NewKeyHere"

# 3. Redeploy
supabase functions deploy send-admin-invite

# 4. Verify
supabase secrets list

# 5. Test
npm run test-password-reset test@example.com

# View audit logs (Supabase dashboard)
# Authentication → Logs
```

---

## 🌐 Environment-Specific Commands

### Local Development
```bash
# Use sandbox email for testing
supabase secrets set EMAIL_FROM="onboarding@resend.dev"
supabase secrets set ADMIN_RESET_REDIRECT_URL="http://localhost:5173/reset-password"
```

### Production
```bash
# Use verified domain
supabase secrets set EMAIL_FROM="noreply@ggknowledge.com"
supabase secrets set ADMIN_RESET_REDIRECT_URL="https://ggknowledge.com/reset-password"
```

---

## 📦 Package Scripts

```bash
# All available npm scripts
npm run dev                # Start development server
npm run build              # Build for production
npm run lint               # Lint code
npm run test               # Run tests
npm run preview            # Preview production build
npm run seed-test-users    # Seed test users
npm run diagnose-email     # Run email diagnostics (NEW)
npm run test-password-reset # Test password reset email (NEW)
```

---

## 🎯 One-Liner Setup

```bash
# Complete setup in one command (after getting API key)
supabase secrets set RESEND_API_KEY="re_YourKey" && \
supabase secrets set EMAIL_FROM="onboarding@resend.dev" && \
supabase functions deploy send-admin-invite && \
npm run diagnose-email
```

---

## 🔗 Useful URLs

### Resend
- Dashboard: https://resend.com/dashboard
- API Keys: https://resend.com/api-keys
- Logs: https://resend.com/logs
- Domains: https://resend.com/domains
- Docs: https://resend.com/docs

### Supabase
- Dashboard: https://YOUR_PROJECT.supabase.co
- Edge Functions: https://YOUR_PROJECT.supabase.co/project/YOUR_PROJECT/functions
- Auth Config: https://YOUR_PROJECT.supabase.co/project/YOUR_PROJECT/auth/url-configuration

---

## 🆘 Emergency Rollback

```bash
# If something breaks, rollback to Supabase email
# 1. Remove Resend secrets
supabase secrets unset RESEND_API_KEY
supabase secrets unset EMAIL_FROM

# 2. Redeploy
supabase functions deploy send-admin-invite

# 3. Verify fallback
supabase functions logs send-admin-invite --tail
# Should show: "Using Supabase managed email service"

# Note: This restores original (slow) behavior
```

---

## 📱 Quick Actions

### Morning Routine
```bash
# Check overnight emails
supabase functions logs send-admin-invite | grep "Email sent"

# Check Resend dashboard
open https://resend.com/logs

# Check for errors
supabase functions logs send-admin-invite | grep -i error
```

### Deploy Day
```bash
# Pre-deployment checks
npm run build && \
npm run diagnose-email && \
npm run test-password-reset admin@example.com

# Deploy
supabase functions deploy send-admin-invite

# Post-deployment verification
supabase functions logs send-admin-invite --tail
```

### Troubleshooting Session
```bash
# Full diagnostic
npm run diagnose-email && \
supabase secrets list && \
supabase functions list && \
supabase functions logs send-admin-invite | tail -20
```

---

## 💾 Backup & Restore

### Backup Current Configuration
```bash
# Save secrets to file (secure this file!)
echo "RESEND_API_KEY=$(supabase secrets list | grep RESEND_API_KEY)" > .secrets.backup
echo "EMAIL_FROM=$(supabase secrets list | grep EMAIL_FROM)" >> .secrets.backup

# Save edge function
supabase functions download send-admin-invite

# Note: Add .secrets.backup to .gitignore!
```

### Restore Configuration
```bash
# Read from backup file
source .secrets.backup

# Restore secrets
supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
supabase secrets set EMAIL_FROM="$EMAIL_FROM"

# Redeploy
supabase functions deploy send-admin-invite
```

---

## 🎓 Learning Commands

```bash
# View edge function code
cat supabase/functions/send-admin-invite/index.ts | less

# View Resend integration (lines 77-176)
sed -n '77,176p' supabase/functions/send-admin-invite/index.ts

# View email template (lines 104-163)
sed -n '104,163p' supabase/functions/send-admin-invite/index.ts

# Count lines of code
wc -l supabase/functions/send-admin-invite/index.ts
```

---

## ⚡ Power User Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Password Reset Email Aliases
alias pr-diagnose='npm run diagnose-email'
alias pr-test='npm run test-password-reset'
alias pr-logs='supabase functions logs send-admin-invite --tail'
alias pr-deploy='supabase functions deploy send-admin-invite'
alias pr-secrets='supabase secrets list'

# Quick test with default admin email
alias pr-quick='npm run test-password-reset admin@ggknowledge.com'

# Full diagnostic suite
alias pr-full='npm run diagnose-email && npm run test-password-reset admin@ggknowledge.com && pr-logs'
```

Then use:
```bash
pr-diagnose  # Run diagnostics
pr-test user@example.com  # Test email
pr-logs  # Watch logs
pr-full  # Complete check
```

---

**Command Reference Version:** 1.0
**Last Updated:** 2024-12-10
**Print this:** Keep it handy for quick reference!

🎯 **Most Common Command:** `npm run diagnose-email`
