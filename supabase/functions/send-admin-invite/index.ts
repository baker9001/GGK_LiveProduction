// Edge Function: send-admin-invite
// Resends invitation emails to admin users (for password reset or re-invitation)
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

    // Check if user exists and their email verification status
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, email_verified, raw_user_meta_data')
      .eq('email', body.email.toLowerCase())
      .single()

    const isNewUser = userData && !userData.email_verified
    const emailType = isNewUser ? 'invite' : 'recovery'

    console.log(`Sending ${emailType} email to:`, body.email)

    // Generate the appropriate link type
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: emailType,
      email: body.email,
      options: {
        redirectTo
      }
    })

    if (linkError) {
      console.error('Link generation error:', linkError)
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if custom email provider (Resend) is configured
    if (Deno.env.get('RESEND_API_KEY')) {
      const emailSubject = isNewUser
        ? 'Welcome - Set Your Admin Password'
        : 'Reset Your Admin Password'

      const emailHeading = isNewUser
        ? 'Welcome to the Admin Portal'
        : 'Reset Your Password'

      const emailMessage = isNewUser
        ? 'Your admin account has been created. Please click the button below to set your password:'
        : 'You requested to reset your password. Click the button below to set a new password:'

      const buttonText = isNewUser
        ? 'Set Your Password'
        : 'Reset Your Password'

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: Deno.env.get('EMAIL_FROM') || 'noreply@ggknowledge.com',
          to: body.email,
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #8CC63F; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 5px 5px; }
                .button {
                  display: inline-block;
                  padding: 14px 28px;
                  background: #8CC63F;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                  font-weight: bold;
                }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .warning {
                  background: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 12px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${emailHeading}</h1>
                </div>
                <div class="content">
                  <h2>Hi ${body.name || 'Admin'},</h2>
                  <p>${emailMessage}</p>
                  <div style="text-align: center;">
                    <a href="${linkData.properties.action_link}" class="button">${buttonText}</a>
                  </div>
                  <div class="warning">
                    <strong>⏰ Important:</strong> This link will expire in 24 hours for security reasons.
                  </div>
                  ${body.personal_message ? `
                    <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 5px;">
                      <p style="margin: 0; color: #666; font-size: 14px;"><em>Personal note from your administrator:</em></p>
                      <p style="margin: 10px 0 0 0;">${body.personal_message}</p>
                    </div>
                  ` : ''}
                  <p>If you didn't request this, you can safely ignore this email.</p>
                  <p>Best regards,<br><strong>The GGK Learning Admin Team</strong></p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                  <p>© ${new Date().getFullYear()} GGK Learning. All rights reserved.</p>
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
        return new Response(
          JSON.stringify({ error: 'Failed to send email via Resend' }),
          { status: 500, headers: corsHeaders }
        )
      }

      console.log('Email sent successfully via Resend')
    } else {
      // Fall back to Supabase managed emails
      console.log('Using Supabase managed email service')

      if (isNewUser) {
        // For new users, use inviteUserByEmail
        const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          body.email,
          { redirectTo }
        )

        if (emailError) {
          console.error('Supabase invite email error:', emailError)
          return new Response(
            JSON.stringify({ error: emailError.message }),
            { status: 400, headers: corsHeaders }
          )
        }
      } else {
        // For existing users, use resetPasswordForEmail
        const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(
          body.email,
          { redirectTo }
        )

        if (emailError) {
          console.error('Supabase reset email error:', emailError)
          return new Response(
            JSON.stringify({ error: emailError.message }),
            { status: 400, headers: corsHeaders }
          )
        }
      }

      console.log(`${emailType} email sent successfully via Supabase`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewUser
          ? 'Invitation resent successfully'
          : 'Password reset email sent successfully'
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
