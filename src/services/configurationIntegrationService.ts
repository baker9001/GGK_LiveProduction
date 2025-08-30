/**
 * File: /src/services/configurationIntegrationService.ts
 * 
 * Configuration Integration Service
 * Handles the integration between Configuration and Organisation modules
 * 
 * Dependencies:
 *   - @/lib/supabase
 * 
 * Features:
 *   - Assignment tracking for configurations
 *   - Usage statistics calculation
 *   - Validation for hierarchical assignments
 *   - Bulk assignment capabilities
 *   - Template management
 * 
 * Database Tables:
 *   - configuration_assignments (tracking assignments)
 *   - configuration_templates (template storage)
 *   - grade_levels, academic_years, departments, class_sections
 *   - schools, branches
 */

import { supabase } from '@/lib/supabase';

export interface ConfigurationAssignment {
  configurationType: 'grade_level' | 'academic_year' | 'department' | 'class_section';
  configurationIds: string[];
  targetType: 'school' | 'branch';
  targetIds: string[];
}

export interface AssignmentValidation {
  isValid: boolean;
  message: string;
  details?: any;
}

export interface UsageStatistics {
  totalAssignments: number;
  activeAssignments: number;
  schoolCount: number;
  branchCount: number;
  studentCount?: number;
  teacherCount?: number;
}

export interface ConfigurationTemplate {
  id: string;
  company_id: string;
  template_name: string;
  template_type: string;
  template_data: any;
  is_default: boolean;
  created_at: string;
  created_by: string;
}

export class ConfigurationIntegrationService {
  /**
   * Assign configurations to schools or branches
   */
  static async assignConfigurations(assignment: ConfigurationAssignment) {
    try {
      const assignments = [];
      const timestamp = new Date().toISOString();
      
      // Get current user for tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const configId of assignment.configurationIds) {
        for (const targetId of assignment.targetIds) {
          assignments.push({
            configuration_type: assignment.configurationType,
            configuration_id: configId,
            assigned_to_type: assignment.targetType,
            assigned_to_id: targetId,
            assigned_at: timestamp,
            assigned_by: user?.id,
            is_active: true
          });
        }
      }
      
      // Use upsert to handle existing assignments
      const { data, error } = await supabase
        .from('configuration_assignments')
        .upsert(assignments, {
          onConflict: 'configuration_type,configuration_id,assigned_to_type,assigned_to_id',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) throw error;
      
      return { data, error: null, success: true };
    } catch (error) {
      console.error('Error assigning configurations:', error);
      return { data: null, error, success: false };
    }
  }
  
  /**
   * Remove configuration assignments
   */
  static async removeAssignments(
    configurationId: string,
    configurationType: string,
    targetIds?: string[],
    targetType?: 'school' | 'branch'
  ) {
    try {
      let query = supabase
        .from('configuration_assignments')
        .update({ is_active: false })
        .eq('configuration_id', configurationId)
        .eq('configuration_type', configurationType);
      
      if (targetIds && targetIds.length > 0) {
        query = query.in('assigned_to_id', targetIds);
      }
      
      if (targetType) {
        query = query.eq('assigned_to_type', targetType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { data, error: null, success: true };
    } catch (error) {
      console.error('Error removing assignments:', error);
      return { data: null, error, success: false };
    }
  }
  
  /**
   * Get assigned configurations for a school or branch
   */
  static async getAssignedConfigurations(
    targetId: string,
    targetType: 'school' | 'branch',
    configurationType?: string
  ) {
    try {
      let query = supabase
        .from('configuration_assignments')
        .select('*')
        .eq('assigned_to_id', targetId)
        .eq('assigned_to_type', targetType)
        .eq('is_active', true);
      
      if (configurationType) {
        query = query.eq('configuration_type', configurationType);
      }
      
      const { data: assignments, error } = await query;
      
      if (error) throw error;
      
      // Fetch the actual configuration data
      const configurationData = await Promise.all((assignments || []).map(async (assignment) => {
        let tableName = '';
        switch (assignment.configuration_type) {
          case 'grade_level':
            tableName = 'grade_levels';
            break;
          case 'academic_year':
            tableName = 'academic_years';
            break;
          case 'department':
            tableName = 'departments';
            break;
          case 'class_section':
            tableName = 'class_sections';
            break;
        }
        
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', assignment.configuration_id)
          .single();
        
        return {
          ...assignment,
          configuration: data
        };
      }));
      
      return { data: configurationData, error: null };
    } catch (error) {
      console.error('Error fetching assigned configurations:', error);
      return { data: null, error };
    }
  }
  
  /**
   * Get usage statistics for a configuration
   */
  static async getConfigurationUsage(
    configId: string,
    configType: string
  ): Promise<{ count: number; data: any[] | null; error: any }> {
    try {
      const { data, error, count } = await supabase
        .from('configuration_assignments')
        .select('*', { count: 'exact' })
        .eq('configuration_id', configId)
        .eq('configuration_type', configType)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return { count: count || 0, data, error: null };
    } catch (error) {
      console.error('Error fetching configuration usage:', error);
      return { count: 0, data: null, error };
    }
  }
  
  /**
   * Get detailed usage statistics
   */
  static async getDetailedUsageStatistics(
    configId: string,
    configType: string
  ): Promise<UsageStatistics> {
    try {
      const { data: assignments } = await supabase
        .from('configuration_assignments')
        .select('*')
        .eq('configuration_id', configId)
        .eq('configuration_type', configType);
      
      const activeAssignments = assignments?.filter(a => a.is_active) || [];
      const schoolAssignments = activeAssignments.filter(a => a.assigned_to_type === 'school');
      const branchAssignments = activeAssignments.filter(a => a.assigned_to_type === 'branch');
      
      // Get unique schools and branches
      const uniqueSchools = [...new Set(schoolAssignments.map(a => a.assigned_to_id))];
      const uniqueBranches = [...new Set(branchAssignments.map(a => a.assigned_to_id))];
      
      // Get student and teacher counts if needed
      let studentCount = 0;
      let teacherCount = 0;
      
      if (configType === 'grade_level' && uniqueSchools.length > 0) {
        const { count: students } = await supabase
          .from('students')
          .select('*', { count: 'exact' })
          .in('school_id', uniqueSchools)
          .eq('is_active', true);
        
        studentCount = students || 0;
        
        const { count: teachers } = await supabase
          .from('teachers')
          .select('*', { count: 'exact' })
          .in('school_id', uniqueSchools)
          .eq('is_active', true);
        
        teacherCount = teachers || 0;
      }
      
      return {
        totalAssignments: assignments?.length || 0,
        activeAssignments: activeAssignments.length,
        schoolCount: uniqueSchools.length,
        branchCount: uniqueBranches.length,
        studentCount,
        teacherCount
      };
    } catch (error) {
      console.error('Error fetching detailed statistics:', error);
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        schoolCount: 0,
        branchCount: 0,
        studentCount: 0,
        teacherCount: 0
      };
    }
  }
  
  /**
   * Validate configuration assignment
   */
  static async validateAssignment(
    configType: string,
    configId: string,
    targetId: string,
    targetType: 'school' | 'branch'
  ): Promise<AssignmentValidation> {
    try {
      // Basic validation
      if (!configType || !configId || !targetId || !targetType) {
        return {
          isValid: false,
          message: 'Missing required parameters for validation'
        };
      }
      
      // Check if configuration exists
      let tableName = '';
      switch (configType) {
        case 'grade_level':
          tableName = 'grade_levels';
          break;
        case 'academic_year':
          tableName = 'academic_years';
          break;
        case 'department':
          tableName = 'departments';
          break;
        case 'class_section':
          tableName = 'class_sections';
          break;
        default:
          return {
            isValid: false,
            message: 'Invalid configuration type'
          };
      }
      
      const { data: config, error: configError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', configId)
        .single();
      
      if (configError || !config) {
        return {
          isValid: false,
          message: 'Configuration not found'
        };
      }
      
      // Check if target exists
      const targetTable = targetType === 'school' ? 'schools' : 'branches';
      const { data: target, error: targetError } = await supabase
        .from(targetTable)
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (targetError || !target) {
        return {
          isValid: false,
          message: `${targetType === 'school' ? 'School' : 'Branch'} not found`
        };
      }
      
      // Hierarchical validation for branches
      if (targetType === 'branch') {
        // Check if the parent school has this configuration
        const { data: schoolAssignment } = await supabase
          .from('configuration_assignments')
          .select('*')
          .eq('configuration_id', configId)
          .eq('configuration_type', configType)
          .eq('assigned_to_id', target.school_id)
          .eq('assigned_to_type', 'school')
          .eq('is_active', true)
          .single();
        
        if (!schoolAssignment) {
          return {
            isValid: false,
            message: 'Configuration must be assigned to the parent school first',
            details: {
              school_id: target.school_id,
              branch_id: targetId
            }
          };
        }
      }
      
      // Check for duplicate active assignment
      const { data: existingAssignment } = await supabase
        .from('configuration_assignments')
        .select('*')
        .eq('configuration_id', configId)
        .eq('configuration_type', configType)
        .eq('assigned_to_id', targetId)
        .eq('assigned_to_type', targetType)
        .eq('is_active', true)
        .single();
      
      if (existingAssignment) {
        return {
          isValid: true,
          message: 'Assignment already exists and is active'
        };
      }
      
      // Additional validations based on configuration type
      if (configType === 'academic_year') {
        // Check for overlapping academic years
        const { data: existingYears } = await supabase
          .from('configuration_assignments')
          .select(`
            *,
            academic_years!inner(*)
          `)
          .eq('assigned_to_id', targetId)
          .eq('assigned_to_type', targetType)
          .eq('configuration_type', 'academic_year')
          .eq('is_active', true);
        
        if (existingYears && existingYears.length > 0) {
          // Check for date overlaps
          const newYear = config as any;
          for (const existing of existingYears) {
            const existingYear = existing.academic_years;
            if (
              (newYear.start_date >= existingYear.start_date && newYear.start_date <= existingYear.end_date) ||
              (newYear.end_date >= existingYear.start_date && newYear.end_date <= existingYear.end_date)
            ) {
              return {
                isValid: false,
                message: 'Academic year dates overlap with existing assignment',
                details: {
                  existing: existingYear,
                  new: newYear
                }
              };
            }
          }
        }
      }
      
      return {
        isValid: true,
        message: 'Assignment is valid'
      };
    } catch (error) {
      console.error('Error validating assignment:', error);
      return {
        isValid: false,
        message: 'Validation failed due to an error',
        details: error
      };
    }
  }
  
  /**
   * Bulk assignment with validation
   */
  static async bulkAssign(assignments: ConfigurationAssignment[]) {
    const results = [];
    
    for (const assignment of assignments) {
      const assignmentResults = [];
      
      for (const configId of assignment.configurationIds) {
        for (const targetId of assignment.targetIds) {
          // Validate each assignment
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
            
            assignmentResults.push({
              configId,
              targetId,
              success: result.success,
              error: result.error,
              message: validation.message
            });
          } else {
            assignmentResults.push({
              configId,
              targetId,
              success: false,
              error: validation.message,
              details: validation.details
            });
          }
        }
      }
      
      results.push({
        configurationType: assignment.configurationType,
        targetType: assignment.targetType,
        results: assignmentResults
      });
    }
    
    return results;
  }
  
  /**
   * Get available configurations for assignment
   */
  static async getAvailableConfigurations(
    companyId: string,
    configurationType: string,
    targetId?: string,
    targetType?: 'school' | 'branch'
  ) {
    try {
      let tableName = '';
      switch (configurationType) {
        case 'grade_level':
          tableName = 'grade_levels';
          break;
        case 'academic_year':
          tableName = 'academic_years';
          break;
        case 'department':
          tableName = 'departments';
          break;
        case 'class_section':
          tableName = 'class_sections';
          break;
        default:
          return { data: [], error: 'Invalid configuration type' };
      }
      
      // Get all configurations for the company
      const { data: allConfigs, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      
      // If no target specified, return all
      if (!targetId || !targetType) {
        return { data: allConfigs, error: null };
      }
      
      // Get already assigned configurations
      const { data: assignments } = await supabase
        .from('configuration_assignments')
        .select('configuration_id')
        .eq('assigned_to_id', targetId)
        .eq('assigned_to_type', targetType)
        .eq('configuration_type', configurationType)
        .eq('is_active', true);
      
      const assignedIds = assignments?.map(a => a.configuration_id) || [];
      
      // Filter out already assigned configurations
      const availableConfigs = allConfigs?.filter(
        config => !assignedIds.includes(config.id)
      ) || [];
      
      return { data: availableConfigs, error: null };
    } catch (error) {
      console.error('Error fetching available configurations:', error);
      return { data: [], error };
    }
  }
  
  /**
   * Create configuration template
   */
  static async createTemplate(
    template: Omit<ConfigurationTemplate, 'id' | 'created_at' | 'created_by'>
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('configuration_templates')
        .insert({
          ...template,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating template:', error);
      return { data: null, error };
    }
  }
  
  /**
   * Get configuration templates
   */
  static async getTemplates(
    companyId: string,
    templateType?: string
  ) {
    try {
      let query = supabase
        .from('configuration_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('template_name');
      
      if (templateType) {
        query = query.eq('template_type', templateType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching templates:', error);
      return { data: null, error };
    }
  }
  
  /**
   * Copy configuration to another entity
   */
  static async copyConfiguration(
    sourceId: string,
    sourceType: 'school' | 'branch',
    targetIds: string[],
    targetType: 'school' | 'branch',
    configurationTypes?: string[]
  ) {
    try {
      // Get all configurations from source
      const { data: sourceConfigs } = await this.getAssignedConfigurations(
        sourceId,
        sourceType
      );
      
      if (!sourceConfigs || sourceConfigs.length === 0) {
        return {
          success: false,
          error: 'No configurations found in source',
          copiedCount: 0
        };
      }
      
      // Filter by configuration types if specified
      let configsToCopy = sourceConfigs;
      if (configurationTypes && configurationTypes.length > 0) {
        configsToCopy = sourceConfigs.filter(
          c => configurationTypes.includes(c.configuration_type)
        );
      }
      
      // Group configurations by type
      const configsByType = configsToCopy.reduce((acc, config) => {
        if (!acc[config.configuration_type]) {
          acc[config.configuration_type] = [];
        }
        acc[config.configuration_type].push(config.configuration_id);
        return acc;
      }, {} as Record<string, string[]>);
      
      // Create assignments for each type
      const assignments: ConfigurationAssignment[] = Object.entries(configsByType).map(
        ([type, ids]) => ({
          configurationType: type as any,
          configurationIds: ids,
          targetType,
          targetIds
        })
      );
      
      // Perform bulk assignment
      const results = await this.bulkAssign(assignments);
      
      // Count successful copies
      let successCount = 0;
      let errorCount = 0;
      
      results.forEach(result => {
        result.results.forEach(r => {
          if (r.success) successCount++;
          else errorCount++;
        });
      });
      
      return {
        success: errorCount === 0,
        copiedCount: successCount,
        errorCount,
        results
      };
    } catch (error) {
      console.error('Error copying configuration:', error);
      return {
        success: false,
        error,
        copiedCount: 0
      };
    }
  }
  
  /**
   * Get configuration summary for dashboard
   */
  static async getConfigurationSummary(
    targetId: string,
    targetType: 'school' | 'branch'
  ) {
    try {
      const { data: assignments } = await supabase
        .from('configuration_assignments')
        .select('configuration_type')
        .eq('assigned_to_id', targetId)
        .eq('assigned_to_type', targetType)
        .eq('is_active', true);
      
      const summary = {
        grade_levels: 0,
        academic_years: 0,
        departments: 0,
        class_sections: 0,
        total: assignments?.length || 0
      };
      
      assignments?.forEach(assignment => {
        switch (assignment.configuration_type) {
          case 'grade_level':
            summary.grade_levels++;
            break;
          case 'academic_year':
            summary.academic_years++;
            break;
          case 'department':
            summary.departments++;
            break;
          case 'class_section':
            summary.class_sections++;
            break;
        }
      });
      
      return { data: summary, error: null };
    } catch (error) {
      console.error('Error fetching configuration summary:', error);
      return { data: null, error };
    }
  }
}

export default ConfigurationIntegrationService;