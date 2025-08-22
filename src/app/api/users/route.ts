/**
 * File: /src/app/api/users/route.ts
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - bcryptjs
 *   - zod
 * 
 * Description: User management API with centralized authentication and permission control
 * 
 * Key Changes:
 *   - Added permission middleware protection
 *   - Enhanced validation with Zod
 *   - Proper audit logging
 *   - Security checks for self-modification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import { withPermissions, PermissionRequirements } from '../../middleware/permissionMiddleware';

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
const updateAdminPayloadSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase()).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character')
    .optional(),
  admin_level: z.enum(['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']).optional(),
  is_active: z.boolean().optional(),
  permissions: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// ===== UPDATE USER ENDPOINT =====
export async function PUT(request: NextRequest) {
  return withPermissions(
    PermissionRequirements.MODIFY_ADMIN,
    async (req) => {
      try {
        const body = await req.json();
        const actorId = (req as any).userId; // From permission middleware
        
        // Validate payload
        const validatedData = updateAdminPayloadSchema.parse(body);
        const { userId, ...updates } = validatedData;

        // Security check: Prevent admin from deactivating their own account
        if (updates.is_active === false && userId === actorId) {
          return NextResponse.json({
            error: 'You cannot deactivate your own account'
          }, { status: 403 });
        }

        // Get existing user
        const { data: existingUser, error: fetchError } = await supabaseAdmin
          .from('entity_users')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError || !existingUser) {
          return NextResponse.json({
            error: 'User not found'
          }, { status: 404 });
        }

        // Check email uniqueness if email is being changed
        if (updates.email && updates.email !== existingUser.email) {
          const { data: emailExists } = await supabaseAdmin
            .from('entity_users')
            .select('id')
            .eq('email', updates.email)
            .eq('company_id', existingUser.company_id)
            .neq('id', userId)
            .maybeSingle();

          if (emailExists) {
            return NextResponse.json({
              error: 'Email already exists'
            }, { status: 400 });
          }
        }

        // Prepare update data
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (updates.name) updateData.name = updates.name;
        if (updates.email) updateData.email = updates.email;
        if (updates.admin_level) updateData.admin_level = updates.admin_level;
        if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
        if (updates.permissions) updateData.permissions = updates.permissions;
        if (updates.metadata) updateData.metadata = { ...existingUser.metadata, ...updates.metadata };

        // Update entity_users table
        const { error: updateError } = await supabaseAdmin
          .from('entity_users')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }

        // Update password if provided
        if (updates.password && existingUser.user_id) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(updates.password, salt);

          const { error: passwordError } = await supabaseAdmin
            .from('users')
            .update({
              password_hash: hashedPassword,
              password_updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.user_id);

          if (passwordError) {
            console.error('Failed to update password:', passwordError);
          }
        }

        // Update email in users table if changed
        if (updates.email && existingUser.user_id) {
          const { error: userEmailError } = await supabaseAdmin
            .from('users')
            .update({
              email: updates.email,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.user_id);

          if (userEmailError) {
            console.error('Failed to update email in users table:', userEmailError);
          }
        }

        // Log the update
        const changes: Record<string, any> = {};
        Object.keys(updateData).forEach(key => {
          if (key !== 'updated_at') {
            changes[key] = {
              old: existingUser[key],
              new: updateData[key]
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await supabaseAdmin
            .from('entity_admin_audit_log')
            .insert({
              company_id: existingUser.company_id,
              action_type: 'admin_modified',
              actor_id: actorId,
              target_id: userId,
              target_type: 'entity_user',
              changes,
              metadata: { source: 'api.users.PUT' }
            });
        }

        return NextResponse.json({
          success: true,
          message: 'User updated successfully'
        });

      } catch (error) {
        console.error('User update error:', error);
        
        if (error instanceof z.ZodError) {
          return NextResponse.json({
            error: 'Validation failed',
            details: error.errors
          }, { status: 400 });
        }

        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Failed to update user'
        }, { status: 500 });
      }
    }
  )(request);
}