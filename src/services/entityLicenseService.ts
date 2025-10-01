/**
 * File: /src/services/entityLicenseService.ts
 * 
 * Entity License Management Service
 * Handles license operations for entity-level administrators
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/utils/queryHelpers
 * 
 * Features:
 *   - Scope-based license fetching
 *   - Student license assignment/revocation
 *   - License availability tracking
 *   - Integration with system admin license management
 */

import { supabase } from '@/lib/supabase';
import { queryActiveStudents } from '@/utils/queryHelpers';

export interface EntityLicense {
  id: string;
  company_id: string;
  company_name: string;
  region_name: string;
  program_name: string;
  provider_name: string;
  subject_name: string;
  total_quantity: number;
  used_quantity: number;
  available_quantity: number;
  start_date: string;
  end_date: string;
  status: string;
  is_expired: boolean;
  days_until_expiry: number;
  assigned_students?: StudentLicenseAssignment[];
}

export interface StudentLicenseAssignment {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  student_email: string;
  school_name: string;
  branch_name?: string;
  assigned_at: string;
  assigned_by: string;
  expires_at: string;
  is_active: boolean;
  status: string;
  activated_on?: string;
  valid_from_snapshot: string;
  valid_to_snapshot: string;
}

export interface LicenseAssignmentFilters {
  school_ids?: string[];
  branch_ids?: string[];
  grade_level?: string;
  search?: string;
}

export class EntityLicenseService {
  /**
   * Get licenses available to the admin's scope
   */
  static async getLicensesForScope(
    companyId: string,
    scopeFilters: { school_ids?: string[]; branch_ids?: string[] }
  ): Promise<EntityLicense[]> {
    try {
      const { data, error } = await supabase.rpc('get_available_licenses_for_scope', {
        p_company_id: companyId,
        p_school_ids: scopeFilters.school_ids || null,
        p_branch_ids: scopeFilters.branch_ids || null
      });

      if (error) throw error;

      return (data || []).map((license: any) => ({
        id: license.license_id,
        company_id: companyId,
        company_name: license.company_name,
        region_name: license.region_name,
        program_name: license.program_name,
        provider_name: license.provider_name,
        subject_name: license.subject_name,
        total_quantity: license.total_quantity,
        used_quantity: license.used_quantity,
        available_quantity: license.available_quantity,
        start_date: license.start_date,
        end_date: license.end_date,
        status: license.status,
        is_expired: license.is_expired,
        days_until_expiry: license.days_until_expiry
      }));
    } catch (error) {
      console.error('Error fetching licenses for scope:', error);
      throw error;
    }
  }

  /**
   * Get students assigned to a specific license
   */
  static async getStudentsForLicense(
    licenseId: string,
    companyId: string,
    scopeFilters: { school_ids?: string[]; branch_ids?: string[] }
  ): Promise<StudentLicenseAssignment[]> {
    try {
      console.log('Fetching students for license:', {
        licenseId,
        companyId,
        scopeFilters
      });

      let query = supabase
        .from('student_licenses')
        .select(`
          id,
          student_id,
          assigned_at,
          assigned_by,
          expires_at,
          is_active,
          students!inner (
            id,
            student_code,
            school_id,
            branch_id,
            company_id,
            users!inner (
              email,
              raw_user_meta_data
            ),
            schools (
              name
            ),
            branches (
              name
            )
          )
        `)
        .eq('license_id', licenseId)
        .eq('is_active', true);

      const { data, error } = await query;

      console.log('Query result:', {
        success: !error,
        recordCount: data?.length || 0,
        error: error?.message
      });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No student licenses found for license_id:', licenseId);
        return [];
      }

      const mappedData = (data || []).map((assignment: any) => {
        const student = assignment.students;
        const user = student?.users;

        return {
          id: assignment.id,
          student_id: assignment.student_id,
          student_name: user?.raw_user_meta_data?.name ||
                       user?.email?.split('@')[0] ||
                       'Unknown Student',
          student_code: student?.student_code || '',
          student_email: user?.email || '',
          school_name: student?.schools?.name || 'No School',
          branch_name: student?.branches?.name,
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by,
          expires_at: assignment.expires_at,
          is_active: assignment.is_active,
          status: assignment.is_active ? 'CONSUMED_ACTIVATED' : 'REVOKED',
          activated_on: assignment.is_active ? assignment.assigned_at : undefined,
          valid_from_snapshot: assignment.assigned_at,
          valid_to_snapshot: assignment.expires_at
        };
      });

      console.log('Mapped student licenses:', mappedData.length);
      return mappedData;

    } catch (error) {
      console.error('Error fetching students for license:', error);
      throw error;
    }
  }

  /**
   * Get available students for license assignment
   */
  static async getAvailableStudents(
    companyId: string,
    scopeFilters: { school_ids?: string[]; branch_ids?: string[] },
    filters: LicenseAssignmentFilters = {}
  ) {
    try {
      return await queryActiveStudents(companyId, {
        school_ids: scopeFilters.school_ids,
        branch_ids: scopeFilters.branch_ids,
        grade_level: filters.grade_level,
        search: filters.search
      });
    } catch (error) {
      console.error('Error fetching available students:', error);
      throw error;
    }
  }

  /**
   * Assign license to student
   */
  static async assignLicenseToStudent(
    licenseId: string,
    studentId: string,
    assignedBy: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('assign_license_to_student', {
        p_license_id: licenseId,
        p_student_id: studentId,
        p_assigned_by: assignedBy
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error assigning license to student:', error);
      return {
        success: false,
        message: 'Failed to assign license',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Revoke license from student
   */
  static async revokeLicenseFromStudent(
    licenseId: string,
    studentId: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('revoke_license_from_student', {
        p_license_id: licenseId,
        p_student_id: studentId
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error revoking license from student:', error);
      return {
        success: false,
        message: 'Failed to revoke license',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Bulk assign licenses to multiple students
   */
  static async bulkAssignLicenses(
    licenseId: string,
    studentIds: string[],
    assignedBy: string
  ): Promise<{
    successful: number;
    failed: number;
    errors: string[];
    assignmentIds: string[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      assignmentIds: [] as string[]
    };

    for (const studentId of studentIds) {
      try {
        const result = await this.assignLicenseToStudent(licenseId, studentId, assignedBy);
        if (result.success) {
          results.successful++;
          if (result.assignment_id) {
            results.assignmentIds.push(result.assignment_id);
          }

          // Send notification email asynchronously (don't wait for it)
          if (result.assignment_id) {
            this.sendLicenseNotification(result.assignment_id, 'assignment').catch(err => {
              console.warn('Failed to send license notification:', err);
            });
          }
        } else {
          results.failed++;
          results.errors.push(`Student ${studentId}: ${result.error || result.message}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Student ${studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Activate a student license
   */
  static async activateStudentLicense(
    licenseId: string,
    studentId?: string
  ): Promise<{ success: boolean; message: string; error?: string; activated_on?: string }> {
    try {
      const { data, error } = await supabase.rpc('activate_student_license', {
        p_license_id: licenseId,
        p_student_id: studentId || null
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error activating student license:', error);
      return {
        success: false,
        message: 'Failed to activate license',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send license notification email
   */
  static async sendLicenseNotification(
    studentLicenseId: string,
    notificationType: 'assignment' | 'expiry_warning' | 'activation_reminder'
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-license-notification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_license_id: studentLicenseId,
            notification_type: notificationType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send notification');
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      console.error('Error sending license notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get license usage statistics for admin dashboard
   */
  static async getLicenseUsageStats(
    companyId: string,
    scopeFilters: { school_ids?: string[]; branch_ids?: string[] }
  ) {
    try {
      const licenses = await this.getLicensesForScope(companyId, scopeFilters);
      
      const stats = {
        total_licenses: licenses.length,
        active_licenses: licenses.filter(l => !l.is_expired).length,
        expired_licenses: licenses.filter(l => l.is_expired).length,
        expiring_soon: licenses.filter(l => !l.is_expired && l.days_until_expiry <= 30).length,
        total_capacity: licenses.reduce((sum, l) => sum + l.total_quantity, 0),
        total_used: licenses.reduce((sum, l) => sum + l.used_quantity, 0),
        total_available: licenses.reduce((sum, l) => sum + l.available_quantity, 0),
        utilization_percentage: 0
      };

      if (stats.total_capacity > 0) {
        stats.utilization_percentage = Math.round((stats.total_used / stats.total_capacity) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error calculating license usage stats:', error);
      return {
        total_licenses: 0,
        active_licenses: 0,
        expired_licenses: 0,
        expiring_soon: 0,
        total_capacity: 0,
        total_used: 0,
        total_available: 0,
        utilization_percentage: 0
      };
    }
  }
}

export default EntityLicenseService;