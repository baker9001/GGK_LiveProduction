// supabase/functions/create-user-simple/index.ts
// Fixed version with proper CORS handling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async (req) => {
  // Comprehensive CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Parse request body
    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.log('No body or invalid JSON');
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Simple test response
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Edge Function is working but environment variables are not configured',
          received: body,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // If we have Supabase credentials, try to create a user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if this is just a test
    if (body.test === true) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Test successful! Function is working.',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Create actual user
    const email = body.email || `test${Date.now()}@example.com`;
    const name = body.name || 'Test User';
    const password = body.password || '12345678';

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        user_type: 'system'
      }
    });

    if (authError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: authError.message,
          code: authError.code
        }),
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Try to get a role
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .limit(1)
      .single();

    // Add to admin_users if we have a role
    if (role) {
      await supabase
        .from('admin_users')
        .insert({
          id: authUser.user.id,
          name: name,
          role_id: role.id
        })
        .single();
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User created successfully!',
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          password: password
        }
      }),
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message
      }),
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    );
  }
});