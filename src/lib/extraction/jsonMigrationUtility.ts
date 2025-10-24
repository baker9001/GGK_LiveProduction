/**
 * JSON Migration Utility
 *
 * Utilities to migrate existing JSON files to the enhanced schema
 */

import { enhancePaper, validateEnhancedQuestion, type EnhancedPaper, type EnhancedQuestion } from './questionSchemaEnhancer';

export interface MigrationReport {
  success: boolean;
  fileName: string;
  questionsProcessed: number;
  partsProcessed: number;
  subpartsProcessed: number;
  errors: Array<{
    questionNumber: string;
    error: string;
  }>;
  warnings: Array<{
    questionNumber: string;
    warning: string;
  }>;
  statistics: {
    containerQuestions: number;
    answerableQuestions: number;
    containerParts: number;
    answerableParts: number;
    totalSubparts: number;
  };
}

/**
 * Migrate a single JSON file
 */
export function migrateJSONFile(originalPaper: any, fileName: string = 'unknown'): {
  migratedPaper: EnhancedPaper;
  report: MigrationReport;
} {
  const report: MigrationReport = {
    success: true,
    fileName,
    questionsProcessed: 0,
    partsProcessed: 0,
    subpartsProcessed: 0,
    errors: [],
    warnings: [],
    statistics: {
      containerQuestions: 0,
      answerableQuestions: 0,
      containerParts: 0,
      answerableParts: 0,
      totalSubparts: 0,
    },
  };

  try {
    // Enhance the entire paper
    const migratedPaper = enhancePaper(originalPaper);

    // Validate and collect statistics
    for (const question of migratedPaper.questions) {
      report.questionsProcessed++;

      // Validate question
      const validation = validateEnhancedQuestion(question);

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          report.errors.push({
            questionNumber: question.question_number || 'unknown',
            error,
          });
        });
        report.success = false;
      }

      validation.warnings.forEach(warning => {
        report.warnings.push({
          questionNumber: question.question_number || 'unknown',
          warning,
        });
      });

      // Collect statistics
      if (question.is_container) {
        report.statistics.containerQuestions++;
      }
      if (question.has_direct_answer) {
        report.statistics.answerableQuestions++;
      }

      // Process parts
      if (question.parts) {
        for (const part of question.parts) {
          report.partsProcessed++;

          if (part.is_container) {
            report.statistics.containerParts++;
          }
          if (part.has_direct_answer) {
            report.statistics.answerableParts++;
          }

          // Process subparts
          if (part.subparts) {
            report.subpartsProcessed += part.subparts.length;
            report.statistics.totalSubparts += part.subparts.length;
          }
        }
      }
    }

    return { migratedPaper, report };
  } catch (error) {
    report.success = false;
    report.errors.push({
      questionNumber: 'N/A',
      error: error instanceof Error ? error.message : 'Unknown error during migration',
    });

    throw error;
  }
}

/**
 * Batch migrate multiple JSON files
 */
export function migrateBatchJSON(files: Array<{ name: string; data: any }>): {
  results: Array<{
    fileName: string;
    migratedData: EnhancedPaper;
    report: MigrationReport;
  }>;
  summary: {
    totalFiles: number;
    successfulMigrations: number;
    failedMigrations: number;
    totalQuestions: number;
    totalParts: number;
    totalSubparts: number;
    totalErrors: number;
    totalWarnings: number;
  };
} {
  const results: Array<{
    fileName: string;
    migratedData: EnhancedPaper;
    report: MigrationReport;
  }> = [];

  const summary = {
    totalFiles: files.length,
    successfulMigrations: 0,
    failedMigrations: 0,
    totalQuestions: 0,
    totalParts: 0,
    totalSubparts: 0,
    totalErrors: 0,
    totalWarnings: 0,
  };

  for (const file of files) {
    try {
      const { migratedPaper, report } = migrateJSONFile(file.data, file.name);

      results.push({
        fileName: file.name,
        migratedData: migratedPaper,
        report,
      });

      if (report.success) {
        summary.successfulMigrations++;
      } else {
        summary.failedMigrations++;
      }

      summary.totalQuestions += report.questionsProcessed;
      summary.totalParts += report.partsProcessed;
      summary.totalSubparts += report.subpartsProcessed;
      summary.totalErrors += report.errors.length;
      summary.totalWarnings += report.warnings.length;
    } catch (error) {
      summary.failedMigrations++;
      results.push({
        fileName: file.name,
        migratedData: {} as EnhancedPaper,
        report: {
          success: false,
          fileName: file.name,
          questionsProcessed: 0,
          partsProcessed: 0,
          subpartsProcessed: 0,
          errors: [
            {
              questionNumber: 'N/A',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
          warnings: [],
          statistics: {
            containerQuestions: 0,
            answerableQuestions: 0,
            containerParts: 0,
            answerableParts: 0,
            totalSubparts: 0,
          },
        },
      });
    }
  }

  return { results, summary };
}

/**
 * Generate migration report as readable text
 */
export function generateMigrationReportText(report: MigrationReport): string {
  const lines: string[] = [];

  lines.push(`=== Migration Report: ${report.fileName} ===`);
  lines.push(`Status: ${report.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  lines.push('');

  lines.push('Processing Summary:');
  lines.push(`  Questions: ${report.questionsProcessed}`);
  lines.push(`  Parts: ${report.partsProcessed}`);
  lines.push(`  Subparts: ${report.subpartsProcessed}`);
  lines.push('');

  lines.push('Statistics:');
  lines.push(`  Container Questions: ${report.statistics.containerQuestions}`);
  lines.push(`  Answerable Questions: ${report.statistics.answerableQuestions}`);
  lines.push(`  Container Parts: ${report.statistics.containerParts}`);
  lines.push(`  Answerable Parts: ${report.statistics.answerableParts}`);
  lines.push(`  Total Subparts: ${report.statistics.totalSubparts}`);
  lines.push('');

  if (report.errors.length > 0) {
    lines.push('Errors:');
    report.errors.forEach(error => {
      lines.push(`  Q${error.questionNumber}: ${error.error}`);
    });
    lines.push('');
  }

  if (report.warnings.length > 0) {
    lines.push('Warnings:');
    report.warnings.forEach(warning => {
      lines.push(`  Q${warning.questionNumber}: ${warning.warning}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate batch migration summary
 */
export function generateBatchMigrationSummary(summary: {
  totalFiles: number;
  successfulMigrations: number;
  failedMigrations: number;
  totalQuestions: number;
  totalParts: number;
  totalSubparts: number;
  totalErrors: number;
  totalWarnings: number;
}): string {
  const lines: string[] = [];

  lines.push('=== Batch Migration Summary ===');
  lines.push('');
  lines.push('Files:');
  lines.push(`  Total: ${summary.totalFiles}`);
  lines.push(`  ✅ Successful: ${summary.successfulMigrations}`);
  lines.push(`  ❌ Failed: ${summary.failedMigrations}`);
  lines.push('');

  lines.push('Elements Processed:');
  lines.push(`  Questions: ${summary.totalQuestions}`);
  lines.push(`  Parts: ${summary.totalParts}`);
  lines.push(`  Subparts: ${summary.totalSubparts}`);
  lines.push('');

  lines.push('Issues:');
  lines.push(`  Errors: ${summary.totalErrors}`);
  lines.push(`  Warnings: ${summary.totalWarnings}`);
  lines.push('');

  const successRate = summary.totalFiles > 0
    ? ((summary.successfulMigrations / summary.totalFiles) * 100).toFixed(1)
    : '0.0';
  lines.push(`Success Rate: ${successRate}%`);

  return lines.join('\n');
}

/**
 * Compare original and migrated JSON
 */
export function compareJSON(original: any, migrated: EnhancedPaper): {
  structurePreserved: boolean;
  fieldsAdded: string[];
  changes: Array<{
    path: string;
    description: string;
  }>;
} {
  const fieldsAdded = ['is_container', 'has_direct_answer'];
  const changes: Array<{ path: string; description: string }> = [];

  // Check if all original questions are present
  const originalQuestionCount = original.questions?.length || 0;
  const migratedQuestionCount = migrated.questions?.length || 0;

  if (originalQuestionCount !== migratedQuestionCount) {
    changes.push({
      path: 'root.questions',
      description: `Question count changed: ${originalQuestionCount} → ${migratedQuestionCount}`,
    });
  }

  // Sample check first question
  if (original.questions?.[0] && migrated.questions?.[0]) {
    const origQ = original.questions[0];
    const migQ = migrated.questions[0];

    // Check if basic fields are preserved
    const fieldsToCheck = ['question_number', 'question_text', 'marks', 'type'];
    fieldsToCheck.forEach(field => {
      if (origQ[field] !== migQ[field]) {
        changes.push({
          path: `questions[0].${field}`,
          description: `Value changed: "${origQ[field]}" → "${migQ[field]}"`,
        });
      }
    });
  }

  return {
    structurePreserved: changes.length === 0,
    fieldsAdded,
    changes,
  };
}

/**
 * Export migrated JSON with formatting
 */
export function exportMigratedJSON(migratedPaper: EnhancedPaper, prettyPrint: boolean = true): string {
  if (prettyPrint) {
    return JSON.stringify(migratedPaper, null, 2);
  }
  return JSON.stringify(migratedPaper);
}

/**
 * Dry run migration (validate without making changes)
 */
export function dryRunMigration(originalPaper: any, fileName: string = 'unknown'): MigrationReport {
  const { report } = migrateJSONFile(originalPaper, fileName);
  return report;
}
