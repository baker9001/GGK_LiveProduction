// Edge Function: update-user-password
// Updates user passwords using admin privileges
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
          success: false,
          error: 'User ID and new password are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate password complexity
    if (body.new_password.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false,
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

    // Get the current user making the request
    const authHeader = req.headers.get('Authorization')
    let requestingUserId = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      
      // Verify the token and get the user
      const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
      
      if (authError) {
        console.error('Auth error:', authError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid authentication token' 
          }),
          { status: 401, headers: corsHeaders }
        )
      }
      
      requestingUserId = requestingUser?.id
      console.log('Request made by user:', requestingUserId)
    }

    // Check if this is a self-update or admin update
    const isSelfUpdate = requestingUserId === body.user_id
    console.log('Is self update:', isSelfUpdate)

    if (!isSelfUpdate) {
      // For admin updates, verify the requesting user has permission
      // Check if the requesting user is an admin
      const { data: adminCheck } = await supabaseAdmin
        .from('entity_users')
        .select('admin_level')
        .eq('user_id', requestingUserId)
        .single()
      
      if (!adminCheck) {
        // Check if they're a system admin
        const { data: systemAdminCheck } = await supabaseAdmin
          .from('admin_users')
          .select('role_id')
          .eq('id', requestingUserId)
          .single()
        
        if (!systemAdminCheck) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'You do not have permission to update other users passwords' 
            }),
            { status: 403, headers: corsHeaders }
          )
        }
      }
      
      console.log('Admin user verified, proceeding with password update')
    }

    // First check if the user exists in auth.users
    const { data: { user: targetUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      body.user_id
    )

    if (getUserError || !targetUser) {
      console.error('User not found:', getUserError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'User not found in authentication system. This user may need to be re-created.' 
        }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('Found user to update:', targetUser.email)

    // Update the user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      body.user_id,
      {
        password: body.new_password
      }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to update password: ${updateError.message}` 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Password updated successfully for:', updatedUser.user?.email)

    // Update metadata in the public users table
    try {
      // First get the current metadata
      const { data: currentUserData } = await supabaseAdmin
        .from('users')
        .select('raw_user_meta_data')
        .eq('id', body.user_id)
        .single()
      
      // Update with merged metadata
      const { error: metadataError } = await supabaseAdmin
        .from('users')
        .update({
          raw_user_meta_data: {
            ...(currentUserData?.raw_user_meta_data || {}),
            password_updated_at: new Date().toISOString(),
            password_last_changed: new Date().toISOString(),
            requires_password_change: false,
            password_reset_needed: false,
            password_reset_pending: false
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', body.user_id)

      if (metadataError) {
        console.warn('Failed to update metadata:', metadataError)
        // Don't fail the whole operation if metadata update fails
      }
    } catch (metaError) {
      console.warn('Metadata update error:', metaError)
      // Don't fail the operation
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: isSelfUpdate 
          ? 'Your password has been updated successfully'
          : `Password updated successfully for user ${targetUser.email}`,
        user: {
          id: updatedUser.user?.id,
          email: updatedUser.user?.email
        }
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in update-user-password:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})