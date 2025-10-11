import { supabase } from '../lib/supabase';

export interface EntityLicense {
  id: string;
  license_id: string;
  entity_id: string;
  entity_type: string;
  assigned_quantity: number;
  used_quantity: number;
  assigned_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface StudentLicenseAssignment {
  id: string;
  student_id: string;
  license_id: string;
  entity_license_id: string;
  assigned_date: string;
  expiration_date?: string;
  status: 'active' | 'expired' | 'revoked';
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    grade_level_id?: string;
    school_id?: string;
    branch_id?: string;
  };
}

export interface AvailableStudent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  grade_level_id?: string;
  school_id?: string;
  branch_id?: string;
  school_name?: string;
  branch_name?: string;
  grade_level_name?: string;
}

export const EntityLicenseService = {
  async getEntityLicenses(entityId: string): Promise<EntityLicense[]> {
    const { data, error } = await supabase
      .from('entity_licenses')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAvailableStudents(
    companyId: string,
    scopeFilters: any,
    searchTerm?: string,
    gradeFilter?: string,
    schoolFilter?: string
  ): Promise<AvailableStudent[]> {
    let query = supabase
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        email,
        grade_level_id,
        school_id,
        branch_id,
        schools:school_id(name),
        branches:branch_id(name),
        grade_levels:grade_level_id(name)
      `);

    if (scopeFilters?.company_id) {
      query = query.eq('company_id', scopeFilters.company_id);
    }

    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    if (gradeFilter && gradeFilter !== 'all') {
      query = query.eq('grade_level_id', gradeFilter);
    }

    if (schoolFilter && schoolFilter !== 'all') {
      query = query.eq('school_id', schoolFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((student: any) => ({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      grade_level_id: student.grade_level_id,
      school_id: student.school_id,
      branch_id: student.branch_id,
      school_name: student.schools?.name,
      branch_name: student.branches?.name,
      grade_level_name: student.grade_levels?.name
    }));
  },

  async getStudentsForLicense(
    licenseId: string,
    entityId: string
  ): Promise<StudentLicenseAssignment[]> {
    const { data, error } = await supabase
      .from('student_licenses')
      .select(`
        id,
        student_id,
        license_id,
        entity_license_id,
        assigned_date,
        expiration_date,
        status,
        students:student_id(
          id,
          first_name,
          last_name,
          email,
          grade_level_id,
          school_id,
          branch_id
        )
      `)
      .eq('license_id', licenseId)
      .order('assigned_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      student_id: item.student_id,
      license_id: item.license_id,
      entity_license_id: item.entity_license_id,
      assigned_date: item.assigned_date,
      expiration_date: item.expiration_date,
      status: item.status,
      student: item.students ? {
        id: item.students.id,
        first_name: item.students.first_name,
        last_name: item.students.last_name,
        email: item.students.email,
        grade_level_id: item.students.grade_level_id,
        school_id: item.students.school_id,
        branch_id: item.students.branch_id
      } : undefined
    }));
  },

  async bulkAssignLicenses(
    studentIds: string[],
    licenseId: string,
    entityLicenseId: string
  ): Promise<{ successful: number; failed: number }> {
    const results = { successful: 0, failed: 0 };

    for (const studentId of studentIds) {
      try {
        const { error } = await supabase
          .from('student_licenses')
          .insert([{
            student_id: studentId,
            license_id: licenseId,
            entity_license_id: entityLicenseId,
            assigned_date: new Date().toISOString(),
            status: 'active'
          }]);

        if (error) {
          results.failed++;
        } else {
          results.successful++;
        }
      } catch {
        results.failed++;
      }
    }

    return results;
  },

  async revokeLicenseFromStudent(
    studentLicenseId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('student_licenses')
      .update({ status: 'revoked' })
      .eq('id', studentLicenseId);

    if (error) throw error;
  },

  async assignLicenseToEntity(
    licenseId: string,
    entityId: string,
    entityType: string,
    quantity: number
  ): Promise<EntityLicense> {
    const { data, error } = await supabase
      .from('entity_licenses')
      .insert([{
        license_id: licenseId,
        entity_id: entityId,
        entity_type: entityType,
        assigned_quantity: quantity,
        used_quantity: 0,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEntityLicense(
    id: string,
    updates: Partial<EntityLicense>
  ): Promise<EntityLicense> {
    const { data, error } = await supabase
      .from('entity_licenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEntityLicense(id: string): Promise<void> {
    const { error } = await supabase
      .from('entity_licenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export async function getEntityLicenses(entityId: string): Promise<EntityLicense[]> {
  return EntityLicenseService.getEntityLicenses(entityId);
}

export async function assignLicenseToEntity(
  licenseId: string,
  entityId: string,
  entityType: string,
  quantity: number
): Promise<EntityLicense> {
  return EntityLicenseService.assignLicenseToEntity(licenseId, entityId, entityType, quantity);
}

export async function updateEntityLicense(
  id: string,
  updates: Partial<EntityLicense>
): Promise<EntityLicense> {
  return EntityLicenseService.updateEntityLicense(id, updates);
}

export async function deleteEntityLicense(id: string): Promise<void> {
  return EntityLicenseService.deleteEntityLicense(id);
}
