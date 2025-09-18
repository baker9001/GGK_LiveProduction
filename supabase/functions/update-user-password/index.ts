// Edge Function: update-user-password
// Updates user password in Supabase Auth
// Path: supabase/functions/update-user-password/index.ts

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
    console.log('Updating password for user:', body.user_id)

    // Validate required fields
    if (!body.user_id || !body.new_password) {
      return new Response(
        JSON.stringify({ 
          error: 'User ID and new password are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate password strength
    if (body.new_password.length < 8) {
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 8 characters long' 
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

    // Update password in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      body.user_id,
      {
        password: body.new_password,
        user_metadata: {
          password_updated_at: new Date().toISOString(),
          requires_password_change: false
        }
      }
    )

    if (authError) {
      console.error('Auth password update error:', authError)
      
      if (authError.message?.includes('not found')) {
        return new Response(
          JSON.stringify({ 
            error: 'User not found in authentication system' 
          }),
          { status: 404, headers: corsHeaders }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: authError.message 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          error: 'Password update failed - no user returned' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Password updated successfully for:', authData.user.id)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        message: 'Password updated successfully'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in update-user-password:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})