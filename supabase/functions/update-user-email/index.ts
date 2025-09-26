// Edge Function: update-user-email
// Updates user email in Supabase Auth
// Path: supabase/functions/update-user-email/index.ts

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
    console.log('Email update request for user:', body.user_id, 'to:', body.new_email)

    // Validate required fields
    if (!body.user_id || !body.new_email) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          message: 'Both user_id and new_email are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(body.new_email)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format',
          message: 'Please provide a valid email address' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Normalize email to lowercase
    const normalizedEmail = body.new_email.toLowerCase().trim()

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

    // First verify the user exists and get current email
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      body.user_id
    )
    
    if (getUserError || !userData.user) {
      console.error('User not found:', getUserError)
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          message: 'The specified user does not exist in the authentication system' 
        }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if the new email is the same as current email
    if (userData.user.email?.toLowerCase() === normalizedEmail) {
      return new Response(
        JSON.stringify({ 
          error: 'Same email',
          message: 'The new email is the same as the current email' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if email is already in use by another user
    // We need to do a more targeted search
    const { data: { users: existingUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Adjust based on your user base size
    })
    
    if (!listError && existingUsers) {
      const emailInUse = existingUsers.some(
        user => user.email?.toLowerCase() === normalizedEmail && user.id !== body.user_id
      )

      if (emailInUse) {
        return new Response(
          JSON.stringify({ 
            error: 'Email already in use',
            message: 'This email address is already registered to another account' 
          }),
          { status: 409, headers: corsHeaders }
        )
      }
    }

    // Update email in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      body.user_id,
      {
        email: normalizedEmail,
        email_confirm: true, // Auto-confirm the email change
        user_metadata: {
          ...userData.user.user_metadata,
          email_updated_at: new Date().toISOString(),
          previous_email: userData.user.email
        }
      }
    )

    if (authError) {
      console.error('Auth email update error:', authError)
      
      // Specific error handling
      if (authError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Email already exists',
            message: 'This email is already registered to another account' 
          }),
          { status: 409, headers: corsHeaders }
        )
      }
      
      if (authError.message?.includes('not found')) {
        return new Response(
          JSON.stringify({ 
            error: 'User not found',
            message: 'User not found in authentication system' 
          }),
          { status: 404, headers: corsHeaders }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Email update failed',
          message: authError.message || 'Failed to update email in authentication system'
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          error: 'Update failed',
          message: 'Email update failed - no user data returned' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Email updated successfully for user:', authData.user.id)
    console.log('Old email:', userData.user.email)
    console.log('New email:', authData.user.email)

    // Optional: Send email notification to both old and new email addresses
    // You can implement this if you have an email service configured
    /*
    try {
      // Send notification to old email
      await sendEmailNotification(userData.user.email, 'email_changed', {
        new_email: normalizedEmail
      })
      
      // Send verification to new email
      await sendEmailNotification(normalizedEmail, 'verify_new_email', {
        old_email: userData.user.email
      })
    } catch (emailError) {
      console.warn('Could not send email notifications:', emailError)
      // Don't fail the request if email sending fails
    }
    */

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        email: authData.user.email,
        oldEmail: userData.user.email,
        message: 'Email updated successfully'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in update-user-email:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred while updating the email' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})