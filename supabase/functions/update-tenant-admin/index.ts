// Supabase Edge Function: update-tenant-admin
// Path: supabase/functions/update-tenant-admin/index.ts
// 
// This function updates tenant admin users in both auth.users and custom tables

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
    console.log('Updating tenant admin:', body.user_id)

    // Validate required fields
    if (!body.user_id || !body.email) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: user_id and email are required' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Initialize Supabase admin client with service role key
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

    // Build the update object for auth.users
    const authUpdates: any = {}
    
    // Update email if changed
    if (body.email) {
      authUpdates.email = body.email.toLowerCase()
    }

    // Update user metadata
    if (body.name || body.position || body.phone) {
      // First get existing metadata
      const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(body.user_id)
      
      if (fetchError || !existingUser.user) {
        console.error('Failed to fetch user:', fetchError)
        return new Response(
          JSON.stringify({ 
            error: 'User not found in auth system' 
          }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        )
      }

      // Merge with existing metadata
      authUpdates.user_metadata = {
        ...existingUser.user.user_metadata,
        ...(body.name && { name: body.name }),
        ...(body.position && { position: body.position }),
        ...(body.phone && { phone: body.phone }),
        ...(body.company_id && { company_id: body.company_id }),
        ...(body.company_name && { company_name: body.company_name }),
        updated_at: new Date().toISOString(),
        updated_by: body.updated_by
      }
    }

    // Update password if provided
    if (body.password) {
      authUpdates.password = body.password
    }

    // Update email confirmation status if needed
    if (body.email_confirmed !== undefined) {
      authUpdates.email_confirm = body.email_confirmed
    }

    // Update the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      body.user_id,
      authUpdates
    )

    if (authError) {
      console.error('Auth update error:', authError)
      
      // Handle specific error cases
      if (authError.message?.includes('email already exists')) {
        return new Response(
          JSON.stringify({ 
            error: 'This email is already registered to another user' 
          }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update auth user: ' + authError.message 
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
          error: 'User update failed - no user returned' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    console.log('Auth user updated successfully:', authData.user.id)

    // If email was changed and needs reverification
    if (body.send_verification_email && body.email !== body.old_email) {
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
        console.error('Failed to send verification email:', inviteError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          email_confirmed_at: authData.user.email_confirmed_at,
          updated_at: authData.user.updated_at,
          user_metadata: authData.user.user_metadata
        },
        message: 'User updated successfully in auth system'
      }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    )

  } catch (error) {
    console.error('Unexpected error in update-tenant-admin:', error)
    
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