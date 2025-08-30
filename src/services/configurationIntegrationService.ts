// /src/services/configurationIntegrationService.ts

import { supabase } from '@/lib/supabase';

export interface ConfigurationAssignment {
  configurationType: 'grade_level' | 'academic_year' | 'department' | 'class_section';
  configurationIds: string[];
  targetType: 'school' | 'branch';
  targetIds: string[];
}

export class ConfigurationIntegrationService {
  // Assign configurations to schools/branches
  static async assignConfigurations(assignment: ConfigurationAssignment) {
    const assignments = [];
    
    for (const configId of assignment.configurationIds) {
      for (const targetId of assignment.targetIds) {
        assignments.push({
          configuration_type: assignment.configurationType,
          configuration_id: configId,
          assigned_to_type: assignment.targetType,
          assigned_to_id: targetId,
          assigned_at: new Date().toISOString(),
          is_active: true
        });
      }
    }
    
    const { data, error } = await supabase
      .from('configuration_assignments')
      .upsert(assignments, {
        onConflict: 'configuration_type,configuration_id,assigned_to_type,assigned_to_id'
      });
    
    return { data, error };
  }
  
  // Get assigned configurations for a school/branch
  static async getAssignedConfigurations(targetId: string, targetType: 'school' | 'branch') {
    const { data, error } = await supabase
      .from('configuration_assignments')
      .select(`
        *,
        grade_levels (id, name, code),
        academic_years (id, year_name, start_date, end_date),
        departments (id, name, code),
        class_sections (id, section_name, section_code)
      `)
      .eq('assigned_to_id', targetId)
      .eq('assigned_to_type', targetType)
      .eq('is_active', true);
    
    return { data, error };
  }
  
  // Get usage statistics for a configuration
  static async getConfigurationUsage(configId: string, configType: string) {
    const { data, error, count } = await supabase
      .from('configuration_assignments')
      .select('*', { count: 'exact' })
      .eq('configuration_id', configId)
      .eq('configuration_type', configType)
      .eq('is_active', true);
    
    return { count: count || 0, data, error };
  }
  
  // Validate configuration compatibility
  static async validateAssignment(
    configType: string,
    configId: string,
    targetId: string,
    targetType: 'school' | 'branch'
  ) {
    // Check if configuration belongs to same company as target
    let isValid = true;
    let message = '';
    
    // Validation logic here
    if (targetType === 'branch') {
      // Check if branch's school has this configuration
      const { data: branch } = await supabase
        .from('branches')
        .select('school_id')
        .eq('id', targetId)
        .single();
      
      if (branch) {
        const { data: schoolConfig } = await supabase
          .from('configuration_assignments')
          .select('*')
          .eq('configuration_id', configId)
          .eq('configuration_type', configType)
          .eq('assigned_to_id', branch.school_id)
          .eq('assigned_to_type', 'school')
          .single();
        
        if (!schoolConfig) {
          isValid = false;
          message = 'Configuration must be assigned to school first';
        }
      }
    }
    
    return { isValid, message };
  }
  
  // Bulk assignment with validation
  static async bulkAssign(assignments: ConfigurationAssignment[]) {
    const results = [];
    
    for (const assignment of assignments) {
      // Validate each assignment
      for (const configId of assignment.configurationIds) {
        for (const targetId of assignment.targetIds) {
          const validation = await this.validateAssignment(
            assignment.configurationType,
            configId,
            targetId,
            assignment.targetType
          );
          
          if (validation.isValid) {
            const result = await this.assignConfigurations({
              ...assignment,
              configurationIds: [configId],
              targetIds: [targetId]
            });
            results.push(result);
          } else {
            results.push({
              error: validation.message,
              configId,
              targetId
            });
          }
        }
      }
    }
    
    return results;
  }
}