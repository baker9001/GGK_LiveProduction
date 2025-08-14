/**
 * File: /src/app/api/auth/route.ts
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - bcryptjs
 *   - zod
 *   - crypto
 * 
 * Description: Centralized authentication API endpoints
 * 
 * Endpoints:
 *   - POST /api/auth/login - User login
 *   - POST /api/auth/verify-email - Email verification
 *   - POST /api/auth/resend-verification - Resend verification email
 *   - POST /api/auth/forgot-password - Password reset request
 *   - POST /api/auth/reset-password - Reset password with token
 *   - POST /api/auth/change-password - Change password (authenticated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

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

// ===== VALIDATION SCHEMAS =====
const loginSchema = z.object({
  email: z.string().email('Invalid email').transform(e => e.toLowerCase()),
  password: z.string().min(1, 'Password required')
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').transform(e => e.toLowerCase())
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
});

// ===== HELPER FUNCTIONS =====
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function logLoginAttempt(
  email: string,
  success: boolean,
  ip?: string,
  userAgent?: string,
  failureReason?: string
) {
  await supabaseAdmin.from('login_attempts').insert({
    email,
    success,
    ip_address: ip,
    user_agent: userAgent,
    failure_reason: failureReason
  });
}

async function sendVerificationEmail(
  email: string,
  token: string,
  type: 'signup' | 'email_change' = 'signup'
) {
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
  
  console.log(`[EMAIL] Verification link for ${email}: ${verificationUrl}`);
  
  // TODO: Implement actual email sending
  // await emailService.send({
  //   to: email,
  //   subject: type === 'signup' ? 'Verify your email' : 'Confirm email change',
  //   template: 'email-verification',
  //   data: { verificationUrl, type }
  // });
  
  return true;
}

// ===== API ENDPOINTS =====

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Route to appropriate handler
  if (pathname.endsWith('/login')) {
    return handleLogin(request);
  } else if (pathname.endsWith('/verify-email')) {
    return handleVerifyEmail(request);
  } else if (pathname.endsWith('/resend-verification')) {
    return handleResendVerification(request);
  } else if (pathname.endsWith('/forgot-password')) {
    return handleForgotPassword(request);
  } else if (pathname.endsWith('/reset-password')) {
    return handleResetPassword(request);
  } else if (pathname.endsWith('/change-password')) {
    return handleChangePassword(request);
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// ===== LOGIN HANDLER =====
async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const { email, password } = validationResult.data;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    
    // Get user from database
    const { data: user } = await supabaseAdmin
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
      .eq('email', email)
      .single();
    
    // Check if user exists
    if (!user) {
      await logLoginAttempt(email, false, ip || undefined, userAgent || undefined, 'User not found');
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 });
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logLoginAttempt(email, false, ip || undefined, userAgent || undefined, 'Account locked');
      const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return NextResponse.json({
        error: `Account locked. Try again in ${minutesLeft} minutes.`
      }, { status: 403 });
    }
    
    // Check if account is active
    if (!user.is_active) {
      await logLoginAttempt(email, false, ip || undefined, userAgent || undefined, 'Account inactive');
      return NextResponse.json({
        error: 'Account is inactive. Please contact support.'
      }, { status: 403 });
    }
    
    // Check if email is verified
    if (!user.email_verified) {
      await logLoginAttempt(email, false, ip || undefined, userAgent || undefined, 'Email not verified');
      return NextResponse.json({
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        userId: user.id
      }, { status: 403 });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
    
    if (!isValidPassword) {
      // Increment failed attempts
      await supabaseAdmin.rpc('handle_failed_login', { p_user_id: user.id });
      await logLoginAttempt(email, false, ip || undefined, userAgent || undefined, 'Invalid password');
      
      // Check if account should be locked
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= 5) {
        return NextResponse.json({
          error: 'Too many failed attempts. Account locked for 30 minutes.'
        }, { status: 403 });
      }
      
      return NextResponse.json({
        error: 'Invalid credentials',
        attemptsLeft: 5 - attempts
      }, { status: 401 });
    }
    
    // Success - reset failed attempts and update last login
    await supabaseAdmin.rpc('handle_successful_login', { p_user_id: user.id });
    await logLoginAttempt(email, true, ip || undefined, userAgent || undefined);
    
    // Create session with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: {
        ...user.raw_user_meta_data,
        user_type: user.user_type,
        requires_password_change: user.requires_password_change
      }
    });
    
    // Get user profile with role information
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.raw_user_meta_data?.name,
        user_type: user.user_type,
        requires_password_change: user.requires_password_change,
        profile: profile?.profile_details
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      error: 'Login failed'
    }, { status: 500 });
  }
}

// ===== EMAIL VERIFICATION HANDLER =====
async function handleVerifyEmail(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = verifyEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid token'
      }, { status: 400 });
    }
    
    const { token } = validationResult.data;
    
    // Find verification record
    const { data: verification } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('verified_at', null)
      .single();
    
    if (!verification) {
      return NextResponse.json({
        error: 'Invalid or expired token'
      }, { status: 400 });
    }
    
    // Update user as verified
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        email_verified: true,
        verified_at: new Date().toISOString(),
        verification_token: null
      })
      .eq('id', verification.user_id);
    
    if (updateError) throw updateError;
    
    // Mark verification as used
    await supabaseAdmin
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);
    
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      error: 'Verification failed'
    }, { status: 500 });
  }
}

// ===== RESEND VERIFICATION HANDLER =====
async function handleResendVerification(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;
    
    if (!userId && !email) {
      return NextResponse.json({
        error: 'User ID or email required'
      }, { status: 400 });
    }
    
    // Get user
    const query = supabaseAdmin.from('users').select('*');
    if (userId) {
      query.eq('id', userId);
    } else {
      query.eq('email', email.toLowerCase());
    }
    
    const { data: user } = await query.single();
    
    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }
    
    if (user.email_verified) {
      return NextResponse.json({
        error: 'Email already verified'
      }, { status: 400 });
    }
    
    // Check for recent verification emails (rate limiting)
    const { data: recentVerifications } = await supabaseAdmin
      .from('email_verifications')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('verification_type', 'signup')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (recentVerifications && recentVerifications.length > 0) {
      return NextResponse.json({
        error: 'Please wait 5 minutes before requesting another verification email'
      }, { status: 429 });
    }
    
    // Generate new verification token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store verification record
    await supabaseAdmin.from('email_verifications').insert({
      user_id: user.id,
      email: user.email,
      token,
      expires_at: expiresAt.toISOString(),
      verification_type: 'signup'
    });
    
    // Update user record
    await supabaseAdmin
      .from('users')
      .update({
        verification_token: token,
        verification_sent_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    // Send email
    await sendVerificationEmail(user.email, token);
    
    return NextResponse.json({
      success: true,
      message: 'Verification email sent'
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({
      error: 'Failed to send verification email'
    }, { status: 500 });
  }
}

// ===== FORGOT PASSWORD HANDLER =====
async function handleForgotPassword(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid email'
      }, { status: 400 });
    }
    
    const { email } = validationResult.data;
    
    // Get user (don't reveal if user exists)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, is_active')
      .eq('email', email)
      .single();
    
    // Always return success to prevent email enumeration
    if (!user || !user.is_active) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a password reset email will be sent'
      });
    }
    
    // Generate reset token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store in email_verifications table
    await supabaseAdmin.from('email_verifications').insert({
      user_id: user.id,
      email: user.email,
      token,
      expires_at: expiresAt.toISOString(),
      verification_type: 'password_reset'
    });
    
    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
    console.log(`[EMAIL] Password reset link for ${email}: ${resetUrl}`);
    
    // TODO: Send actual email
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a password reset email will be sent'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      error: 'Failed to process request'
    }, { status: 500 });
  }
}

// ===== RESET PASSWORD HANDLER =====
async function handleResetPassword(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const { token, password } = validationResult.data;
    
    // Find valid reset token
    const { data: verification } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .eq('verification_type', 'password_reset')
      .gt('expires_at', new Date().toISOString())
      .is('verified_at', null)
      .single();
    
    if (!verification) {
      return NextResponse.json({
        error: 'Invalid or expired token'
      }, { status: 400 });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Update user password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: passwordHash,
        password_updated_at: new Date().toISOString(),
        requires_password_change: false,
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', verification.user_id);
    
    if (updateError) throw updateError;
    
    // Mark token as used
    await supabaseAdmin
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      error: 'Failed to reset password'
    }, { status: 500 });
  }
}

// ===== CHANGE PASSWORD HANDLER (Authenticated) =====
async function handleChangePassword(request: NextRequest) {
  try {
    // Get user from session/token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validationResult = changePasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const { currentPassword, newPassword } = validationResult.data;
    
    // Get user from database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, password_hash')
      .eq('id', authUser.id)
      .single();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash || '');
    if (!isValid) {
      return NextResponse.json({
        error: 'Current password is incorrect'
      }, { status: 400 });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: passwordHash,
        password_updated_at: new Date().toISOString(),
        requires_password_change: false
      })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({
      error: 'Failed to change password'
    }, { status: 500 });
  }
}

export { handleLogin as login };