// Edge Function: update-user-password
// Path: supabase/functions/update-user-password/index.ts
// COMPLETE VERSION - No truncation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Password update request for user:', body.user_id)

    // Validate required fields
    if (!body.user_id || !body.new_password) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          message: 'Both user_id and new_password are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate password length
    if (body.new_password.length < 8) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid password',
          message: 'Password must be at least 8 characters long' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(body.new_password)
    const hasLowerCase = /[a-z]/.test(body.new_password)
    const hasNumber = /[0-9]/.test(body.new_password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'Weak password',
          message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error',
          message: 'Server configuration error. Please contact support.' 
        }),
        { status: 500, headers: corsHeaders }
      )
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // First verify the user exists
    console.log('Verifying user exists:', body.user_id)
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      body.user_id
    )
    
    if (getUserError) {
      console.error('Error fetching user:', getUserError)
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          message: `Could not find user: ${getUserError.message}` 
        }),
        { status: 404, headers: corsHeaders }
      )
    }
    
    if (!userData.user) {
      console.error('User data is null')
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          message: 'The specified user does not exist in the authentication system' 
        }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('User found, updating password for:', userData.user.email)

    // Update password in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      body.user_id,
      {
        password: body.new_password,
        user_metadata: {
          ...userData.user.user_metadata,
          password_updated_at: new Date().toISOString(),
          requires_password_change: false,
          password_reset_needed: false
        }
      }
    )

    if (authError) {
      console.error('Auth password update error:', authError)
      
      // Specific error handling
      if (authError.message?.includes('not found')) {
        return new Response(
          JSON.stringify({ 
            error: 'User not found',
            message: 'User not found in authentication system' 
          }),
          { status: 404, headers: corsHeaders }
        )
      }
      
      if (authError.message?.includes('weak')) {
        return new Response(
          JSON.stringify({ 
            error: 'Weak password',
            message: 'Password does not meet security requirements' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }
      
      if (authError.message?.includes('same password')) {
        return new Response(
          JSON.stringify({ 
            error: 'Same password',
            message: 'New password cannot be the same as the current password' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }
      
      // Generic auth error
      return new Response(
        JSON.stringify({ 
          error: 'Password update failed',
          message: authError.message || 'Failed to update password in authentication system'
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if we got user data back
    if (!authData || !authData.user) {
      console.error('No user data returned after update')
      return new Response(
        JSON.stringify({ 
          error: 'Update failed',
          message: 'Password update failed - no user data returned' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Password updated successfully for user:', authData.user.id)
    console.log('User email:', authData.user.email)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        email: authData.user.email,
        message: 'Password updated successfully'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in update-user-password:', error)
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred while updating the password' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})