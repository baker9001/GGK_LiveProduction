// Enhanced Edge Function: create-admin-user-complete
// Complete user creation with proper Supabase Auth integration
// Path: supabase/functions/create-admin-user-complete/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

interface CreateUserPayload {
  email: string;
  name: string;
  role_id: string;
  phone?: string;
  position?: string;
  department?: string;
  send_invitation?: boolean;
  personal_message?: string;
  created_by?: string;
  redirect_to?: string;
}

const DEFAULT_RESET_REDIRECT_URL =
  Deno.env.get('ADMIN_RESET_REDIRECT_URL') || 'https://ggknowledge.com/reset-password'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const body: CreateUserPayload = await req.json()
    console.log('Creating complete admin user for:', body.email)

    // Validate required fields
    if (!body.email || !body.name || !body.role_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, name, and role_id are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user already exists in auth.users
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers.users?.find(u => u.email === body.email.toLowerCase())
    
    if (existingAuthUser) {
      return new Response(
        JSON.stringify({ 
          error: 'A user with this email already exists in the authentication system' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if user exists in custom users table
    const { data: existingCustomUser } = await supabaseAdmin
      .from('users')
      .select('id, email, is_active')
      .eq('email', body.email.toLowerCase())
      .maybeSingle()

    if (existingCustomUser) {
      return new Response(
        JSON.stringify({ 
          error: `User with email ${body.email} already exists in the system${!existingCustomUser.is_active ? ' (inactive)' : ''}` 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Fetch role details for validation
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .eq('id', body.role_id)
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Invalid role selected' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Prepare user metadata for SYSTEM admin user
    const userMetadata = {
      name: body.name,
      role_id: body.role_id,
      role_name: roleData.name,
      phone: body.phone || null,
      position: body.position || null,
      department: body.department || null,
      created_by: body.created_by || 'system',
      created_at: new Date().toISOString(),
      user_type: 'system',  // CRITICAL: This is a SYSTEM admin, not entity admin
      requires_password_change: true,
      email_verification_required: true
    }

    // Step 1: Create user in Supabase Auth (invitation-based)
    // IMPORTANT: This creates a SYSTEM admin user, not an entity admin
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      email_confirm: false, // Require email verification
      user_metadata: userMetadata,
      app_metadata: {
        user_type: 'system',  // CRITICAL: Must be 'system' for system admins
        role_id: body.role_id,
        role_name: roleData.name,
        created_via: 'admin_panel'
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!authUser.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed - no user returned' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const userId = authUser.user.id
    console.log('Auth user created successfully:', userId)

    // Step 2: Create user in custom users table with user_type='system'
    // CRITICAL: System admins must have user_type='system' (NOT 'entity')
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId, // Use auth.users ID
        email: body.email.toLowerCase(),
        user_type: 'system',  // CRITICAL: Must be 'system' for system admin users
        is_active: true,
        email_verified: false, // Will be true after email confirmation
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        auth_user_id: userId, // Reference to auth.users
        auth_sync_status: 'completed',
        raw_user_meta_data: userMetadata,
        raw_app_meta_data: {
          provider: 'email',
          providers: ['email'],
          user_type: 'system',  // CRITICAL: Must be 'system'
          role_id: body.role_id
        }
      })

    if (usersError) {
      console.error('Users table error:', usersError)
      
      // Rollback: Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create user profile: ' + usersError.message 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Step 3: Create admin_users record (NOT entity_users)
    // CRITICAL: System admins go in admin_users table, NOT entity_users table
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId, // Same ID as auth.users and users (foreign key reference)
        name: body.name,
        role_id: body.role_id,
        can_manage_users: roleData.name === 'Super Admin', // Set based on role
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (adminError) {
      console.error('Admin users table error:', adminError)
      console.error('Failed to create record in admin_users table (NOT entity_users)')

      // Rollback: Delete from users table and auth
      await supabaseAdmin.from('users').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return new Response(
        JSON.stringify({
          error: 'Failed to create admin profile in admin_users table: ' + adminError.message
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Step 4: Create invitation tracking record
    let invitationStatusId: string | null = null
    try {
      const { data: inviteStatus, error: inviteStatusError } = await supabaseAdmin
        .from('invitation_status')
        .insert({
          user_id: userId,
          email: body.email.toLowerCase(),
          user_type: 'system',
          created_by: body.created_by || 'system',
          metadata: {
            role_id: body.role_id,
            role_name: roleData.name
          }
        })
        .select()
        .single()

      if (!inviteStatusError && inviteStatus) {
        invitationStatusId = inviteStatus.id
      }
    } catch (inviteStatusError) {
      console.error('Failed to create invitation status:', inviteStatusError)
    }

    // Step 5: Send invitation email if requested
    let invitationSent = false
    let invitationError: string | null = null
    const invitationRedirectUrl = body.redirect_to || DEFAULT_RESET_REDIRECT_URL

    if (body.send_invitation !== false) {
      try {
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          body.email.toLowerCase(),
          {
            data: {
              ...userMetadata,
              personal_message: body.personal_message
            },
            redirectTo: invitationRedirectUrl
          }
        )

        if (inviteError) {
          console.error('Invitation error:', inviteError)
          invitationError = inviteError.message

          // Update invitation status as failed
          if (invitationStatusId) {
            await supabaseAdmin
              .from('invitation_status')
              .update({
                failed_at: new Date().toISOString(),
                failed_reason: inviteError.message
              })
              .eq('id', invitationStatusId)
          }
        } else {
          invitationSent = true
          console.log('Invitation sent successfully')

          // Update invitation status as sent
          if (invitationStatusId) {
            await supabaseAdmin
              .from('invitation_status')
              .update({
                sent_at: new Date().toISOString()
              })
              .eq('id', invitationStatusId)
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        invitationError = emailError instanceof Error ? emailError.message : 'Unknown email error'

        // Update invitation status as failed
        if (invitationStatusId) {
          await supabaseAdmin
            .from('invitation_status')
            .update({
              failed_at: new Date().toISOString(),
              failed_reason: invitationError
            })
            .eq('id', invitationStatusId)
        }
      }
    }

    // Step 6: Create audit log entry
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: body.created_by || userId,
          action: 'create_admin_user',
          entity_type: 'admin_user',
          entity_id: userId,
          details: {
            email: body.email,
            name: body.name,
            role_id: body.role_id,
            role_name: roleData.name,
            created_by: body.created_by || 'system',
            invitation_sent: invitationSent,
            invitation_error: invitationError,
            invitation_status_id: invitationStatusId
          },
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // Don't fail the operation if audit logging fails
    }

    // Return success response with complete information
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: authUser.user.email,
          name: body.name,
          role_id: body.role_id,
          role_name: roleData.name,
          created_at: authUser.user.created_at,
          invitation_sent: invitationSent,
          invitation_error: invitationError,
          invitation_status_id: invitationStatusId,
          requires_email_verification: true
        },
        message: invitationSent
          ? 'Admin user created successfully. Invitation email sent with setup instructions.'
          : invitationError
          ? `Admin user created but invitation email failed: ${invitationError}`
          : 'Admin user created successfully. Please manually send invitation email.'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in create-admin-user-complete:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error occurred' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})