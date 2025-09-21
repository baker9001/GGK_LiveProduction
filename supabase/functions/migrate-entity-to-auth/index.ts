// Edge Function: migrate-entity-to-auth
// Path: supabase/functions/migrate-entity-to-auth/index.ts
// Migrates entity_users who don't exist in auth.users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
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

    // Get all orphaned entity users if no specific email provided
    let usersToMigrate = []
    
    if (body.email) {
      // Migrate specific user
      usersToMigrate = [{ email: body.email, password: body.password }]
    } else {
      // Get all orphaned entity_users
      const { data: orphaned, error: queryError } = await supabaseAdmin
        .from('entity_users')
        .select(`
          id,
          user_id,
          email,
          name,
          position,
          company_id,
          is_company_admin,
          companies!entity_users_company_id_fkey(name)
        `)
        .limit(body.limit || 10)
      
      if (queryError) {
        throw new Error(`Failed to fetch orphaned users: ${queryError.message}`)
      }
      
      // Check which ones don't exist in auth.users
      for (const entity of orphaned || []) {
        const { data: authUser } = await supabaseAdmin.auth.admin.listUsers({
          filter: `email.eq.${entity.email}`
        })
        
        if (!authUser?.users?.length) {
          usersToMigrate.push({
            email: entity.email,
            user_id: entity.user_id,
            entity_user_id: entity.id,
            name: entity.name,
            position: entity.position,
            company_id: entity.company_id,
            company_name: entity.companies?.name,
            is_company_admin: entity.is_company_admin
          })
        }
      }
    }
    
    const results = []
    
    for (const user of usersToMigrate) {
      try {
        // Generate a secure temporary password if not provided
        const tempPassword = user.password || generateSecurePassword()
        
        // First check if user_id exists in users table
        let userId = user.user_id
        
        if (!userId) {
          // Create in users table first
          const { data: newUser, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
              email: user.email,
              user_type: 'entity',
              is_active: true,
              email_verified: false,
              password_hash: await hashPassword(tempPassword),
              raw_user_meta_data: {
                name: user.name,
                position: user.position,
                company_id: user.company_id,
                company_name: user.company_name,
                is_entity_admin: user.is_company_admin,
                requires_password_change: true,
                migration_source: 'entity_users'
              }
            })
            .select()
            .single()
          
          if (userError) {
            console.error('Error creating user record:', userError)
            results.push({
              email: user.email,
              success: false,
              error: userError.message
            })
            continue
          }
          
          userId = newUser.id
          
          // Update entity_user with the new user_id
          await supabaseAdmin
            .from('entity_users')
            .update({ 
              user_id: userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.entity_user_id)
        }
        
        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: false,
          user_metadata: {
            name: user.name,
            position: user.position,
            company_id: user.company_id,
            company_name: user.company_name,
            user_type: 'entity',
            is_entity_admin: user.is_company_admin,
            requires_password_change: true
          }
        })
        
        if (authError) {
          // Check if user already exists
          if (authError.message?.includes('already registered')) {
            // Update existing auth user
            const { data: updatedAuth, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              {
                user_metadata: {
                  name: user.name,
                  position: user.position,
                  company_id: user.company_id,
                  company_name: user.company_name
                }
              }
            )
            
            results.push({
              email: user.email,
              success: true,
              message: 'User already existed in auth, metadata updated',
              user_id: userId
            })
          } else {
            throw authError
          }
        } else {
          // Update users table with auth user id if different
          if (authUser.user.id !== userId) {
            // Need to sync IDs - update users table
            await supabaseAdmin
              .from('users')
              .update({ 
                id: authUser.user.id,
                auth_sync_status: 'completed',
                auth_sync_attempted_at: new Date().toISOString()
              })
              .eq('email', user.email)
          }
          
          // Send password reset email
          if (body.send_reset_email) {
            await supabaseAdmin.auth.resetPasswordForEmail(user.email, {
              redirectTo: `${Deno.env.get('PUBLIC_SITE_URL')}/reset-password`
            })
          }
          
          results.push({
            email: user.email,
            success: true,
            message: 'User migrated successfully',
            user_id: authUser.user.id,
            temporary_password: body.return_passwords ? tempPassword : undefined,
            reset_email_sent: body.send_reset_email || false
          })
        }
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error)
        results.push({
          email: user.email,
          success: false,
          error: error.message
        })
      }
    }
    
    // Log migration results
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'migrate_entity_users_to_auth',
        entity_type: 'batch_migration',
        details: {
          total_attempted: usersToMigrate.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results
        },
        created_at: new Date().toISOString()
      })
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration completed: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`,
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use proper bcrypt
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hash))
  return '$2a$10$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}