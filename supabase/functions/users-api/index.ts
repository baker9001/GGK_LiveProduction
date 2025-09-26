import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    // CREATE USER ENDPOINT
    if (req.method === 'POST' && path === 'users-api') {
      const { name, email, password, role_id, generate_password } = await req.json();
      // Generate secure password if needed
      let finalPassword = password;
      if (generate_password || !password) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        finalPassword = 'Temp';
        for(let i = 0; i < 8; i++){
          finalPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        finalPassword += '1A!';
      }
      console.log('Creating user:', email);
      // Step 1: Create in Supabase Auth (THIS IS THE KEY!)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: finalPassword,
        email_confirm: false,
        user_metadata: {
          name: name,
          full_name: name
        }
      });
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      const userId = authUser.user.id;
      console.log('Created auth user:', userId);
      // Step 2: Create in users table
      const { error: userError } = await supabaseAdmin.from('users').insert({
        id: userId,
        email: email.toLowerCase(),
        user_type: 'system',
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_user_meta_data: {
          name: name,
          full_name: name
        }
      });
      if (userError) {
        console.error('Users table error:', userError);
        // Rollback: delete from Auth
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw userError;
      }
      console.log('Created in users table');
      // Step 3: Create in admin_users table
      const { error: adminError } = await supabaseAdmin.from('admin_users').insert({
        id: userId,
        name: name,
        email: email.toLowerCase(),
        role_id: role_id,
        status: 'active',
        email_verified: false,
        created_at: new Date().toISOString(),
        can_manage_users: false
      });
      if (adminError) {
        console.error('Admin users table error:', adminError);
        // Rollback both
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw adminError;
      }
      console.log('Created in admin_users table');
      // Step 4: Send verification email
      try {
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
          redirectTo: 'http://localhost:5173/auth/setting-password',
          data: {
            name: name,
            initial_password: generate_password ? finalPassword : null
          }
        });
        if (inviteError) {
          console.error('Email invite error:', inviteError);
        } else {
          console.log('Verification email sent');
        }
      } catch (emailError) {
        console.error('Email error (non-critical):', emailError);
      }
      // Return success
      return new Response(JSON.stringify({
        success: true,
        userId: userId,
        temporary_password: finalPassword,
        message: 'User created successfully in Auth and Database!'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // PASSWORD SYNC ENDPOINT
    if (req.method === 'POST' && path === 'sync') {
      const { userId, email, password, name, emailVerified } = await req.json();
      console.log('Syncing password for:', email);
      // Update in Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: emailVerified !== false
      });
      if (authError) {
        console.error('Auth update error:', authError);
        throw authError;
      }
      // Update email_verified in users table if needed
      if (emailVerified) {
        await supabaseAdmin.from('users').update({
          email_verified: true,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
      }
      return new Response(JSON.stringify({
        success: true,
        message: 'Password synced successfully'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Unknown endpoint
    return new Response(JSON.stringify({
      error: 'Not found'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 404
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
