/**
 * File: /src/app/api/auth/login/route.ts
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - bcryptjs
 *   - Next.js
 * 
 * Description: Login endpoint for centralized authentication
 * 
 * This file should be created at the exact path shown above
 * for Next.js App Router to handle POST requests to /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Initialize Supabase admin client
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

// Login handler
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({
        error: 'Invalid request format'
      }, { status: 400 });
    }
    
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    
    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        password_hash,
        user_type,
        is_active,
        email_verified,
        locked_until,
        failed_login_attempts,
        requires_password_change,
        raw_user_meta_data
      `)
      .eq('email', normalizedEmail)
      .single();
    
    // Check if user exists
    if (userError || !user) {
      // Log failed attempt
      await logLoginAttempt(normalizedEmail, false, ip, userAgent, 'User not found');
      
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 });
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logLoginAttempt(normalizedEmail, false, ip, userAgent, 'Account locked');
      
      const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return NextResponse.json({
        error: `Account locked. Try again in ${minutesLeft} minutes.`
      }, { status: 403 });
    }
    
    // Check if account is active
    if (!user.is_active) {
      await logLoginAttempt(normalizedEmail, false, ip, userAgent, 'Account inactive');
      
      return NextResponse.json({
        error: 'Account is inactive. Please contact support.'
      }, { status: 403 });
    }
    
    // Check if email is verified (skip for development)
    if (!user.email_verified && process.env.NODE_ENV === 'production') {
      await logLoginAttempt(normalizedEmail, false, ip, userAgent, 'Email not verified');
      
      return NextResponse.json({
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        userId: user.id
      }, { status: 403 });
    }
    
    // Verify password
    let isValidPassword = false;
    
    if (user.password_hash) {
      try {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } catch (bcryptError) {
        console.error('Bcrypt error:', bcryptError);
        return NextResponse.json({
          error: 'Authentication failed'
        }, { status: 500 });
      }
    }
    
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = newAttempts >= 5;
      
      await supabaseAdmin
        .from('users')
        .update({
          failed_login_attempts: newAttempts,
          locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
        })
        .eq('id', user.id);
      
      await logLoginAttempt(normalizedEmail, false, ip, userAgent, 'Invalid password');
      
      // Return appropriate error
      if (shouldLock) {
        return NextResponse.json({
          error: 'Too many failed attempts. Account locked for 30 minutes.'
        }, { status: 403 });
      }
      
      return NextResponse.json({
        error: 'Invalid credentials',
        attemptsLeft: 5 - newAttempts
      }, { status: 401 });
    }
    
    // Success - reset failed attempts and update last login
    await supabaseAdmin
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    await logLoginAttempt(normalizedEmail, true, ip, userAgent);
    
    // Get user profile details based on user type
    let profile = null;
    
    switch (user.user_type) {
      case 'system':
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_users')
          .select('role_id, status, roles(name)')
          .eq('id', user.id)
          .single();
        
        profile = adminProfile;
        break;
        
      case 'entity':
        const { data: entityProfile } = await supabaseAdmin
          .from('entity_users')
          .select('company_id, position, department, is_company_admin, companies(name)')
          .eq('user_id', user.id)
          .single();
        
        profile = entityProfile;
        break;
        
      case 'teacher':
        const { data: teacherProfile } = await supabaseAdmin
          .from('teachers')
          .select('teacher_code, company_id, school_id, status')
          .eq('user_id', user.id)
          .single();
        
        profile = teacherProfile;
        break;
        
      case 'student':
        const { data: studentProfile } = await supabaseAdmin
          .from('students')
          .select('student_code, enrollment_number, grade_level, section, school_id, status')
          .eq('user_id', user.id)
          .single();
        
        profile = studentProfile;
        break;
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.raw_user_meta_data?.name || user.email.split('@')[0],
        user_type: user.user_type,
        requires_password_change: user.requires_password_change || false,
        profile
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json({
      error: 'An error occurred during login',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Helper function to log login attempts
async function logLoginAttempt(
  email: string,
  success: boolean,
  ip?: string | null,
  userAgent?: string | null,
  failureReason?: string
) {
  try {
    await supabaseAdmin.from('login_attempts').insert({
      email,
      success,
      ip_address: ip,
      user_agent: userAgent,
      failure_reason: failureReason,
      attempted_at: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail login if logging fails
    console.error('Failed to log login attempt:', error);
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}