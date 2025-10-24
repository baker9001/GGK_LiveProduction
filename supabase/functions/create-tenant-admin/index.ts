// Supabase Edge Function: create-tenant-admin
// Path: supabase/functions/create-tenant-admin/index.ts
// 
// This function creates tenant admin users in Supabase Auth
// using the service role key securely on the server side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json()
    console.log('Creating tenant admin for:', body.email)

    // Validate required fields
    if (!body.email || !body.password || !body.name) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, password, and name are required' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Initialize Supabase admin client with service role key
    // This key is only available in the Edge Function environment
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

    // Create user in Supabase Auth with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.password,
      email_confirm: false, // Require email verification
      user_metadata: {
        name: body.name,
        position: body.position || 'Administrator',
        company_id: body.company_id,
        company_name: body.company_name,
        phone: body.phone,
        created_by: body.created_by,
        role: 'entity_admin',
        created_at: new Date().toISOString()
      },
      app_metadata: {
        user_type: 'entity',
        is_company_admin: true,
        requires_password_change: body.is_generated_password || false
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      
      // Handle specific error cases
      if (authError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'This email is already registered in the authentication system' 
          }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create auth user: ' + authError.message 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          error: 'User creation failed - no user returned' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Send verification email using Supabase Auth
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email,
      {
        redirectTo: `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:3000'}/auth/callback`,
        data: {
          name: body.name,
          company_id: body.company_id,
          company_name: body.company_name
        }
      }
    )

    if (inviteError) {
      console.error('Failed to send invitation email:', inviteError)
      // Don't fail the request if email sending fails
      // The user can still be created and email can be resent later
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          created_at: authData.user.created_at,
          email_sent: !inviteError
        },
        message: inviteError 
          ? 'User created successfully. Please manually send the verification email.'
          : 'User created successfully. Verification email has been sent.'
      }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    )

  } catch (error) {
    console.error('Unexpected error in create-tenant-admin:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error occurred' 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})