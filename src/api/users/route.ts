// /src/app/api/users/route.ts
// Enhanced Universal API for managing ALL user types with standardized email verification

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Create admin client with service role key
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

// ===== TYPE DEFINITIONS =====
type UserType = 'system' | 'student' | 'teacher' | 'entity' | 'parent';

interface CreateUserRequest {
  email: string;
  name: string;
  user_type: UserType;
  password?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
  send_verification?: boolean;
  
  // Type-specific fields
  role_id?: string;        // For system/admin users
  entity_id?: string;       // For entity users  
  company_id?: string;      // For entity/teacher/student users
  school_id?: string;       // For teacher/student users
  branch_id?: string;       // For teacher/student users
  class_id?: string;        // For students
  department_id?: string;   // For teachers
  student_ids?: string[];   // For parents
  
  // Additional profile data
  phone?: string;
  address?: string;
  date_of_birth?: string;
  profile_image?: string;
  position?: string;        // For entity users
  department?: string;      // For entity users
  employee_id?: string;     // For entity users
  teacher_code?: string;    // For teachers
  student_code?: string;    // For students
  enrollment_number?: string; // For students
  grade_level?: string;     // For students
  section?: string;         // For students
  parent_name?: string;     // For students
  parent_contact?: string;  // For students
  parent_email?: string;    // For students
}

interface UpdateUserRequest extends Partial<CreateUserRequest> {
  userId: string;
}

// Enhanced validation schemas with better error messages
const createUserSchema = z.object({
  email: z.string().email('Invalid email address').transform(email => email.toLowerCase()),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  user_type: z.enum(['system', 'student', 'teacher', 'entity', 'parent'], {
    errorMap: () => ({ message: 'Invalid user type' })
  }),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  is_active: z.boolean().optional().default(true),
  send_verification: z.boolean().optional().default(true),
  phone: z.string().regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number').optional().nullable(),
  company_id: z.string().uuid('Invalid company ID').optional(),
  school_id: z.string().uuid('Invalid school ID').optional(),
  branch_id: z.string().uuid('Invalid branch ID').optional(),
  role_id: z.string().uuid('Invalid role ID').optional(),
  student_ids: z.array(z.string().uuid()).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
}).refine((data) => {
  // Validate required fields based on user type
  if (data.user_type === 'system' && !data.role_id) {
    throw new Error('Role ID is required for system users');
  }
  if ((data.user_type === 'entity' || data.user_type === 'teacher' || data.user_type === 'student') && !data.company_id) {
    throw new Error('Company ID is required for this user type');
  }
  if (data.user_type === 'parent' && (!data.student_ids || data.student_ids.length === 0)) {
    throw new Error('At least one student ID is required for parent users');
  }
  return true;
});

// ===== HELPER FUNCTIONS =====

// Enhanced permission verification with caching
const permissionCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function verifyPermission(request: NextRequest): Promise<any> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Check cache
  const cached = permissionCache.get(token);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }
  
  try {
    // Get user from token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get user details from users table with role information
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        admin_users!inner(role_id, roles!inner(name)),
        entity_users!inner(is_company_admin, company_id)
      `)
      .eq('id', user.id)
      .single();

    if (!userData) {
      return null;
    }

    // Cache the result
    permissionCache.set(token, { user: userData, timestamp: Date.now() });

    // Check permissions based on user type
    if (userData.user_type === 'system') {
      return userData; // System users can manage all users
    }

    // Entity admins can manage their entity's users
    if (userData.user_type === 'entity' && userData.entity_users?.is_company_admin) {
      return { ...userData, company_id: userData.entity_users.company_id };
    }

    return null; // Other users don't have permission
  } catch (error) {
    console.error('Permission verification error:', error);
    return null;
  }
}

// Enhanced type-specific entry creation with better error handling
async function createTypeSpecificEntry(
  userId: string, 
  userType: UserType, 
  data: CreateUserRequest,
  transaction?: any
): Promise<void> {
  try {
    switch (userType) {
      case 'system':
        if (data.role_id) {
          let hashedPassword = null;
          if (data.password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(data.password, salt);
          }

          const { error } = await supabaseAdmin
            .from('admin_users')
            .insert({
              id: userId,
              name: data.name,
              email: data.email,
              role_id: data.role_id,
              status: data.is_active ? 'active' : 'inactive',
              password_hash: hashedPassword
            });
          
          if (error) throw error;
        }
        break;

      case 'student':
        const studentCode = data.student_code || await generateUniqueCode('STU');
        const enrollmentNumber = data.enrollment_number || await generateEnrollmentNumber();
        
        const { error: studentError } = await supabaseAdmin
          .from('students')
          .insert({
            user_id: userId,
            student_code: studentCode,
            enrollment_number: enrollmentNumber,
            grade_level: data.grade_level,
            section: data.section,
            admission_date: new Date().toISOString().split('T')[0],
            parent_name: data.parent_name,
            parent_contact: data.parent_contact,
            parent_email: data.parent_email,
            company_id: data.company_id,
            school_id: data.school_id,
            branch_id: data.branch_id,
            status: data.is_active ? 'active' : 'inactive'
          });
        
        if (studentError) throw studentError;
        break;

      case 'teacher':
        const teacherCode = data.teacher_code || await generateUniqueCode('TCH');
        
        const { error: teacherError } = await supabaseAdmin
          .from('teachers')
          .insert({
            user_id: userId,
            teacher_code: teacherCode,
            company_id: data.company_id,
            school_id: data.school_id,
            branch_id: data.branch_id,
            department_id: data.department_id,
            hire_date: new Date().toISOString().split('T')[0],
            status: data.is_active ? 'active' : 'inactive'
          });
        
        if (teacherError) throw teacherError;
        break;

      case 'entity':
        const { error: entityError } = await supabaseAdmin
          .from('entity_users')
          .insert({
            user_id: userId,
            company_id: data.company_id || data.entity_id,
            position: data.position || 'Staff',
            department: data.department || 'General',
            employee_id: data.employee_id,
            hire_date: new Date().toISOString().split('T')[0],
            is_company_admin: data.metadata?.is_admin || false
          });
        
        if (entityError) throw entityError;
        break;

      case 'parent':
        const { error: parentError } = await supabaseAdmin
          .from('parents')
          .insert({
            user_id: userId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            is_active: data.is_active ?? true
          });
        
        if (parentError) throw parentError;

        // Link to students if provided
        if (data.student_ids && data.student_ids.length > 0) {
          const { error: linkError } = await supabaseAdmin
            .from('parent_students')
            .insert(
              data.student_ids.map(studentId => ({
                parent_id: userId,
                student_id: studentId,
                relationship_type: 'parent',
                is_primary: true
              }))
            );
          
          if (linkError) throw linkError;
        }
        break;
    }
  } catch (error) {
    console.error(`Error creating ${userType} entry:`, error);
    throw error;
  }
}

// Generate unique codes with retry logic
async function generateUniqueCode(prefix: string, maxRetries = 5): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const code = `${prefix}${randomNum}`;
    
    // Check if code exists
    const table = prefix === 'STU' ? 'students' : 'teachers';
    const column = prefix === 'STU' ? 'student_code' : 'teacher_code';
    
    const { data } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq(column, code)
      .maybeSingle();
    
    if (!data) return code;
  }
  
  throw new Error(`Failed to generate unique ${prefix} code after ${maxRetries} attempts`);
}

async function generateEnrollmentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `ENR${year}${randomNum}`;
}

// Enhanced email verification with template support
async function sendVerificationEmail(
  email: string, 
  name: string, 
  userType: UserType,
  password?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const redirectUrl = metadata?.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  
  try {
    if (password) {
      // For password users, send verification link
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectUrl,
        data: {
          name,
          user_type: userType,
          ...metadata
        }
      });
      
      if (error) throw error;
    } else {
      // For OAuth users, send magic link
      const { error } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/google-signup`,
          data: {
            name,
            user_type: userType,
            invite_type: 'google_signup',
            ...metadata
          }
        }
      });
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

// ===== API ENDPOINTS =====

// CREATE USER (Universal)
export async function POST(request: NextRequest) {
  try {
    // Verify permission
    const currentUser = await verifyPermission(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateUserRequest = await request.json();
    
    // Validate request
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const validatedData = validationResult.data;
    const { 
      email, 
      name, 
      user_type, 
      password, 
      is_active = true,
      send_verification = true,
      metadata = {},
      ...typeSpecificData 
    } = validatedData;

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Additional permission checks for entity admins
    if (currentUser.user_type === 'entity' && currentUser.company_id) {
      // Entity admins can only create users for their company
      if (typeSpecificData.company_id && typeSpecificData.company_id !== currentUser.company_id) {
        return NextResponse.json({ error: 'Cannot create users for other companies' }, { status: 403 });
      }
      // Auto-assign company_id for entity admins
      typeSpecificData.company_id = currentUser.company_id;
    }

    // Start transaction-like operation
    let authUserId: string;
    let authCreated = false;
    
    try {
      // 1. Create auth user if password provided
      if (password) {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: !send_verification, // Auto-confirm if not sending verification
          user_metadata: {
            name,
            full_name: name,
            user_type,
            ...metadata
          }
        });

        if (authError) {
          throw new Error(authError.message);
        }

        authUserId = authUser.user.id;
        authCreated = true;
      } else {
        // Generate ID for OAuth/passwordless user
        authUserId = crypto.randomUUID();
      }

      // 2. Insert into centralized users table
      const { error: usersError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUserId,
          email,
          phone: typeSpecificData.phone,
          user_type,
          is_active,
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          raw_user_meta_data: {
            name,
            full_name: name,
            user_type,
            ...metadata,
            ...typeSpecificData
          },
          raw_app_meta_data: {
            provider: password ? 'email' : 'pending',
            ...typeSpecificData
          }
        });

      if (usersError) throw usersError;

      // 3. Create type-specific table entry
      await createTypeSpecificEntry(authUserId, user_type, { 
        ...validatedData, 
        ...typeSpecificData 
      });

      // 4. Send verification email if active and requested
      if (is_active && send_verification) {
        await sendVerificationEmail(email, name, user_type, password, metadata);
      }

      // 5. Log the creation
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: currentUser.id,
          action: 'create_user',
          entity_type: 'user',
          entity_id: authUserId,
          details: {
            user_type,
            email,
            created_by: currentUser.email
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        });

      return NextResponse.json({ 
        success: true,
        user: {
          id: authUserId,
          email,
          name,
          user_type,
          is_active
        },
        message: is_active && send_verification
          ? `${user_type} user created and verification email sent` 
          : `${user_type} user created successfully`
      });

    } catch (error) {
      // Rollback on error
      if (authCreated) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId!);
      }
      if (authUserId!) {
        await supabaseAdmin.from('users').delete().eq('id', authUserId);
      }
      throw error;
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// UPDATE USER (Universal)
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await verifyPermission(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateUserRequest = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get current user data
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Permission checks for entity admins
    if (currentUser.user_type === 'entity' && currentUser.company_id) {
      // Check if user belongs to the same company
      const { data: targetUser } = await supabaseAdmin
        .from(getUserTypeTable(existingUser.user_type))
        .select('company_id')
        .eq('user_id', userId)
        .single();
      
      if (targetUser?.company_id !== currentUser.company_id) {
        return NextResponse.json({ error: 'Unauthorized to update this user' }, { status: 403 });
      }
    }

    const emailChanged = updates.email && existingUser.email !== updates.email.toLowerCase();

    // Check if new email already exists
    if (emailChanged) {
      const { data: emailExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', updates.email!.toLowerCase())
        .neq('id', userId)
        .single();

      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Update users table
    const usersUpdateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.email) usersUpdateData.email = updates.email.toLowerCase();
    if (updates.name) {
      usersUpdateData.raw_user_meta_data = {
        ...existingUser.raw_user_meta_data,
        name: updates.name,
        full_name: updates.name
      };
    }
    if (typeof updates.is_active !== 'undefined') {
      usersUpdateData.is_active = updates.is_active;
    }
    if (updates.phone !== undefined) usersUpdateData.phone = updates.phone;

    // Mark as unverified if email changed
    if (emailChanged) {
      usersUpdateData.email_verified = false;
    }

    const { error: usersError } = await supabaseAdmin
      .from('users')
      .update(usersUpdateData)
      .eq('id', userId);

    if (usersError) throw usersError;

    // Update type-specific table
    await updateTypeSpecificTable(existingUser.user_type, userId, updates);

    // Update Supabase Auth (if user exists there)
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUser?.user) {
        const authUpdateData: any = {};

        if (updates.email) authUpdateData.email = updates.email.toLowerCase();
        if (updates.name) {
          authUpdateData.user_metadata = {
            ...authUser.user.user_metadata,
            name: updates.name,
            full_name: updates.name
          };
        }
        if (emailChanged) authUpdateData.email_confirm = false;
        if (typeof updates.is_active !== 'undefined') {
          authUpdateData.banned = !updates.is_active;
        }

        await supabaseAdmin.auth.admin.updateUserById(userId, authUpdateData);

        // Send verification email if email changed
        if (emailChanged && updates.is_active !== false && updates.send_verification !== false) {
          await sendVerificationEmail(
            updates.email!, 
            updates.name || existingUser.raw_user_meta_data?.name, 
            existingUser.user_type
          );
        }
      }
    } catch (authError) {
      console.error('Auth update error (non-critical):', authError);
      // Don't fail the whole operation if auth update fails
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: currentUser.id,
        action: 'update_user',
        entity_type: 'user',
        entity_id: userId,
        details: {
          updates,
          updated_by: currentUser.email
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      });

    return NextResponse.json({ 
      success: true,
      message: emailChanged 
        ? 'User updated. Verification email sent to new address.' 
        : 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE USER (Universal)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await verifyPermission(request);
    if (!currentUser || currentUser.user_type !== 'system') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user type first
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('user_type, email')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete from type-specific table first (cascade will handle related records)
    await deleteFromTypeSpecificTable(user.user_type, userId);

    // Delete from users table
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    // Delete from auth (if exists)
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (error) {
      console.log('User not in auth system:', userId);
    }

    // Log the deletion
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: currentUser.id,
        action: 'delete_user',
        entity_type: 'user',
        entity_id: userId,
        details: {
          deleted_email: user.email,
          deleted_type: user.user_type,
          deleted_by: currentUser.email
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// GET USERS (with filters and pagination)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await verifyPermission(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const user_type = searchParams.get('user_type');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const is_active = searchParams.get('is_active');
    const company_id = searchParams.get('company_id');
    const school_id = searchParams.get('school_id');
    const branch_id = searchParams.get('branch_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (user_type) {
      query = query.eq('user_type', user_type);
    }
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (name) {
      query = query.or(`raw_user_meta_data->>name.ilike.%${name}%,raw_user_meta_data->>full_name.ilike.%${name}%`);
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    // For entity admins, filter by their company
    if (currentUser.user_type === 'entity' && currentUser.company_id) {
      // Get all users in the same company
      const companyUserIds = await getCompanyUserIds(currentUser.company_id);
      query = query.in('id', companyUserIds);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Enhance data with type-specific information
    const enhancedData = await enhanceUserData(data || []);

    return NextResponse.json({
      data: enhancedData,
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// RESEND VERIFICATION EMAIL
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await verifyPermission(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, user_type, raw_user_meta_data')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resend verification email
    await supabaseAdmin.auth.admin.inviteUserByEmail(user.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        name: user.raw_user_meta_data?.name,
        user_type: user.user_type
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Error resending verification:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send verification email' 
    }, { status: 500 });
  }
}

// ===== HELPER FUNCTIONS =====

function getUserTypeTable(userType: string): string {
  const tableMap: Record<string, string> = {
    'system': 'admin_users',
    'entity': 'entity_users',
    'teacher': 'teachers',
    'student': 'students',
    'parent': 'parents'
  };
  return tableMap[userType] || 'users';
}

async function getCompanyUserIds(companyId: string): Promise<string[]> {
  const userIds: string[] = [];
  
  // Get entity users
  const { data: entityUsers } = await supabaseAdmin
    .from('entity_users')
    .select('user_id')
    .eq('company_id', companyId);
  
  userIds.push(...(entityUsers?.map(u => u.user_id) || []));
  
  // Get teachers
  const { data: teachers } = await supabaseAdmin
    .from('teachers')
    .select('user_id')
    .eq('company_id', companyId);
  
  userIds.push(...(teachers?.map(t => t.user_id) || []));
  
  // Get students
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('user_id')
    .eq('company_id', companyId);
  
  userIds.push(...(students?.map(s => s.user_id) || []));
  
  return userIds;
}

async function enhanceUserData(users: any[]): Promise<any[]> {
  return Promise.all(
    users.map(async (user) => {
      let additionalInfo = {};
      
      // Get type-specific data
      switch (user.user_type) {
        case 'system':
          const { data: adminData } = await supabaseAdmin
            .from('admin_users')
            .select('roles(name)')
            .eq('id', user.id)
            .single();
          additionalInfo = { role: adminData?.roles?.name };
          break;
          
        case 'entity':
          const { data: entityData } = await supabaseAdmin
            .from('entity_users')
            .select('position, department, companies(name)')
            .eq('user_id', user.id)
            .single();
          additionalInfo = { 
            position: entityData?.position,
            department: entityData?.department,
            company: entityData?.companies?.name
          };
          break;
          
        case 'teacher':
          const { data: teacherData } = await supabaseAdmin
            .from('teachers')
            .select('teacher_code, companies(name), schools(name)')
            .eq('user_id', user.id)
            .single();
          additionalInfo = { 
            code: teacherData?.teacher_code,
            company: teacherData?.companies?.name,
            school: teacherData?.schools?.name
          };
          break;
          
        case 'student':
          const { data: studentData } = await supabaseAdmin
            .from('students')
            .select('student_code, grade_level, schools(name)')
            .eq('user_id', user.id)
            .single();
          additionalInfo = { 
            code: studentData?.student_code,
            grade: studentData?.grade_level,
            school: studentData?.schools?.name
          };
          break;
          
        case 'parent':
          const { data: parentData } = await supabaseAdmin
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', user.id);
          additionalInfo = { 
            children_count: parentData?.length || 0
          };
          break;
      }

      // Check email verification status from auth
      let authVerified = false;
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
        authVerified = authUser?.user?.email_confirmed_at !== null;
      } catch (error) {
        // User might not exist in auth
      }

      return {
        ...user,
        name: user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || 'Unknown',
        email_verified: user.email_verified || authVerified,
        ...additionalInfo
      };
    })
  );
}

async function updateTypeSpecificTable(userType: string, userId: string, updates: any): Promise<void> {
  const commonUpdates = {
    ...(updates.name && { name: updates.name }),
    ...(updates.email && { email: updates.email }),
    ...(typeof updates.is_active !== 'undefined' && { 
      is_active: updates.is_active,
      status: updates.is_active ? 'active' : 'inactive' 
    })
  };

  switch (userType) {
    case 'system':
      if (Object.keys(updates).some(key => ['role_id', 'name', 'email', 'is_active'].includes(key))) {
        await supabaseAdmin
          .from('admin_users')
          .update({
            ...commonUpdates,
            ...(updates.role_id && { role_id: updates.role_id })
          })
          .eq('id', userId);
      }
      break;

    case 'student':
      const studentUpdates = {
        ...(updates.grade_level && { grade_level: updates.grade_level }),
        ...(updates.section && { section: updates.section }),
        ...(updates.parent_name && { parent_name: updates.parent_name }),
        ...(updates.parent_contact && { parent_contact: updates.parent_contact }),
        ...(updates.parent_email && { parent_email: updates.parent_email }),
        ...(updates.school_id && { school_id: updates.school_id }),
        ...(updates.branch_id && { branch_id: updates.branch_id })
      };
      
      if (Object.keys(studentUpdates).length > 0) {
        await supabaseAdmin
          .from('students')
          .update(studentUpdates)
          .eq('user_id', userId);
      }
      break;

    case 'teacher':
      const teacherUpdates = {
        ...(updates.department_id && { department_id: updates.department_id }),
        ...(updates.school_id && { school_id: updates.school_id }),
        ...(updates.branch_id && { branch_id: updates.branch_id })
      };
      
      if (Object.keys(teacherUpdates).length > 0) {
        await supabaseAdmin
          .from('teachers')
          .update(teacherUpdates)
          .eq('user_id', userId);
      }
      break;

    case 'entity':
      const entityUpdates = {
        ...(updates.position && { position: updates.position }),
        ...(updates.department && { department: updates.department }),
        ...(updates.employee_id && { employee_id: updates.employee_id }),
        ...(updates.company_id && { company_id: updates.company_id })
      };
      
      if (Object.keys(entityUpdates).length > 0) {
        await supabaseAdmin
          .from('entity_users')
          .update(entityUpdates)
          .eq('user_id', userId);
      }
      break;

    case 'parent':
      if (updates.phone || updates.name || updates.email || typeof updates.is_active !== 'undefined') {
        await supabaseAdmin
          .from('parents')
          .update({
            ...commonUpdates,
            ...(updates.phone && { phone: updates.phone })
          })
          .eq('user_id', userId);
      }
      
      // Update student relationships if provided
      if (updates.student_ids) {
        // Remove old relationships
        await supabaseAdmin
          .from('parent_students')
          .delete()
          .eq('parent_id', userId);
        
        // Add new relationships
        if (updates.student_ids.length > 0) {
          await supabaseAdmin
            .from('parent_students')
            .insert(
              updates.student_ids.map((studentId: string) => ({
                parent_id: userId,
                student_id: studentId,
                relationship_type: 'parent',
                is_primary: true
              }))
            );
        }
      }
      break;
  }
}

async function deleteFromTypeSpecificTable(userType: string, userId: string): Promise<void> {
  switch (userType) {
    case 'system':
      await supabaseAdmin.from('admin_users').delete().eq('id', userId);
      break;
    case 'student':
      await supabaseAdmin.from('students').delete().eq('user_id', userId);
      break;
    case 'teacher':
      await supabaseAdmin.from('teachers').delete().eq('user_id', userId);
      break;
    case 'entity':
      await supabaseAdmin.from('entity_users').delete().eq('user_id', userId);
      break;
    case 'parent':
      await supabaseAdmin.from('parent_students').delete().eq('parent_id', userId);
      await supabaseAdmin.from('parents').delete().eq('user_id', userId);
      break;
  }
}