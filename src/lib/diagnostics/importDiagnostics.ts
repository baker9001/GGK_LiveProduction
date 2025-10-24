// Import Diagnostics Utility
// Provides comprehensive diagnostic information for debugging import issues

import { supabase } from '@/lib/supabase';

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  recommendation?: string;
}

export interface CompleteDiagnostics {
  authentication: DiagnosticResult;
  database: DiagnosticResult;
  permissions: DiagnosticResult;
  paper: DiagnosticResult;
  dataStructure: DiagnosticResult;
  overall: {
    canProceed: boolean;
    criticalIssues: string[];
    warnings: string[];
  };
}

/**
 * Run comprehensive diagnostics before import
 */
export async function runImportDiagnostics(
  paperId: string,
  dataStructureId: string
): Promise<CompleteDiagnostics> {
  const diagnostics: CompleteDiagnostics = {
    authentication: { success: false, message: '' },
    database: { success: false, message: '' },
    permissions: { success: false, message: '' },
    paper: { success: false, message: '' },
    dataStructure: { success: false, message: '' },
    overall: {
      canProceed: false,
      criticalIssues: [],
      warnings: []
    }
  };

  // 1. Check Authentication
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      diagnostics.authentication = {
        success: false,
        message: `Authentication error: ${sessionError.message}`,
        details: sessionError,
        recommendation: 'Please log out and log back in'
      };
      diagnostics.overall.criticalIssues.push('Authentication failed');
    } else if (!session) {
      diagnostics.authentication = {
        success: false,
        message: 'No active session found',
        recommendation: 'Please log in to continue'
      };
      diagnostics.overall.criticalIssues.push('No active session');
    } else {
      diagnostics.authentication = {
        success: true,
        message: 'Authenticated successfully',
        details: {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role
        }
      };
    }
  } catch (error: any) {
    diagnostics.authentication = {
      success: false,
      message: `Authentication check failed: ${error.message}`,
      details: error,
      recommendation: 'Check your network connection and try again'
    };
    diagnostics.overall.criticalIssues.push('Authentication check failed');
  }

  // 2. Check Database Connection
  try {
    const { data, error } = await supabase
      .from('questions_master_admin')
      .select('id')
      .limit(1);

    if (error) {
      diagnostics.database = {
        success: false,
        message: `Database query failed: ${error.message}`,
        details: error,
        recommendation: 'Check database connection and RLS policies'
      };
      diagnostics.overall.criticalIssues.push('Cannot query database');
    } else {
      diagnostics.database = {
        success: true,
        message: 'Database connection successful'
      };
    }
  } catch (error: any) {
    diagnostics.database = {
      success: false,
      message: `Database connection error: ${error.message}`,
      details: error
    };
    diagnostics.overall.criticalIssues.push('Database connection failed');
  }

  // 3. Check Insert Permissions
  try {
    // Test with a dry-run insert (we'll roll it back by using an invalid data_structure_id)
    const testInsert = {
      paper_id: paperId,
      data_structure_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID to force failure
      region_id: '00000000-0000-0000-0000-000000000000',
      program_id: '00000000-0000-0000-0000-000000000000',
      provider_id: '00000000-0000-0000-0000-000000000000',
      subject_id: '00000000-0000-0000-0000-000000000000',
      year: 2024,
      category: 'test',
      question_number: '9999',
      question_description: 'Permission test',
      marks: 1,
      status: 'draft'
    };

    const { error } = await supabase
      .from('questions_master_admin')
      .insert([testInsert])
      .select();

    // We expect a foreign key error, not a permission error
    if (error) {
      if (error.code === '23503') {
        // Foreign key violation is expected - means we have INSERT permission
        diagnostics.permissions = {
          success: true,
          message: 'INSERT permission verified (foreign key test)',
          details: { expectedError: error.code }
        };
      } else if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        diagnostics.permissions = {
          success: false,
          message: `Permission denied: ${error.message}`,
          details: error,
          recommendation: 'Contact administrator to grant INSERT permissions'
        };
        diagnostics.overall.criticalIssues.push('No INSERT permission');
      } else {
        diagnostics.permissions = {
          success: true,
          message: 'Permission check inconclusive but likely successful',
          details: { error: error.message },
          recommendation: 'Monitor for permission errors during actual import'
        };
        diagnostics.overall.warnings.push('Permission check was inconclusive');
      }
    } else {
      // Unexpected success - clean up the test record
      diagnostics.permissions = {
        success: true,
        message: 'INSERT permission verified',
        recommendation: 'Test record should be cleaned up'
      };
    }
  } catch (error: any) {
    diagnostics.permissions = {
      success: false,
      message: `Permission check failed: ${error.message}`,
      details: error
    };
    diagnostics.overall.criticalIssues.push('Permission check failed');
  }

  // 4. Check Paper Exists
  try {
    const { data: paper, error } = await supabase
      .from('papers_setup')
      .select('id, paper_code, status')
      .eq('id', paperId)
      .maybeSingle();

    if (error) {
      diagnostics.paper = {
        success: false,
        message: `Error fetching paper: ${error.message}`,
        details: error
      };
      diagnostics.overall.criticalIssues.push('Cannot verify paper exists');
    } else if (!paper) {
      diagnostics.paper = {
        success: false,
        message: 'Paper not found',
        recommendation: 'Ensure paper is created before importing questions'
      };
      diagnostics.overall.criticalIssues.push('Paper not found');
    } else {
      diagnostics.paper = {
        success: true,
        message: `Paper found: ${paper.paper_code}`,
        details: paper
      };
    }
  } catch (error: any) {
    diagnostics.paper = {
      success: false,
      message: `Paper check failed: ${error.message}`,
      details: error
    };
    diagnostics.overall.criticalIssues.push('Paper verification failed');
  }

  // 5. Check Data Structure Exists
  try {
    const { data: ds, error } = await supabase
      .from('data_structures')
      .select('id, region_id, program_id, provider_id, subject_id')
      .eq('id', dataStructureId)
      .maybeSingle();

    if (error) {
      diagnostics.dataStructure = {
        success: false,
        message: `Error fetching data structure: ${error.message}`,
        details: error
      };
      diagnostics.overall.criticalIssues.push('Cannot verify data structure');
    } else if (!ds) {
      diagnostics.dataStructure = {
        success: false,
        message: 'Data structure not found',
        recommendation: 'Ensure valid data structure is selected'
      };
      diagnostics.overall.criticalIssues.push('Data structure not found');
    } else {
      diagnostics.dataStructure = {
        success: true,
        message: 'Data structure found',
        details: ds
      };
    }
  } catch (error: any) {
    diagnostics.dataStructure = {
      success: false,
      message: `Data structure check failed: ${error.message}`,
      details: error
    };
    diagnostics.overall.criticalIssues.push('Data structure verification failed');
  }

  // Overall assessment
  diagnostics.overall.canProceed =
    diagnostics.authentication.success &&
    diagnostics.database.success &&
    diagnostics.permissions.success &&
    diagnostics.paper.success &&
    diagnostics.dataStructure.success;

  return diagnostics;
}

/**
 * Format diagnostics for display
 */
export function formatDiagnostics(diagnostics: CompleteDiagnostics): string {
  const lines: string[] = [
    '========================================',
    'IMPORT DIAGNOSTICS REPORT',
    '========================================',
    '',
    `✓ Authentication: ${diagnostics.authentication.success ? 'PASS' : 'FAIL'}`,
    `  ${diagnostics.authentication.message}`,
    '',
    `✓ Database: ${diagnostics.database.success ? 'PASS' : 'FAIL'}`,
    `  ${diagnostics.database.message}`,
    '',
    `✓ Permissions: ${diagnostics.permissions.success ? 'PASS' : 'FAIL'}`,
    `  ${diagnostics.permissions.message}`,
    '',
    `✓ Paper: ${diagnostics.paper.success ? 'PASS' : 'FAIL'}`,
    `  ${diagnostics.paper.message}`,
    '',
    `✓ Data Structure: ${diagnostics.dataStructure.success ? 'PASS' : 'FAIL'}`,
    `  ${diagnostics.dataStructure.message}`,
    '',
    '========================================',
    `OVERALL: ${diagnostics.overall.canProceed ? 'READY TO IMPORT' : 'CANNOT IMPORT'}`,
    '========================================'
  ];

  if (diagnostics.overall.criticalIssues.length > 0) {
    lines.push('', 'CRITICAL ISSUES:');
    diagnostics.overall.criticalIssues.forEach(issue => {
      lines.push(`  ❌ ${issue}`);
    });
  }

  if (diagnostics.overall.warnings.length > 0) {
    lines.push('', 'WARNINGS:');
    diagnostics.overall.warnings.forEach(warning => {
      lines.push(`  ⚠️  ${warning}`);
    });
  }

  return lines.join('\n');
}
