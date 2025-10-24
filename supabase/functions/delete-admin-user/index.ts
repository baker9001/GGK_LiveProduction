// Edge Function: delete-admin-user
// Responsible for fully removing an admin user from Supabase Auth and related tables

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

interface DeleteAdminPayload {
  user_id?: string
  email?: string
  reason?: string
  deleted_by?: string
  deleted_by_name?: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    const payload: DeleteAdminPayload = await req.json()

    if (!payload.user_id && !payload.email) {
      return new Response(
        JSON.stringify({ error: 'Missing user identifier. Provide user_id or email.' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment configuration for delete-admin-user function')
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing on server.' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header.' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Client used to validate the caller session
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: callerData, error: callerError } = await supabaseClient.auth.getUser()
    if (callerError || !callerData?.user) {
      console.error('Failed to validate caller session:', callerError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized request.' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Ensure caller is a system admin
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: adminRecord } = await supabaseAdmin
      .from('admin_users')
      .select('id, name')
      .eq('id', callerData.user.id)
      .maybeSingle()

    if (!adminRecord) {
      console.warn('Caller is not a system admin. Access denied:', callerData.user.id)
      return new Response(
        JSON.stringify({ error: 'Access denied. Only system admins can delete admin users.' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Determine user ID and email for deletion
    let userId = payload.user_id || null
    let targetEmail = payload.email?.toLowerCase().trim() || null

    if (!userId && targetEmail) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', targetEmail)
        .maybeSingle()

      if (existingUser) {
        userId = existingUser.id
        targetEmail = existingUser.email
      }
    }

    if (!userId && targetEmail) {
      // Try lookup in auth.users as a fallback
      const { data: authUsers, error: authLookupError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 100
      })

      if (authLookupError) {
        console.error('Failed to list auth users:', authLookupError)
      } else {
        const found = authUsers.users?.find((user) => user.email?.toLowerCase() === targetEmail)
        if (found) {
          userId = found.id
        }
      }
    }

    if (!userId && !targetEmail) {
      return new Response(
        JSON.stringify({ error: 'Could not determine user to delete.' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Fetch user details for logging before deletion
    const { data: adminUserRecord } = await supabaseAdmin
      .from('admin_users')
      .select('id, name, role_id')
      .eq('id', userId)
      .maybeSingle()

    const { data: profileRecord } = await supabaseAdmin
      .from('users')
      .select('id, email, raw_user_meta_data')
      .eq('id', userId)
      .maybeSingle()

    const emailForDeletion = targetEmail || profileRecord?.email || callerData.user.email

    // Delete invitations linked to this user/email
    if (emailForDeletion) {
      await supabaseAdmin
        .from('admin_invitations')
        .delete()
        .eq('email', emailForDeletion.toLowerCase())
    }

    if (userId) {
      await supabaseAdmin
        .from('admin_invitations')
        .delete()
        .eq('user_id', userId)
    }

    // Delete from admin_users and users tables
    if (userId) {
      await supabaseAdmin.from('admin_users').delete().eq('id', userId)
      await supabaseAdmin.from('users').delete().eq('id', userId)
    }

    // Delete from Supabase Auth (ignore error if user not found)
    if (userId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authDeleteError && authDeleteError.message !== 'User not found') {
        console.error('Failed to delete auth user:', authDeleteError)
      }
    }

    // Log the deletion in audit_logs
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: callerData.user.id,
          action: 'delete_admin_user',
          entity_type: 'admin_user',
          entity_id: userId,
          details: {
            email: emailForDeletion,
            deleted_by: payload.deleted_by || callerData.user.email,
            deleted_by_name: payload.deleted_by_name || adminRecord.name,
            reason: payload.reason || 'Removed via admin panel',
            previous_role_id: adminUserRecord?.role_id || null,
            previous_profile: profileRecord?.raw_user_meta_data || null
          }
        })
    } catch (auditError) {
      console.warn('Failed to log admin user deletion:', auditError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin user deleted successfully.',
        deleted_user_id: userId,
        deleted_email: emailForDeletion
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Unexpected error deleting admin user:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete admin user.' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
