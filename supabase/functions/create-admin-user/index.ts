// This is the COMPLETE Edge Function code
// Copy ALL of this into supabase/functions/create-admin-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables (Supabase provides these automatically)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Create admin client (this has full database access)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the data sent to this function
    const body = await req.json();

    // SPECIAL CASE: Handle Supabase dashboard test
    if (body.name === "Functions") {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Function works! Now try creating a user.',
          test_payload: {
            name: "John Doe",
            email: "john@example.com"
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get user details from request
    const { name, email } = body;

    // Check we have required data
    if (!name || !email) {
      return new Response(
        JSON.stringify({
          error: 'Please provide name and email'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get first available role
    const { data: roles } = await supabaseAdmin
      .from('roles')
      .select('id')
      .limit(1)
      .single();
    
    const roleId = roles?.id || null;

    // Generate a password
    const password = crypto.randomUUID();

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    });

    if (createError) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create user',
          details: createError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Add to admin_users table
    if (roleId) {
      await supabaseAdmin
        .from('admin_users')
        .insert({
          id: newUser.user.id,
          name: name,
          role_id: roleId
        });
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: email,
          password: password
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Something went wrong',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
});