/**
 * File: /src/app/api/users/route.ts
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - bcryptjs
 *   - zod
 * 
 * Description: User management API with centralized authentication
 * 
 * Key Changes:
 *   - Password stored only in users table
 *   - Email verification required for all users
 *   - Unified user creation flow
 *   - Type-specific profiles created after main user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

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
const createUserSchema = z.object({
  email: z.string().email().transform(e => e.toLowerCase()),
  name: z.string().min(2).max(100),
  user_type: z.enum(['system', 'entity', 'teacher', 'student', 'parent']),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
  send_verification: z.boolean().default(true),
  
  // Type-specific fields
  role_id: z.string().uuid().optional(), // For system users
  company_id: z.string().uuid().optional(), // For entity/teacher/student
  position: z.string().optional(), // Entity users
  department: z.string().optional(), // Entity users
  teacher_code: z.string().optional(), // Teachers
  student_code: z.string().optional(), // Students
  grade_level: z.string().optional(), // Students
  parent_name: z.string().optional(), // Students
  student_ids: z.array(z.string().uuid()).optional() // Parents
});

// ===== HELPER FUNCTIONS =====
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = 'Temp';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '2024!';
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function generateUniqueCode(prefix: string): Promise<string> {
  const maxRetries = 10;
  
  for (let i = 0; i < maxRetries; i++) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${randomNum}`;
    
    // Check uniqueness based on prefix
    const table = prefix === 'STU' ? 'students' : 'teachers';
    const column = prefix === 'STU' ? 'student_code' : 'teacher_code';
    
    const { data } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq(column, code)
      .maybeSingle();
    
    if (!data) return code;
  }
  
  throw new Error(`Failed to generate unique ${prefix} code`);
}

async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  temporaryPassword?: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
  
  console.log(`
    ====================================
    VERIFICATION EMAIL
    ====================================
    To: ${email}
    Name: ${name}
    Verification URL: ${verificationUrl}
    ${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}
    ====================================
  `);
  
  // TODO: Implement actual email sending
  return true;
}

// ===== CREATE USER ENDPOINT =====
export async function POST(request: NextRequest) {
  const transaction: any[] = [];
  
  try {
    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const data = validationResult.data;
    
    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single();
    
    if (existingUser) {
      return NextResponse.json({
        error: 'Email already exists'
      }, { status: 400 });
    }
    
    // Generate password if not provided
    const password = data.password || generatePassword();
    const isGeneratedPassword = !data.password;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Step 1: Create main user record
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: data.email,
        phone: data.phone,
        user_type: data.user_type,
        is_active: data.is_active,
        email_verified: false,
        password_hash: passwordHash,
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
        raw_user_meta_data: {
          name: data.name,
          created_by: 'admin' // TODO: Get from auth context
        }
      })
      .select()
      .single();
    
    if (userError) throw userError;
    transaction.push({ table: 'users', id: newUser.id });
    
    // Step 2: Create type-specific profile
    try {
      switch (data.user_type) {
        case 'system':
          if (!data.role_id) {
            throw new Error('Role ID required for system users');
          }
          
          const { error: adminError } = await supabaseAdmin
            .from('admin_users')
            .insert({
              id: newUser.id,
              name: data.name,
              email: data.email,
              role_id: data.role_id,
              status: data.is_active ? 'active' : 'inactive'
            });
          
          if (adminError) throw adminError;
          transaction.push({ table: 'admin_users', id: newUser.id });
          break;
          
        case 'entity':
          if (!data.company_id) {
            throw new Error('Company ID required for entity users');
          }
          
          const { error: entityError } = await supabaseAdmin
            .from('entity_users')
            .insert({
              user_id: newUser.id,
              company_id: data.company_id,
              position: data.position || 'Staff',
              department: data.department || 'General',
              is_company_admin: false
            });
          
          if (entityError) throw entityError;
          transaction.push({ table: 'entity_users', user_id: newUser.id });
          break;
          
        case 'teacher':
          if (!data.company_id) {
            throw new Error('Company ID required for teachers');
          }
          
          const teacherCode = data.teacher_code || await generateUniqueCode('TCH');
          
          const { error: teacherError } = await supabaseAdmin
            .from('teachers')
            .insert({
              user_id: newUser.id,
              teacher_code: teacherCode,
              company_id: data.company_id,
              status: data.is_active ? 'active' : 'inactive'
            });
          
          if (teacherError) throw teacherError;
          transaction.push({ table: 'teachers', user_id: newUser.id });
          break;
          
        case 'student':
          if (!data.company_id) {
            throw new Error('Company ID required for students');
          }
          
          const studentCode = data.student_code || await generateUniqueCode('STU');
          const enrollmentNumber = `ENR${new Date().getFullYear()}${Math.floor(10000 + Math.random() * 90000)}`;
          
          const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
              user_id: newUser.id,
              student_code: studentCode,
              enrollment_number: enrollmentNumber,
              grade_level: data.grade_level,
              parent_name: data.parent_name,
              company_id: data.company_id,
              status: data.is_active ? 'active' : 'inactive'
            });
          
          if (studentError) throw studentError;
          transaction.push({ table: 'students', user_id: newUser.id });
          break;
          
        case 'parent':
          const { error: parentError } = await supabaseAdmin
            .from('parents')
            .insert({
              user_id: newUser.id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              is_active: data.is_active
            });
          
          if (parentError) throw parentError;
          transaction.push({ table: 'parents', user_id: newUser.id });
          
          // Link to students if provided
          if (data.student_ids && data.student_ids.length > 0) {
            const { error: linkError } = await supabaseAdmin
              .from('parent_students')
              .insert(
                data.student_ids.map(studentId => ({
                  parent_id: newUser.id,
                  student_id: studentId,
                  relationship_type: 'parent',
                  is_primary: true
                }))
              );
            
            if (linkError) throw linkError;
          }
          break;
      }
    } catch (profileError) {
      // Rollback user creation on profile error
      await rollbackTransaction(transaction);
      throw profileError;
    }
    
    // Step 3: Create verification record
    const { error: verificationError } = await supabaseAdmin
      .from('email_verifications')
      .insert({
        user_id: newUser.id,
        email: data.email,
        token: verificationToken,
        expires_at: verificationExpiresAt.toISOString(),
        verification_type: 'signup'
      });
    
    if (verificationError) {
      await rollbackTransaction(transaction);
      throw verificationError;
    }
    
    // Step 4: Send verification email
    if (data.send_verification && data.is_active) {
      await sendVerificationEmail(
        data.email,
        data.name,
        verificationToken,
        isGeneratedPassword ? password : undefined
      );
    }
    
    // Step 5: Log creation
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: newUser.id,
        action: 'create_user',
        entity_type: 'user',
        entity_id: newUser.id,
        details: {
          user_type: data.user_type,
          created_by: 'admin', // TODO: Get from auth
          password_generated: isGeneratedPassword
        }
      });
    
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: data.email,
        name: data.name,
        user_type: data.user_type,
        temporary_password: isGeneratedPassword ? password : undefined
      },
      message: data.send_verification 
        ? `User created. Verification email sent to ${data.email}`
        : 'User created successfully'
    });
    
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create user'
    }, { status: 500 });
  }
}

// ===== UPDATE USER ENDPOINT =====
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updates } = body;
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID required'
      }, { status: 400 });
    }
    
    // Get existing user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }
    
    // Prepare updates for users table
    const userUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.email && updates.email !== user.email) {
      // Check if new email exists
      const { data: emailExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', updates.email.toLowerCase())
        .neq('id', userId)
        .single();
      
      if (emailExists) {
        return NextResponse.json({
          error: 'Email already exists'
        }, { status: 400 });
      }
      
      userUpdates.email = updates.email.toLowerCase();
      userUpdates.email_verified = false;
      
      // Generate new verification token
      const token = generateVerificationToken();
      userUpdates.verification_token = token;
      userUpdates.verification_sent_at = new Date().toISOString();
      
      // Create verification record
      await supabaseAdmin.from('email_verifications').insert({
        user_id: userId,
        email: updates.email.toLowerCase(),
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        verification_type: 'email_change'
      });
      
      // Send verification email
      await sendVerificationEmail(updates.email, updates.name || user.raw_user_meta_data?.name, token);
    }
    
    if (updates.name) {
      userUpdates.raw_user_meta_data = {
        ...user.raw_user_meta_data,
        name: updates.name
      };
    }
    
    if (updates.phone !== undefined) {
      userUpdates.phone = updates.phone;
    }
    
    if (typeof updates.is_active !== 'undefined') {
      userUpdates.is_active = updates.is_active;
    }
    
    // Update users table
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(userUpdates)
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    // Update type-specific table
    switch (user.user_type) {
      case 'system':
        if (updates.name || updates.email || updates.role_id) {
          await supabaseAdmin
            .from('admin_users')
            .update({
              ...(updates.name && { name: updates.name }),
              ...(updates.email && { email: updates.email }),
              ...(updates.role_id && { role_id: updates.role_id }),
              ...(typeof updates.is_active !== 'undefined' && {
                status: updates.is_active ? 'active' : 'inactive'
              })
            })
            .eq('id', userId);
        }
        break;
        
      case 'entity':
        if (updates.position || updates.department) {
          await supabaseAdmin
            .from('entity_users')
            .update({
              ...(updates.position && { position: updates.position }),
              ...(updates.department && { department: updates.department })
            })
            .eq('user_id', userId);
        }
        break;
        
      // Add other type-specific updates as needed
    }
    
    // Log update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'update_user',
        entity_type: 'user',
        entity_id: userId,
        details: {
          updates,
          updated_by: 'admin' // TODO: Get from auth
        }
      });
    
    return NextResponse.json({
      success: true,
      message: updates.email && updates.email !== user.email
        ? 'User updated. Verification email sent to new address.'
        : 'User updated successfully'
    });
    
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update user'
    }, { status: 500 });
  }
}

// ===== DELETE USER ENDPOINT =====
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID required'
      }, { status: 400 });
    }
    
    // Soft delete by default
    const hardDelete = searchParams.get('hard') === 'true';
    
    if (hardDelete) {
      // Hard delete - cascades to profile tables
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
    } else {
      // Soft delete
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
    }
    
    // Log deletion
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: hardDelete ? 'hard_delete_user' : 'soft_delete_user',
        entity_type: 'user',
        entity_id: userId,
        details: {
          deleted_by: 'admin' // TODO: Get from auth
        }
      });
    
    return NextResponse.json({
      success: true,
      message: hardDelete ? 'User permanently deleted' : 'User deactivated'
    });
    
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete user'
    }, { status: 500 });
  }
}

// ===== HELPER: Rollback Transaction =====
async function rollbackTransaction(transaction: any[]) {
  for (const item of transaction.reverse()) {
    try {
      if (item.table === 'users') {
        await supabaseAdmin.from('users').delete().eq('id', item.id);
      } else if (item.user_id) {
        await supabaseAdmin.from(item.table).delete().eq('user_id', item.user_id);
      } else if (item.id) {
        await supabaseAdmin.from(item.table).delete().eq('id', item.id);
      }
    } catch (error) {
      console.error(`Rollback error for ${item.table}:`, error);
    }
  }
}