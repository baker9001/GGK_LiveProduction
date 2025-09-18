// Edge Function: create-entity-users-invite
// Creates entity users (admins) and sends invitation emails
// Path: supabase/functions/create-entity-users-invite/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Creating entity user invitation for:', body.email)

    // Validate required fields
    if (!body.email || !body.name) {
      return new Response(
        JSON.stringify({ 
          error: 'Email and name are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize admin client with service role key
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

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: body.email.toLowerCase()
      }
    })

    if (existingUser?.users && existingUser.users.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'A user with this email already exists in the authentication system' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Prepare user metadata
    const userMetadata = {
      name: body.name,
      admin_level: body.admin_level,
      company_id: body.company_id,
      company_name: body.company_name,
      phone: body.phone,
      created_at: new Date().toISOString(),
      created_by: body.created_by,
      ...(body.user_metadata || {})
    }

    // Create user WITHOUT password (invitation flow)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      email_confirm: false,
      user_metadata: userMetadata,
      app_metadata: {
        user_type: 'entity',
        is_admin: true,
        admin_level: body.admin_level,
        company_id: body.company_id
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      
      if (authError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'This email is already registered' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: authError.message 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!authUser.user) {
      return new Response(
        JSON.stringify({ 
          error: 'User creation failed - no user returned' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Auth user created successfully:', authUser.user.id)

    // Send invitation email
    if (body.send_invitation !== false) {
      try {
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          body.email,
          {
            data: userMetadata,
            redirectTo: body.redirect_to || `${Deno.env.get('PUBLIC_SITE_URL')}/auth/set-password`
          }
        )

        if (inviteError) {
          console.error('Failed to send invitation email:', inviteError)
          // Don't fail the whole operation if email fails
        } else {
          console.log('Invitation email sent successfully')
        }
      } catch (emailError) {
        console.error('Invitation email error:', emailError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: authUser.user.id,
        message: body.send_invitation !== false 
          ? 'Entity user created and invitation email sent successfully'
          : 'Entity user created successfully (invitation not sent)',
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          created_at: authUser.user.created_at
        }
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in create-entity-users-invite:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})