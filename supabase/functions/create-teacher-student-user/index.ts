// Edge Function: create-teacher-student-user
// Creates teacher and student users in Supabase Auth with proper metadata
// Path: supabase/functions/create-teacher-student-user/index.ts

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
    console.log(`Creating ${body.user_type} user for:`, body.email)

    // Validate required fields
    if (!body.email || !body.name || !body.user_type) {
      return new Response(
        JSON.stringify({ 
          error: 'Email, name, and user_type are required' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate user type
    if (body.user_type !== 'teacher' && body.user_type !== 'student') {
      return new Response(
        JSON.stringify({ 
          error: 'This endpoint only handles teacher and student users' 
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

    // Check if user already exists in auth.users
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: body.email.toLowerCase()
      }
    })

    // Check if user exists in public.users table
    const { data: existingPublicUser } = await supabaseAdmin
      .from('users')
      .select('id, email, user_type')
      .eq('email', body.email.toLowerCase())
      .single()
    
    // Check if user has existing teacher/student record
    let existingEntityRecord = null
    if (body.user_type === 'teacher') {
      const { data } = await supabaseAdmin
        .from('teachers')
        .select('id, teacher_code')
        .eq('email', body.email.toLowerCase())
        .single()
      existingEntityRecord = data
    } else if (body.user_type === 'student') {
      const { data } = await supabaseAdmin
        .from('students')
        .select('id, student_code')
        .eq('email', body.email.toLowerCase())
        .single()
      existingEntityRecord = data
    }

    // Determine the error message based on what exists
    if (existingAuthUsers?.users && existingAuthUsers.users.length > 0) {
      const authUser = existingAuthUsers.users[0]
      
      if (existingEntityRecord) {
        return new Response(
          JSON.stringify({ 
            error: `A ${body.user_type} with this email already exists (${body.user_type === 'teacher' ? 'Teacher Code' : 'Student Code'}: ${existingEntityRecord[body.user_type === 'teacher' ? 'teacher_code' : 'student_code']})`,
            details: {
              hasAuthAccount: true,
              hasPublicRecord: !!existingPublicUser,
              hasEntityRecord: true,
              existingUserType: existingPublicUser?.user_type
            }
          }),
          { status: 409, headers: corsHeaders }
        )
      }
      
      if (existingPublicUser) {
        return new Response(
          JSON.stringify({ 
            error: `This email is already registered as a ${existingPublicUser.user_type}. Each user can only have one role.`,
            details: {
              hasAuthAccount: true,
              hasPublicRecord: true,
              hasEntityRecord: false,
              existingUserType: existingPublicUser.user_type
            }
          }),
          { status: 409, headers: corsHeaders }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'This email is already registered in the authentication system',
          details: {
            hasAuthAccount: true,
            hasPublicRecord: false,
            hasEntityRecord: false
          }
        }),
        { status: 409, headers: corsHeaders }
      )
    }

    if (existingPublicUser) {
      return new Response(
        JSON.stringify({ 
          error: `A user with this email exists in the database but not in authentication. This may be a legacy or corrupted account. Please contact support.`,
          details: {
            hasAuthAccount: false,
            hasPublicRecord: true,
            hasEntityRecord: !!existingEntityRecord,
            existingUserType: existingPublicUser.user_type
          }
        }),
        { status: 409, headers: corsHeaders }
      )
    }

    // Prepare user metadata based on user type
    const userMetadata = {
      name: body.name,
      company_id: body.company_id,
      user_type: body.user_type,
      phone: body.phone,
      created_at: new Date().toISOString(),
      created_by: body.created_by,
      ...(body.user_metadata || {})
    }

    // Add type-specific metadata
    if (body.user_type === 'teacher') {
      userMetadata.teacher_code = body.teacher_code
      userMetadata.specialization = body.specialization || []
      userMetadata.qualification = body.qualification
      userMetadata.school_id = body.school_id
      userMetadata.branch_id = body.branch_id
    } else if (body.user_type === 'student') {
      userMetadata.student_code = body.student_code
      userMetadata.enrollment_number = body.enrollment_number
      userMetadata.grade_level = body.grade_level
      userMetadata.section = body.section
      userMetadata.parent_name = body.parent_name
      userMetadata.parent_contact = body.parent_contact
      userMetadata.parent_email = body.parent_email
      userMetadata.school_id = body.school_id
      userMetadata.branch_id = body.branch_id
    }

    // Determine the correct user_type value for the database
    const dbUserType = body.user_type === 'teacher' ? 'teacher' : 'student'

    // Create user in auth.users with password or invitation
    let authUser
    let authError
    let temporaryPassword = null

    if (body.password) {
      // Create with password
      console.log('Creating user with password')
      
      const result = await supabaseAdmin.auth.admin.createUser({
        email: body.email.toLowerCase(),
        password: body.password,
        email_confirm: false,
        user_metadata: userMetadata,
        app_metadata: {
          user_type: dbUserType,
          is_admin: false,
          company_id: body.company_id
        }
      })
      
      authUser = result.data
      authError = result.error
    } else {
      // Create without password (invitation flow)
      console.log('Creating user with invitation flow')
      
      // Generate a temporary password for initial creation
      temporaryPassword = generateTemporaryPassword()
      
      const result = await supabaseAdmin.auth.admin.createUser({
        email: body.email.toLowerCase(),
        password: temporaryPassword,
        email_confirm: false,
        user_metadata: {
          ...userMetadata,
          requires_password_change: true,
          temporary_password: true
        },
        app_metadata: {
          user_type: dbUserType,
          is_admin: false,
          company_id: body.company_id
        }
      })
      
      authUser = result.data
      authError = result.error
    }

    if (authError) {
      console.error('Auth creation error:', authError)
      
      if (authError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'This email is already registered' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: authError.message 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!authUser.user) {
      return new Response(
        JSON.stringify({ 
          error: 'User creation failed - no user returned' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`${body.user_type} auth user created successfully:`, authUser.user.id)

    // Send invitation email if needed
    if (body.send_invitation !== false && !body.password) {
      try {
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          body.email,
          {
            data: userMetadata,
            redirectTo: body.redirect_to || `${Deno.env.get('PUBLIC_SITE_URL')}/auth/set-password`
          }
        )

        if (inviteError) {
          console.error('Failed to send invitation email:', inviteError)
          // Don't fail the whole operation if email fails
        } else {
          console.log('Invitation email sent successfully')
        }
      } catch (emailError) {
        console.error('Invitation email error:', emailError)
      }
    }

    // Return success response
    const response = {
      success: true,
      userId: authUser.user.id,
      message: body.send_invitation !== false && !body.password
        ? `${body.user_type} created and invitation email sent successfully`
        : `${body.user_type} created successfully`,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at
      }
    }

    // Include temporary password if generated (for display to admin)
    if (temporaryPassword && body.return_password) {
      response.temporaryPassword = temporaryPassword
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error in create-teacher-student-user:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})

// Helper function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const length = 12
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  let password = ''
  
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + special
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}