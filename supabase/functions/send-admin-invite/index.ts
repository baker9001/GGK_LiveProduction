// Edge Function: send-admin-invite
// This function sends invitation emails to new admin users
// Path: supabase/functions/send-admin-invite/index.ts

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
    
    if (!body.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize admin client
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

    const redirectTo = body.redirect_to || DEFAULT_RESET_REDIRECT_URL

    // Generate password reset link (used for custom email providers)
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: body.email,
      options: {
        redirectTo
      }
    })

    if (resetError) {
      console.error('Reset link generation error:', resetError)
      return new Response(
        JSON.stringify({ error: resetError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    // When a custom email provider is configured, send the email manually.
    if (Deno.env.get('RESEND_API_KEY')) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: Deno.env.get('EMAIL_FROM') || 'noreply@yourapp.com',
          to: body.email,
          subject: 'Welcome - Set Your Admin Password',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #8CC63F; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { 
                  display: inline-block; 
                  padding: 12px 24px; 
                  background: #8CC63F; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to the Admin Portal</h1>
                </div>
                <div class="content">
                  <h2>Hi ${body.name || 'Admin'},</h2>
                  <p>Your admin account has been created. Please click the button below to set your password:</p>
                  <div style="text-align: center;">
                    <a href="${resetData.properties.action_link}" class="button">Set Your Password</a>
                  </div>
                  <p><strong>This link will expire in 24 hours for security reasons.</strong></p>
                  <p>If you didn't request this account, please ignore this email.</p>
                  <p>Best regards,<br>The Admin Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      })

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text()
        console.error('Email sending failed:', emailError)
      }
    } else {
      // Fall back to Supabase managed emails when no external provider is configured
      const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(body.email, {
        redirectTo
      })

      if (emailError) {
        console.error('Supabase reset email error:', emailError)
        return new Response(
          JSON.stringify({ error: emailError.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Still log the generated link for debugging purposes
      console.log('Password reset link (fallback email sent by Supabase):', resetData.properties.action_link)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})