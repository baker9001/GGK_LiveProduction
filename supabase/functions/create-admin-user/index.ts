import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async (req) => {
  // NO AUTH CHECK - Accept all requests
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
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: body.email || `test${Date.now()}@example.com`,
      password: '12345678',
      email_confirm: true,
      user_metadata: { name: body.name || 'Test User' }
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: data.user,
        password: '12345678'
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
});