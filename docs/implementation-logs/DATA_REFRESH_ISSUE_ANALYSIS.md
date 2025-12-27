# Data Loss After Page Refresh

## Observed Behaviour
When an authenticated entity administrator refreshes any protected page, all organisation-level lists (schools, branches, students, licences, etc.) render empty. The only way to recover the data is to log out and sign back in.

## Root Cause
1. `useAccessControl` runs `checkSupabaseConnection()` before it fetches the scoped access record. If that connection probe throws **any** error, the hook assumes Supabase is offline and immediately swaps to the offline fallback scope (`companyId: "offline-mode"`).【F:src/hooks/useAccessControl.ts†L162-L173】
2. During a hard page refresh the very first Supabase request is often executed **before** the Auth session is recovered, so `checkSupabaseConnection()` receives an authentication/RLS error from `select('count')` against `public.users`. That error isn’t distinguished from a real connectivity failure, so the hook marks the app “offline”.【F:src/lib/supabase.ts†L129-L165】
3. The offline scope is stored in context and exposes a truthy `companyId` string (`"offline-mode"`). Downstream queries therefore continue to execute, but they now `eq('company_id', 'offline-mode')`, which never matches real rows. The UI shows empty datasets until the user forces a brand-new login and the scope is rebuilt with the real company id.【F:src/hooks/useAccessControl.ts†L71-L89】【F:src/app/entity-module/license-management/page.tsx†L84-L154】

## Why logging out/in fixes it
Signing out clears the offline scope. The subsequent login establishes a fresh Supabase session _before_ the access-control hook runs, so `checkSupabaseConnection()` succeeds and the correct company scope is cached again.

## Suggested Fix (high level)
* Treat authentication/RLS errors returned by `checkSupabaseConnection()` as “not connected yet” and retry instead of entering offline mode.
* Defer the connection probe until after Supabase restores the session, or ignore errors during the first few seconds after page load.
* Alternatively, make the offline fallback expose an empty/falsey `companyId` so downstream queries do not execute with the placeholder value.

