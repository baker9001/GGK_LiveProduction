/**
 * File: /src/app/api/users/change-password/route.ts
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - bcryptjs
 *   - Next.js
 * 
 * Description: API endpoint for Super Admins to directly change user passwords
 * 
 * Features:
 *   - Direct password change without current password
 *   - Optional email notification
 *   - Password hashing with bcrypt
 *   - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Create admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Email sending function (implement with your email service)
async function sendPasswordChangeEmail(
  email: string,
  name: string,
  newPassword: string,
  changedBy: string
) {
  // TODO: Implement with your email service (SendGrid, AWS SES, etc.)
  console.log(`
    ====================================
    PASSWORD CHANGE NOTIFICATION
    ====================================
    To: ${email}
    Name: ${name}
    
    Your password has been changed by: ${changedBy}
    New Password: ${newPassword}
    
    Please log in with your new password and consider changing it.
    ====================================
  `);
  
  // Example with a hypothetical email service:
  // await emailService.send({
  //   to: email,
  //   subject: 'Your password has been changed',
  //   template: 'password-changed-by-admin',
  //   data: {
  //     userName: name,
  //     newPassword,
  //     changedBy,
  //     loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signin`
  //   }
  // });
  
  return true;
}

// Verify if user is a Super Admin
async function verifySuperAdmin(request: NextRequest): Promise<any> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);
    
    if (!authUser) return null;
    
    // Check if user is a system admin
    const { data: adminUser } = await supabaseAdmin
      .from('admin_users')
      .select(`
        id,
        name,
        email,
        roles (
          name
        )
      `)
      .eq('id', authUser.id)
      .single();
    
    if (!adminUser) return null;
    
    // Only Super Admins can change passwords
    if (adminUser.roles?.name !== 'Super Admin') {
      return null;
    }
    
    return adminUser;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify Super Admin
    const currentAdmin = await verifySuperAdmin(request);
    if (!currentAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized - Only Super Admins can change passwords' 
      }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, newPassword, requirePasswordChange, sendNotification, deactivateUser } = body;
    
    if (!userId || !newPassword) {
      return NextResponse.json({ 
        error: 'User ID and new password are required' 
      }, { status: 400 });
    }
    
    // Prevent admin from deactivating their own account
    if (deactivateUser && userId === currentAdmin.id) {
      return NextResponse.json({ 
        error: 'You cannot deactivate your own account for security reasons' 
      }, { status: 403 });
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters' 
      }, { status: 400 });
    }
    
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ 
        error: 'Password must contain uppercase, lowercase, and number' 
      }, { status: 400 });
    }
    
    // Get target user
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        user_type,
        raw_user_meta_data
      `)
      .eq('id', userId)
      .single();
    
    if (!targetUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update password in users table
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: passwordHash,
        password_updated_at: new Date().toISOString(),
        requires_password_change: requirePasswordChange || false,
        // Reset failed login attempts when admin changes password
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Password update error:', updateError);
      throw updateError;
    }
    
    // Update Supabase Auth password (if user exists in auth)
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );
      
      if (authError) {
        console.log('Auth update error (may not exist in auth):', authError);
      }
    } catch (authError) {
      // User might not exist in Supabase Auth, which is fine
      console.log('Supabase Auth update skipped:', authError);
    }
    
    // Log the password change
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: currentAdmin.id,
        action: 'admin_password_change',
        entity_type: 'user',
        entity_id: userId,
        details: {
          changed_by: currentAdmin.email,
          changed_by_name: currentAdmin.name,
          target_user: targetUser.email,
          notification_sent: sendNotification || false
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      });
    
    // Send notification email if requested
    if (sendNotification) {
      try {
        await sendPasswordChangeEmail(
          targetUser.email,
          targetUser.raw_user_meta_data?.name || targetUser.email,
          newPassword,
          currentAdmin.name
        );
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: sendNotification 
        ? 'Password changed and notification sent' 
        : 'Password changed successfully',
      password: newPassword // Return for display to admin
    });
    
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to change password' 
    }, { status: 500 });
  }
}

// Also handle POST for consistency
export async function POST(request: NextRequest) {
  return PUT(request);
}