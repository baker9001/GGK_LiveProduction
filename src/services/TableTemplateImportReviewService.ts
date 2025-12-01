/**
 * Table Template Import Review Service
 *
 * Handles table template CRUD operations during the import review phase.
 * Uses review-specific tables that don't require real question UUIDs.
 * Templates are stored with question_identifier (string) instead of question_id (UUID).
 * Automatically migrates to production tables when import is approved.
 */

import { supabase } from '@/lib/supabase';

export interface TableTemplateReviewDTO {
  id?: string;
  reviewSessionId: string;
  questionIdentifier: string;
  isSubquestion?: boolean;
  parentQuestionIdentifier?: string;
  rows: number;
  columns: number;
  headers: string[];
  title?: string;
  description?: string;
  cells: TableCellReviewDTO[];
}

export interface TableCellReviewDTO {
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

export class TableTemplateImportReviewService {
  /**
   * Save or update table template during import review
   */
  static async saveTemplateForReview(template: TableTemplateReviewDTO): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      // Validate template
      if (!template.reviewSessionId || !template.questionIdentifier) {
        throw new Error('reviewSessionId and questionIdentifier are required');
      }

      if (template.rows < 2 || template.rows > 50) {
        throw new Error('Rows must be between 2 and 50');
      }

      if (template.columns < 2 || template.columns > 20) {
        throw new Error('Columns must be between 2 and 20');
      }

      console.log('[TableTemplateImportReviewService] Saving template for review:', {
        reviewSessionId: template.reviewSessionId,
        questionIdentifier: template.questionIdentifier,
        rows: template.rows,
        columns: template.columns,
        cellsCount: template.cells.length
      });

      // 1. Upsert template
      const templatePayload: any = {
        review_session_id: template.reviewSessionId,
        question_identifier: template.questionIdentifier,
        is_subquestion: template.isSubquestion || false,
        parent_question_identifier: template.parentQuestionIdentifier || null,
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
        .from('table_templates_import_review')
        .upsert(templatePayload, {
          onConflict: 'review_session_id,question_identifier'
        })
        .select()
        .single();

      if (templateError) {
        console.error('[TableTemplateImportReviewService] Template upsert error:', {
          error: templateError,
          code: templateError.code,
          message: templateError.message,
          details: templateError.details,
          hint: templateError.hint
        });
        throw new Error(`Database error: ${templateError.message || templateError.code || 'Unknown error'}`);
      }

      const templateId = templateData.id;

      console.log('[TableTemplateImportReviewService] Template saved with ID:', templateId);

      // 2. Delete existing cells for this template
      const { error: deleteError } = await supabase
        .from('table_template_cells_import_review')
        .delete()
        .eq('template_id', templateId);

      if (deleteError) {
        console.error('[TableTemplateImportReviewService] Cell deletion error:', deleteError);
        throw deleteError;
      }

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
          .from('table_template_cells_import_review')
          .insert(cellsToInsert);

        if (cellsError) {
          console.error('[TableTemplateImportReviewService] Cell insertion error:', cellsError);
          throw cellsError;
        }

        console.log('[TableTemplateImportReviewService] Inserted', cellsToInsert.length, 'cells');
      }

      console.log('[TableTemplateImportReviewService] ✅ Template saved successfully');

      return { success: true, templateId };
    } catch (error) {
      console.error('[TableTemplateImportReviewService] Error saving template:', error);
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
   * Load table template during import review
   */
  static async loadTemplateForReview(
    reviewSessionId: string,
    questionIdentifier: string
  ): Promise<{
    success: boolean;
    template?: TableTemplateReviewDTO;
    error?: string;
  }> {
    try {
      if (!reviewSessionId || !questionIdentifier) {
        throw new Error('reviewSessionId and questionIdentifier are required');
      }

      console.log('[TableTemplateImportReviewService] Loading template for review:', {
        reviewSessionId,
        questionIdentifier
      });

      // 1. Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from('table_templates_import_review')
        .select('*')
        .eq('review_session_id', reviewSessionId)
        .eq('question_identifier', questionIdentifier)
        .maybeSingle();

      if (templateError) {
        console.error('[TableTemplateImportReviewService] Template fetch error:', templateError);
        throw templateError;
      }

      if (!templateData) {
        console.log('[TableTemplateImportReviewService] No template found');
        return { success: true, template: undefined };
      }

      console.log('[TableTemplateImportReviewService] Template found:', templateData.id);

      // 2. Fetch cells
      const { data: cellsData, error: cellsError } = await supabase
        .from('table_template_cells_import_review')
        .select('*')
        .eq('template_id', templateData.id)
        .order('row_index')
        .order('col_index');

      if (cellsError) {
        console.error('[TableTemplateImportReviewService] Cells fetch error:', cellsError);
        throw cellsError;
      }

      console.log('[TableTemplateImportReviewService] Loaded', cellsData?.length || 0, 'cells');

      // 3. Build DTO
      const template: TableTemplateReviewDTO = {
        id: templateData.id,
        reviewSessionId: templateData.review_session_id,
        questionIdentifier: templateData.question_identifier,
        isSubquestion: templateData.is_subquestion,
        parentQuestionIdentifier: templateData.parent_question_identifier,
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

      console.log('[TableTemplateImportReviewService] ✅ Template loaded successfully');

      return { success: true, template };
    } catch (error) {
      console.error('[TableTemplateImportReviewService] Error loading template:', error);
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
   * Delete table template during import review
   */
  static async deleteTemplateForReview(
    reviewSessionId: string,
    questionIdentifier: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('[TableTemplateImportReviewService] Deleting template:', {
        reviewSessionId,
        questionIdentifier
      });

      const { error } = await supabase
        .from('table_templates_import_review')
        .delete()
        .eq('review_session_id', reviewSessionId)
        .eq('question_identifier', questionIdentifier);

      if (error) {
        console.error('[TableTemplateImportReviewService] Delete error:', error);
        throw error;
      }

      console.log('[TableTemplateImportReviewService] ✅ Template deleted successfully');

      return { success: true };
    } catch (error) {
      console.error('[TableTemplateImportReviewService] Error deleting template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a template exists for a question in review
   */
  static async templateExistsForReview(
    reviewSessionId: string,
    questionIdentifier: string
  ): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('table_templates_import_review')
        .select('id')
        .eq('review_session_id', reviewSessionId)
        .eq('question_identifier', questionIdentifier)
        .maybeSingle();

      return data !== null;
    } catch (error) {
      console.error('[TableTemplateImportReviewService] Error checking template existence:', error);
      return false;
    }
  }

  /**
   * Get all templates for a review session
   */
  static async getTemplatesForSession(
    reviewSessionId: string
  ): Promise<{
    success: boolean;
    templates?: TableTemplateReviewDTO[];
    error?: string;
  }> {
    try {
      const { data: templates, error: templateError } = await supabase
        .from('table_templates_import_review')
        .select(`
          *,
          cells:table_template_cells_import_review(*)
        `)
        .eq('review_session_id', reviewSessionId);

      if (templateError) throw templateError;

      const templatesDTO: TableTemplateReviewDTO[] = (templates || []).map(t => ({
        id: t.id,
        reviewSessionId: t.review_session_id,
        questionIdentifier: t.question_identifier,
        isSubquestion: t.is_subquestion,
        parentQuestionIdentifier: t.parent_question_identifier,
        rows: t.rows,
        columns: t.columns,
        headers: t.headers || [],
        title: t.title,
        description: t.description,
        cells: (t.cells || []).map((cell: any) => ({
          rowIndex: cell.row_index,
          colIndex: cell.col_index,
          cellType: cell.cell_type,
          lockedValue: cell.locked_value,
          expectedAnswer: cell.expected_answer,
          marks: cell.marks,
          acceptsEquivalentPhrasing: cell.accepts_equivalent_phrasing,
          caseSensitive: cell.case_sensitive,
          alternativeAnswers: cell.alternative_answers || []
        }))
      }));

      return { success: true, templates: templatesDTO };
    } catch (error) {
      console.error('[TableTemplateImportReviewService] Error getting session templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Migrate all templates from a review session to production tables
   * Called when import is approved and questions get real UUIDs
   */
  static async migrateTemplatesToProduction(
    reviewSessionId: string,
    questionMapping: Record<string, { question_id?: string; sub_question_id?: string }>
  ): Promise<{
    success: boolean;
    migratedCount?: number;
    error?: string;
  }> {
    try {
      console.log('[TableTemplateImportReviewService] Migrating templates to production:', {
        reviewSessionId,
        mappingKeys: Object.keys(questionMapping)
      });

      // Call the database function to migrate templates
      const { data, error } = await supabase.rpc('migrate_review_templates_to_production', {
        p_review_session_id: reviewSessionId,
        p_question_mapping: questionMapping
      });

      if (error) {
        console.error('[TableTemplateImportReviewService] Migration error:', error);
        throw error;
      }

      const result = data as any;

      if (result.success) {
        console.log('[TableTemplateImportReviewService] ✅ Migration successful:', result.message);
        return {
          success: true,
          migratedCount: result.migrated_count
        };
      } else {
        console.error('[TableTemplateImportReviewService] Migration failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('[TableTemplateImportReviewService] Error migrating templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
