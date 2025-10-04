// Edge Function: create-admin-user-auth
// This function creates users in Supabase Auth and sends invitation emails
// Path: supabase/functions/create-admin-user-auth/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

const DEFAULT_RESET_REDIRECT_URL =
  Deno.env.get('ADMIN_RESET_REDIRECT_URL') || 'https://ggknowledge.com/reset-password'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Determine if this is for system admin or entity user
    const isSystemAdmin = body.role_id !== undefined
    const isEntityUser = body.admin_level !== undefined || body.user_type === 'teacher' || body.user_type === 'student'
    
    // Validate input based on user type
    if (isSystemAdmin) {
      if (!body.email || !body.name || !body.role_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields for system admin: email, name, and role_id' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }
    } else if (isEntityUser) {
      if (!body.email || !body.name) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: email and name' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Unable to determine user type from provided data' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize admin client with service role
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

    // Prepare user metadata based on type
    const userMetadata = {
      name: body.name,
      created_at: new Date().toISOString(),
      ...(isSystemAdmin && {
        role_id: body.role_id,
        user_type: 'system'
      }),
      ...(isEntityUser && {
        admin_level: body.admin_level,
        user_type: body.user_type || 'entity',
        company_id: body.company_id
      }),
      ...(body.user_metadata || {})
    }

    // Method 1: If password provided (for entity users who need immediate access)
    if (body.password) {
      // Create user with password
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email.toLowerCase(),
        password: body.password,
        email_confirm: false,
        user_metadata: userMetadata
      })

      if (authError) {
        console.error('Auth creation error:', authError)
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Send confirmation email (not invitation, since they have password)
      try {
        const { error: confirmError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: body.email.toLowerCase(),
          options: {
            redirectTo: body.redirect_to || `${Deno.env.get('PUBLIC_SITE_URL')}/login`
          }
        })

        if (confirmError) {
          console.error('Failed to generate confirmation link:', confirmError)
        }
      } catch (e) {
        console.error('Confirmation email error:', e)
      }

      return new Response(
        JSON.stringify({
          success: true,
          userId: authUser.user.id,
          message: 'User created successfully. Confirmation email sent.',
          user: {
            id: authUser.user.id,
            email: authUser.user.email,
            created_at: authUser.user.created_at
          }
        }),
        { status: 200, headers: corsHeaders }
      )
    } 
    // Method 2: No password - send invitation email (preferred for system admins)
    else {
      // Create user without password (they'll set it via invitation link)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email.toLowerCase(),
        email_confirm: false,
        user_metadata: userMetadata
      })

      if (authError) {
        console.error('Auth creation error:', authError)
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Send invitation email with magic link for password setup
      try {
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          body.email.toLowerCase(),
          {
            data: {
              ...userMetadata,
              personal_message: body.personal_message
            },
            redirectTo: body.redirect_to || DEFAULT_RESET_REDIRECT_URL
          }
        )

        if (inviteError) {
          console.error('Failed to send invitation:', inviteError)
          // Don't fail the whole operation, user is created
        }
      } catch (e) {
        console.error('Invitation email error:', e)
      }

      return new Response(
        JSON.stringify({
          success: true,
          userId: authUser.user.id,
          message: 'User created successfully. Invitation email sent with password setup link.',
          user: {
            id: authUser.user.id,
            email: authUser.user.email,
            created_at: authUser.user.created_at
          }
        }),
        { status: 200, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})