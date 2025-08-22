import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    // Check if dev user exists in users table
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        password_hash,
        user_type,
        is_active,
        raw_user_meta_data
      `)
      .eq('email', email)
      .eq('user_type', 'system')
      .maybeSingle();

    if (queryError) {
      throw new Error('Failed to check dev user');
    }

    if (!user) {
      // Create dev user if it doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('dev_password', salt);

      // Get SSA role ID
      const { data: ssaRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Super Admin')
        .single();

      if (roleError || !ssaRole) {
        throw new Error('Super Admin role not found');
      }

      // First create user in users table
      const { data: newUser, error: userInsertError } = await supabase
        .from('users')
        .insert([{
          email: email,
          password_hash: hashedPassword,
          user_type: 'system',
          is_active: true,
          email_verified: true,
          raw_user_meta_data: { name: name }
        }])
        .select(`
          id,
          email,
          user_type,
          raw_user_meta_data
        `)
        .single();

      if (userInsertError) throw userInsertError;

      // Then create admin_users entry
      const { error: adminInsertError } = await supabase
        .from('admin_users')
        .insert([{
          id: newUser.id,
          name: name,
          email: email,
          role_id: ssaRole.id,
          status: 'active'
        }]);

      if (adminInsertError) throw adminInsertError;

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          name: name,
          email: newUser.email,
          role: 'SSA',
          userType: 'system'
        },
        message: 'Dev user created and logged in successfully'
      });
    } else {
      // Get admin user details for existing user
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('roles!inner(name)')
        .eq('id', user.id)
        .single();

      const roleMapping: Record<string, string> = {
        'Super Admin': 'SSA',
        'Support Admin': 'SUPPORT',
        'Viewer': 'VIEWER'
      };

      const userRole = roleMapping[adminUser?.roles?.name] || 'SSA';

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.raw_user_meta_data?.name || name,
          email: user.email,
          role: userRole,
          userType: 'system'
        },
        message: 'Dev login successful'
      });
    }
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Dev login failed'
      },
      { status: 500 }
    );
  }
}