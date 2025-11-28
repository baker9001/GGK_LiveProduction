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

        if (cell.caseSensitive) {
          isCorrect = studentStr === expectedStr;
        } else {
          isCorrect = studentStr.toLowerCase() === expectedStr.toLowerCase();
        }

        // Check alternative answers
        if (!isCorrect && cell.alternativeAnswers && cell.alternativeAnswers.length > 0) {
          isCorrect = cell.alternativeAnswers.some(alt =>
            cell.caseSensitive
              ? studentStr === alt.trim()
              : studentStr.toLowerCase() === alt.trim().toLowerCase()
          );
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
}
