# Quick Test Guide - License Actions

## What Was Fixed
The `license_actions` table was missing from the database, causing all license action operations (EXPAND, EXTEND, RENEW) to fail. This has now been fixed.

## Quick Test Steps

### 1. EXPAND (Add More Licenses)
1. Go to **System Admin > License Management**
2. Expand a company to see its licenses
3. Click the **three dots (⋮)** on any license
4. Select **"Expand License"**
5. Enter additional quantity: `25`
6. Add notes (optional): `Adding capacity for new students`
7. Click **Save**

**Expected:** Success message, total quantity increases by 25

---

### 2. EXTEND (Push Out Expiration Date)
1. Click the **three dots (⋮)** on any license
2. Select **"Extend Validity"**
3. Choose new end date: `6 months from now`
4. Add notes (optional): `Extending trial period`
5. Click **Save**

**Expected:** Success message, end date updates to new date

---

### 3. RENEW (New Period)
1. Click the **three dots (⋮)** on any license
2. Select **"Renew License"**
3. Enter new total quantity: `100`
4. Choose new start date: `today`
5. Choose new end date: `1 year from today`
6. Add notes (optional): `Annual renewal`
7. Click **Save**

**Expected:** Success message, all fields update

---

## What to Check

✅ **Success Messages** - Should see green toast notification
✅ **License Updates** - Table refreshes with new values
✅ **No Errors** - Check browser console (F12) for errors
✅ **History Works** - If you view history, actions should appear

---

## If Something Fails

1. **Open Browser Console** (F12 > Console tab)
2. **Look for error logs** starting with:
   - "Inserting license action:"
   - "License action INSERT error:"
   - "License UPDATE error:"
3. **Take screenshot** of error
4. **Report** what you see

---

## Expected Console Logs (Success)

```
Inserting license action: { license_id: "...", action_type: "EXPAND", ... }
Updating license with: { total_quantity: 125 }
```

No error messages = Success! ✅

---

## Database Check (Optional)

If you have database access, verify table exists:

```sql
SELECT * FROM license_actions ORDER BY created_at DESC LIMIT 5;
```

Should show your recent actions.
