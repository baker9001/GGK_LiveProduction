/**
 * Table Grading Service
 *
 * Handles automatic grading of table completion answers
 * Validates student responses against expected answers
 */

import { TableTemplateService, type TableTemplateDTO } from './TableTemplateService';

export interface GradingResult {
  success: boolean;
  totalMarks?: number;
  achievedMarks?: number;
  percentage?: number;
  feedback?: Record<string, CellFeedback>;
  error?: string;
}

export interface CellFeedback {
  isCorrect: boolean;
  expectedAnswer: string;
  studentAnswer: string | number;
  marks: number;
  achievedMarks: number;
  feedback?: string;
}

export class TableGradingService {
  /**
   * Grade student's table completion answers
   */
  static async gradeTableCompletion(
    studentAnswers: Record<string, string | number>,
    questionId?: string,
    subQuestionId?: string
  ): Promise<GradingResult> {
    try {
      // Validate inputs
      if (!questionId && !subQuestionId) {
        throw new Error('Either questionId or subQuestionId must be provided');
      }

      // 1. Load template
      const templateResult = await TableTemplateService.loadTemplate(questionId, subQuestionId);

      if (!templateResult.success) {
        throw new Error(templateResult.error || 'Failed to load template');
      }

      if (!templateResult.template) {
        throw new Error('Template not found for this question');
      }

      const template = templateResult.template;

      // 2. Validate answers
      const validation = TableTemplateService.validateAnswers(studentAnswers, template);

      // 3. Calculate marks
      let achievedMarks = 0;
      const totalMarks = template.cells
        .filter(c => c.cellType === 'editable')
        .reduce((sum, cell) => sum + (cell.marks || 1), 0);

      const feedback: Record<string, CellFeedback> = {};

      template.cells.forEach(cell => {
        if (cell.cellType === 'editable') {
          const cellKey = `${cell.rowIndex}-${cell.colIndex}`;
          const cellResult = validation.cellResults[cellKey];
          const cellMarks = cell.marks || 1;
          const isCorrect = cellResult?.isCorrect || false;

          if (isCorrect) {
            achievedMarks += cellMarks;
          }

          feedback[cellKey] = {
            isCorrect,
            expectedAnswer: cell.expectedAnswer || '',
            studentAnswer: cellResult?.studentAnswer || '',
            marks: cellMarks,
            achievedMarks: isCorrect ? cellMarks : 0,
            feedback: isCorrect
              ? 'Correct!'
              : cellResult?.studentAnswer
              ? `Incorrect. Expected: ${cell.expectedAnswer}`
              : 'No answer provided'
          };
        }
      });

      const percentage = totalMarks > 0 ? (achievedMarks / totalMarks) * 100 : 0;

      return {
        success: true,
        totalMarks,
        achievedMarks,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        feedback
      };
    } catch (error) {
      console.error('Error grading table completion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Grade multiple table completions in batch
   */
  static async gradeBatch(
    submissions: Array<{
      studentAnswers: Record<string, string | number>;
      questionId?: string;
      subQuestionId?: string;
    }>
  ): Promise<GradingResult[]> {
    const results: GradingResult[] = [];

    for (const submission of submissions) {
      const result = await this.gradeTableCompletion(
        submission.studentAnswers,
        submission.questionId,
        submission.subQuestionId
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Get detailed cell-by-cell feedback
   */
  static getCellFeedback(
    cellKey: string,
    studentAnswer: string | number,
    template: TableTemplateDTO
  ): CellFeedback | null {
    const [row, col] = cellKey.split('-').map(Number);
    const cell = template.cells.find(
      c => c.rowIndex === row && c.colIndex === col && c.cellType === 'editable'
    );

    if (!cell) return null;

    const studentStr = String(studentAnswer).trim();
    const expectedStr = String(cell.expectedAnswer || '').trim();

    let isCorrect = false;

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

    const cellMarks = cell.marks || 1;

    return {
      isCorrect,
      expectedAnswer: cell.expectedAnswer || '',
      studentAnswer,
      marks: cellMarks,
      achievedMarks: isCorrect ? cellMarks : 0,
      feedback: isCorrect
        ? 'Correct!'
        : `Incorrect. Expected: ${cell.expectedAnswer}`
    };
  }

  /**
   * Calculate overall statistics for a template
   */
  static calculateStatistics(results: GradingResult[]): {
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number; // Percentage of students who scored >= 50%
  } {
    if (results.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0
      };
    }

    const scores = results
      .filter(r => r.success && r.percentage !== undefined)
      .map(r => r.percentage!);

    const totalStudents = scores.length;
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalStudents;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passCount = scores.filter(score => score >= 50).length;
    const passRate = (passCount / totalStudents) * 100;

    return {
      totalStudents,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      lowestScore,
      passRate: Math.round(passRate * 10) / 10
    };
  }
}
