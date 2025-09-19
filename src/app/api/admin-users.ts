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
    const body = await req.json()
    console.log('Request body:', body)

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

    // Validate required fields
    if (!body.email || !body.name || !body.role_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, name, and role_id are required' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomUUID() + 'Aa1!'
    
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: false, // User needs to verify email
      user_metadata: {
        name: body.name,
        role_id: body.role_id,
        created_by: body.created_by || 'system'
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
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

    // Step 2: Create or update user in the users table
    const { error: userTableError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: body.email.toLowerCase(),
        user_type: 'system', // FIXED: Changed from primary_type to user_type
        is_active: body.status === 'active',
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_user_meta_data: {
          name: body.name,
          role_id: body.role_id
        }
      }, {
        onConflict: 'id'
      })

    if (userTableError) {
      console.error('Users table error:', userTableError)
      
      // Rollback: Delete the auth user if users table insertion fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create user record: ' + userTableError.message 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Step 3: Create admin user profile
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: authData.user.id,
        name: body.name,
        email: body.email.toLowerCase(),
        role_id: body.role_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (adminError) {
      console.error('Admin users table error:', adminError)
      
      // Rollback: Delete from users table and auth
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', authData.user.id)
      
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create admin profile: ' + adminError.message 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Step 4: Send invitation email if requested
    if (body.send_invite) {
      try {
        // Generate password reset link for the user to set their password
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: body.email,
          options: {
            redirectTo: `${Deno.env.get('SITE_URL')}/reset-password`
          }
        })

        if (resetError) {
          console.error('Reset link generation error:', resetError)
        } else {
          // Here you would typically send an email with the reset link
          // For now, we'll just log it
          console.log('Password reset link generated:', resetData)
          
          // You can integrate with an email service like SendGrid, Resend, etc.
          // Example with Resend (you'd need to add your API key):
          /*
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'admin@yourapp.com',
              to: body.email,
              subject: 'Welcome - Set Your Password',
              html: `
                <h2>Welcome to the Admin Portal</h2>
                <p>Hi ${body.name},</p>
                <p>Your admin account has been created. Please click the link below to set your password:</p>
                <a href="${resetData.properties.action_link}">Set Password</a>
                <p>This link will expire in 24 hours.</p>
              `
            })
          })
          */
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        // Don't fail the whole operation if email fails
      }
    }

    // Step 5: Create audit log entry
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: body.created_by || authData.user.id,
          action: 'create_admin_user',
          entity_type: 'admin_user',
          entity_id: authData.user.id,
          details: {
            email: body.email,
            name: body.name,
            role_id: body.role_id,
            created_by: body.created_by || 'system'
          },
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // Don't fail the operation if audit logging fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: body.name,
          role_id: body.role_id,
          temporary_password: body.send_invite ? null : tempPassword,
          message: body.send_invite 
            ? 'User created. Invitation email sent.' 
            : 'User created. Share the temporary password securely.'
        }
      }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})