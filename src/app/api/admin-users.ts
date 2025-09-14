// /src/api/admin-users.ts (NEW FILE - Backend/Edge Function)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use server-side only
);

export async function createAdminUser(requestData: {
  email: string;
  password: string;
  name: string;
  role_id: string;
  status: string;
  created_by: string;
}) {
  try {
    // 1. Create user in Supabase Auth (server-side)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: false,
      user_metadata: {
        name: requestData.name,
        role: 'admin',
        created_by: requestData.created_by
      }
    });

    if (authError) throw authError;

    // 2. Create admin profile
    const { error: profileError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: authUser.user.id,
        name: requestData.name,
        email: requestData.email,
        role_id: requestData.role_id,
        status: requestData.status,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      // Rollback auth user creation
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    // 3. Send invitation email
    await sendInvitationEmail(requestData.email, requestData.password);

    return { success: true, user: authUser.user };
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}