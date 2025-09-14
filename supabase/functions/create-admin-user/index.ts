import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const body = await req.json();
    
    // These environment variables are automatically provided by Supabase
    const url = Deno.env.get('SUPABASE_URL') || '';
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!url || !key) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          message: 'Environment variables not found'
        }),
        { status: 500, headers }
      );
    }
    
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: body.email || `test${Date.now()}@example.com`,
      password: '12345678',
      email_confirm: true,
      user_metadata: { 
        name: body.name || 'Test User'
      }
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers }
      );
    }

    // Try to add to admin_users table
    const { data: roles } = await supabase
      .from('roles')
      .select('id')
      .limit(1)
      .single();
    
    if (roles) {
      await supabase
        .from('admin_users')
        .insert({
          id: data.user.id,
          name: body.name || 'Test User',
          role_id: roles.id
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: data.user,
        password: '12345678',
        message: 'User created successfully!'
      }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Server error',
        message: err.message 
      }),
      { status: 500, headers }
    );
  }
});