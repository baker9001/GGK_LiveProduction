/**
 * Table Template Service
 *
 * Handles CRUD operations for table completion templates
 * Manages template metadata and cell configurations
 */

import { supabase } from '@/lib/supabase';

export interface TableTemplateDTO {
  id?: string;
  questionId?: string;
  subQuestionId?: string;
  rows: number;
  columns: number;
  headers: string[];
  title?: string;
  description?: string;
  cells: TableCellDTO[];
}

export interface TableCellDTO {
  rowIndex: number;
  colIndex: number;
  cellType: 'locked' | 'editable';
  lockedValue?: string;
  expectedAnswer?: string;
  marks?: number;
  acceptsEquivalentPhrasing?: boolean;
  caseSensitive?: boolean;
  alternativeAnswers?: string[];
}

export interface ValidationResult {
  isComplete: boolean;
  correctCount: number;
  totalEditable: number;
  cellResults: Record<string, {
    isCorrect: boolean;
    expectedAnswer: string;
    studentAnswer: string | number;
  }>;
}

export class TableTemplateService {
  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy matching when acceptsEquivalentPhrasing is enabled
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate similarity percentage between two strings (0-100)
   * Higher percentage means more similar
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;
    if (!str1 || !str2) return 0;

    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 100;

    const distance = this.levenshteinDistance(str1, str2);
    return ((maxLen - distance) / maxLen) * 100;
  }

  /**
   * Save or update table template
   */
  static async saveTemplate(template: TableTemplateDTO): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      // Validate template
      if (!template.questionId && !template.subQuestionId) {
        throw new Error('Either questionId or subQuestionId must be provided');
      }

      // Validate UUID format (reject preview/temporary IDs like "q_1")
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (template.questionId && !uuidRegex.test(template.questionId)) {
        throw new Error('Cannot save template for preview question. Please save the question first.');
      }

      if (template.subQuestionId && !uuidRegex.test(template.subQuestionId)) {
        throw new Error('Cannot save template for preview sub-question. Please save the question first.');
      }

      if (template.rows < 2 || template.rows > 50) {
        throw new Error('Rows must be between 2 and 50');
      }

      if (template.columns < 2 || template.columns > 20) {
        throw new Error('Columns must be between 2 and 20');
      }

      // 1. Upsert template
      const templatePayload: any = {
        question_id: template.questionId || null,
        sub_question_id: template.subQuestionId || null,
        rows: template.rows,
        columns: template.columns,
        headers: template.headers,
        title: template.title,
        description: template.description,
        updated_at: new Date().toISOString()
      };

      if (template.id) {
        templatePayload.id = template.id;
      }

      const { data: templateData, error: templateError } = await supabase
        .from('table_templates')
        .upsert(templatePayload)
        .select()
        .single();

      if (templateError) throw templateError;

      const templateId = templateData.id;

      // 2. Delete existing cells for this template
      const { error: deleteError } = await supabase
        .from('table_template_cells')
        .delete()
        .eq('template_id', templateId);

      if (deleteError) throw deleteError;

      // 3. Insert new cells
      if (template.cells.length > 0) {
        const cellsToInsert = template.cells.map(cell => ({
          template_id: templateId,
          row_index: cell.rowIndex,
          col_index: cell.colIndex,
          cell_type: cell.cellType,
          locked_value: cell.lockedValue || null,
          expected_answer: cell.expectedAnswer || null,
          marks: cell.marks || 1,
          accepts_equivalent_phrasing: cell.acceptsEquivalentPhrasing || false,
          case_sensitive: cell.caseSensitive || false,
          alternative_answers: cell.alternativeAnswers || []
        }));

        const { error: cellsError } = await supabase
          .from('table_template_cells')
          .insert(cellsToInsert);

        if (cellsError) throw cellsError;
      }

      return { success: true, templateId };
    } catch (error) {
      console.error('Error saving table template:', error);
      // Handle Supabase PostgresError which has message, details, hint, code
      const errorMsg = error instanceof Error
        ? error.message
        : (error as any)?.message || (error as any)?.details || JSON.stringify(error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Load table template by question or subquestion ID
   */
  static async loadTemplate(
    questionId?: string,
    subQuestionId?: string
  ): Promise<{
    success: boolean;
    template?: TableTemplateDTO;
    error?: string;
  }> {
    try {
      if (!questionId && !subQuestionId) {
        throw new Error('Either questionId or subQuestionId must be provided');
      }

      // Validate UUID format (reject preview/temporary IDs)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (questionId && !uuidRegex.test(questionId)) {
        // Preview question - return empty template
        return {
          success: true,
          template: undefined
        };
      }

      if (subQuestionId && !uuidRegex.test(subQuestionId)) {
        // Preview sub-question - return empty template
        return {
          success: true,
          template: undefined
        };
      }

      // 1. Fetch template
      let query = supabase
        .from('table_templates')
        .select('*');

      if (questionId) {
        query = query.eq('question_id', questionId);
      } else if (subQuestionId) {
        query = query.eq('sub_question_id', subQuestionId);
      }

      const { data: templateData, error: templateError } = await query.maybeSingle();

      if (templateError) throw templateError;

      if (!templateData) {
        // No template found - return success with undefined template
        return { success: true, template: undefined };
      }

      // 2. Fetch cells
      const { data: cellsData, error: cellsError } = await supabase
        .from('table_template_cells')
        .select('*')
        .eq('template_id', templateData.id)
        .order('row_index')
        .order('col_index');

      if (cellsError) throw cellsError;

      // 3. Build DTO
      const template: TableTemplateDTO = {
        id: templateData.id,
        questionId: templateData.question_id,
        subQuestionId: templateData.sub_question_id,
        rows: templateData.rows,
        columns: templateData.columns,
        headers: templateData.headers || [],
        title: templateData.title,
        description: templateData.description,
        cells: (cellsData || []).map(cell => ({
          rowIndex: cell.row_index,
          colIndex: cell.col_index,
          cellType: cell.cell_type as 'locked' | 'editable',
          lockedValue: cell.locked_value,
          expectedAnswer: cell.expected_answer,
          marks: cell.marks,
          acceptsEquivalentPhrasing: cell.accepts_equivalent_phrasing,
          caseSensitive: cell.case_sensitive,
          alternativeAnswers: cell.alternative_answers || []
        }))
      };

      return { success: true, template };
    } catch (error) {
      console.error('Error loading table template:', error);
      // Handle Supabase PostgresError which has message, details, hint, code
      const errorMsg = error instanceof Error
        ? error.message
        : (error as any)?.message || (error as any)?.details || JSON.stringify(error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Delete table template
   */
  static async deleteTemplate(templateId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('table_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting table template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate student answers against template
   */
  static validateAnswers(
    studentAnswers: Record<string, string | number>,
    template: TableTemplateDTO
  ): ValidationResult {
    const editableCells = template.cells.filter(c => c.cellType === 'editable');
    const cellResults: Record<string, any> = {};
    let correctCount = 0;

    editableCells.forEach(cell => {
      const cellKey = `${cell.rowIndex}-${cell.colIndex}`;
      const studentAnswer = studentAnswers[cellKey];
      const expectedAnswer = cell.expectedAnswer || '';

      let isCorrect = false;

      if (studentAnswer !== undefined && studentAnswer !== null) {
        const studentStr = String(studentAnswer).trim();
        const expectedStr = String(expectedAnswer).trim();

        // First try exact match (respecting case sensitivity)
        if (cell.caseSensitive) {
          isCorrect = studentStr === expectedStr;
        } else {
          isCorrect = studentStr.toLowerCase() === expectedStr.toLowerCase();
        }

        // Check alternative answers if not correct yet
        if (!isCorrect && cell.alternativeAnswers && cell.alternativeAnswers.length > 0) {
          isCorrect = cell.alternativeAnswers.some(alt =>
            cell.caseSensitive
              ? studentStr === alt.trim()
              : studentStr.toLowerCase() === alt.trim().toLowerCase()
          );
        }

        // If still not correct, try fuzzy matching if enabled
        if (!isCorrect && cell.acceptsEquivalentPhrasing) {
          const compareStudent = cell.caseSensitive ? studentStr : studentStr.toLowerCase();
          const compareExpected = cell.caseSensitive ? expectedStr : expectedStr.toLowerCase();

          // Check similarity with expected answer
          const similarity = this.calculateSimilarity(compareStudent, compareExpected);

          // Accept if similarity is 85% or higher
          if (similarity >= 85) {
            isCorrect = true;
          } else if (cell.alternativeAnswers && cell.alternativeAnswers.length > 0) {
            // Also check similarity with alternative answers
            isCorrect = cell.alternativeAnswers.some(alt => {
              const compareAlt = cell.caseSensitive ? alt.trim() : alt.trim().toLowerCase();
              return this.calculateSimilarity(compareStudent, compareAlt) >= 85;
            });
          }
        }
      }

      cellResults[cellKey] = {
        isCorrect,
        expectedAnswer,
        studentAnswer: studentAnswer || ''
      };

      if (isCorrect) correctCount++;
    });

    return {
      isComplete: Object.keys(studentAnswers).length === editableCells.length,
      correctCount,
      totalEditable: editableCells.length,
      cellResults
    };
  }

  /**
   * Convert simulation ID format to database format
   * Simulation: q_123_p0_s2 → Database: q_123-part-0-sub-2
   * Simulation: q_123_p0 → Database: q_123-part-0
   * Main questions (q_123) - return unchanged
   */
  private static convertSimulationIdToDatabaseFormat(questionIdentifier: string): string {
    if (!questionIdentifier) return questionIdentifier;

    // Check for subpart format: q_XXX_pN_sM → q_XXX-part-N-sub-M
    const subpartMatch = questionIdentifier.match(/^(q_\d+)_p(\d+)_s(\d+)$/);
    if (subpartMatch) {
      const [, baseId, partNum, subNum] = subpartMatch;
      const converted = `${baseId}-part-${partNum}-sub-${subNum}`;
      console.log(`[TableTemplateService] ✅ Converted SUBPART ID: ${questionIdentifier} → ${converted}`);
      return converted;
    }

    // Check for part format: q_XXX_pN → q_XXX-part-N
    const partMatch = questionIdentifier.match(/^(q_\d+)_p(\d+)$/);
    if (partMatch) {
      const [, baseId, partNum] = partMatch;
      const converted = `${baseId}-part-${partNum}`;
      console.log(`[TableTemplateService] ✅ Converted PART ID: ${questionIdentifier} → ${converted}`);
      return converted;
    }

    // No conversion needed (main question or already in correct format)
    console.log(`[TableTemplateService] No conversion needed for ID: ${questionIdentifier}`);
    return questionIdentifier;
  }

  /**
   * Check if a template exists for a question/subquestion
   */
  static async templateExists(
    questionId?: string,
    subQuestionId?: string
  ): Promise<boolean> {
    try {
      const result = await this.loadTemplate(questionId, subQuestionId);
      return result.success && result.template !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * ✅ NEW: Extract table template from question.preview_data and save to database
   * This is called when a question with temporary ID gets saved to database with real UUID
   */
  static async extractAndSaveFromPreviewData(
    questionId: string,
    previewData: string | undefined | null,
    subQuestionId?: string
  ): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      // No preview data - nothing to extract
      if (!previewData) {
        return { success: true }; // Not an error, just nothing to do
      }

      // Parse preview data
      let templateConfig: any;
      try {
        templateConfig = JSON.parse(previewData);
      } catch (parseError) {
        console.warn('[TableTemplateService] Failed to parse preview_data:', parseError);
        return { success: true }; // Not an error, just invalid data
      }

      // Check if it looks like a table template config
      if (!templateConfig.rows || !templateConfig.columns || !templateConfig.cells) {
        console.log('[TableTemplateService] preview_data is not a table template config');
        return { success: true }; // Not a table template
      }

      // Build the template DTO with the real UUID
      const template: TableTemplateDTO = {
        questionId,
        subQuestionId: subQuestionId || undefined,
        rows: templateConfig.rows,
        columns: templateConfig.columns,
        headers: templateConfig.headers || [],
        title: templateConfig.title,
        description: templateConfig.description,
        cells: templateConfig.cells || []
      };

      console.log('[TableTemplateService] Extracting template from preview_data:', {
        questionId,
        subQuestionId,
        templateConfig
      });

      // Save to database
      const result = await this.saveTemplate(template);

      if (result.success) {
        console.log('[TableTemplateService] ✅ Successfully saved template from preview_data');
      } else {
        console.error('[TableTemplateService] ❌ Failed to save template from preview_data:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[TableTemplateService] Error extracting template from preview_data:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Load template from either production tables OR review tables
   * Checks review tables first (if reviewSessionId provided), then production tables
   * This allows seamless transition from review to production
   */
  static async loadTemplateUniversal(
    questionId?: string,
    subQuestionId?: string,
    reviewSessionId?: string,
    questionIdentifier?: string
  ): Promise<{
    success: boolean;
    template?: TableTemplateDTO;
    error?: string;
    source?: 'production' | 'review';
  }> {
    // If review context provided, load ONLY from review tables (paper setup preview mode)
    if (reviewSessionId && questionIdentifier) {
      // Convert simulation ID format to database format before querying
      const convertedIdentifier = this.convertSimulationIdToDatabaseFormat(questionIdentifier);

      console.log('[TableTemplateService] Loading from REVIEW TABLES only (paper setup mode):', {
        reviewSessionId,
        originalIdentifier: questionIdentifier,
        convertedIdentifier
      });

      const { TableTemplateImportReviewService } = await import('./TableTemplateImportReviewService');

      const reviewResult = await TableTemplateImportReviewService.loadTemplateForReview(
        reviewSessionId,
        convertedIdentifier
      );

      if (reviewResult.success && reviewResult.template) {
        console.log('[TableTemplateService] ✅ Template FOUND in review tables:', {
          rows: reviewResult.template.rows,
          columns: reviewResult.template.columns,
          cellsCount: reviewResult.template.cells.length
        });

        // Convert review DTO to production DTO format
        const productionTemplate: TableTemplateDTO = {
          id: reviewResult.template.id,
          questionId: reviewResult.template.questionIdentifier, // Will be temp ID in review
          subQuestionId: reviewResult.template.isSubquestion ? reviewResult.template.questionIdentifier : undefined,
          rows: reviewResult.template.rows,
          columns: reviewResult.template.columns,
          headers: reviewResult.template.headers,
          title: reviewResult.template.title,
          description: reviewResult.template.description,
          cells: reviewResult.template.cells.map(cell => ({
            rowIndex: cell.rowIndex,
            colIndex: cell.colIndex,
            cellType: cell.cellType,
            lockedValue: cell.lockedValue,
            expectedAnswer: cell.expectedAnswer,
            marks: cell.marks,
            acceptsEquivalentPhrasing: cell.acceptsEquivalentPhrasing,
            caseSensitive: cell.caseSensitive,
            alternativeAnswers: cell.alternativeAnswers
          }))
        };

        return {
          success: true,
          template: productionTemplate,
          source: 'review'
        };
      } else {
        // No template in review tables - return success with no template
        console.log('[TableTemplateService] No template found in review tables (first-time setup)');
        return {
          success: true,
          template: undefined,
          source: 'review'
        };
      }
    }

    // Fall back to production tables (questions setup mode)
    console.log('[TableTemplateService] Loading from PRODUCTION TABLES (questions setup mode)');
    const productionResult = await this.loadTemplate(questionId, subQuestionId);

    if (productionResult.success && productionResult.template) {
      return {
        success: true,
        template: productionResult.template,
        source: 'production'
      };
    }

    return productionResult;
  }
}
