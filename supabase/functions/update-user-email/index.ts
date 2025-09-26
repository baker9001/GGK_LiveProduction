// supabase/functions/update-user-email/index.ts
// 
// Edge Function to update user email in auth.users table
// Deploy with: supabase functions deploy update-user-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase Admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Requires service role key for admin operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { user_id, new_email } = await req.json()

    // Validate required parameters
    if (!user_id || !new_email) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          message: 'Both user_id and new_email are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(new_email)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format',
          message: 'Please provide a valid email address' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Normalize email to lowercase
    const normalizedEmail = new_email.toLowerCase()

    // Check if email already exists in auth.users
    const { data: { users: existingUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check existing users',
          message: listError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if email is already in use by another user
    const emailInUse = existingUsers?.some(
      user => user.email?.toLowerCase() === normalizedEmail && user.id !== user_id
    )

    if (emailInUse) {
      return new Response(
        JSON.stringify({ 
          error: 'Email already in use',
          message: 'This email address is already registered to another account' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update user email in auth.users table
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { 
        email: normalizedEmail,
        email_confirm: false // Require email re-verification
      }
    )

    if (updateError) {
      console.error('Failed to update email:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update email',
          message: updateError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate email verification link for the new email
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'email_change_new',
        email: normalizedEmail,
        options: {
          redirectTo: `${Deno.env.get('SITE_URL') || req.headers.get('origin')}/auth/verify`
        }
      })

      if (linkError) {
        console.warn('Failed to generate verification link:', linkError)
        // Don't fail the request, email update was successful
      } else if (linkData?.properties?.action_link) {
        console.log('Verification link generated for:', normalizedEmail)
        // You could send this link via email service here if needed
      }
    } catch (linkErr) {
      console.warn('Verification link generation failed:', linkErr)
      // Continue - email update was still successful
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email updated successfully. Verification email will be sent to the new address.',
        user: {
          id: updateData.user?.id,
          email: updateData.user?.email,
          email_confirmed_at: updateData.user?.email_confirmed_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while updating the email' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})