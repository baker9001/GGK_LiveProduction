// Edge Function: create-admin-user-auth
// This function creates users in Supabase Auth with admin privileges
// Path: supabase/functions/create-admin-user-auth/index.ts

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
    
    // Validate input
    if (!body.email || !body.name || !body.role_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, name, and role_id' 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize admin client with service role
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

    // Use provided password or generate secure one
    const password = body.password || (crypto.randomUUID() + 'Aa1!')

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: password,
      email_confirm: false, // Require email verification
      user_metadata: {
        name: body.name,
        role_id: body.role_id,
        created_at: new Date().toISOString()
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ 
          error: authError.message 
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          created_at: authUser.user.created_at
        }
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})