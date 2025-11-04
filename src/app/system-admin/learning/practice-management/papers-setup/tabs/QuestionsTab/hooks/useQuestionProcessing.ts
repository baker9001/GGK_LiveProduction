// src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab/hooks/useQuestionProcessing.ts

/**
 * Custom hook for processing and transforming questions
 * Handles question normalization, validation, and mapping
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from '../../../../../../../components/shared/Toast';

export interface ProcessedQuestion {
  id: string;
  question_number: string;
  question_text: string;
  question_type: string;
  marks: number;
  unit?: string;
  unit_id?: string | null;
  topic: string;
  topic_id?: string | null;
  subtopic: string;
  subtopic_id?: string | null;
  difficulty: string;
  status: string;
  figure: boolean;
  figure_required?: boolean;
  attachments: string[];
  hint?: string;
  explanation?: string;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  parts?: any[];
  correct_answers?: any[];
  options?: any[];
  mcq_type?: string;
  original_topics?: string[];
  original_subtopics?: string[];
  original_unit?: string;
  simulation_flags?: string[];
  simulation_notes?: string;
}

export interface ProcessingStats {
  total: number;
  processed: number;
  withTopics: number;
  withSubtopics: number;
  withUnits: number;
  errors: number;
}

export interface UseQuestionProcessingReturn {
  questions: ProcessedQuestion[];
  stats: ProcessingStats;
  isProcessing: boolean;
  processQuestions: (rawQuestions: any[]) => Promise<ProcessedQuestion[]>;
  validateQuestion: (question: ProcessedQuestion) => string[];
  sanitizeQuestion: (question: any) => ProcessedQuestion;
  updateQuestion: (id: string, updates: Partial<ProcessedQuestion>) => void;
  getQuestionById: (id: string) => ProcessedQuestion | undefined;
}

/**
 * Normalize text for comparison
 */
const normalizeText = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

/**
 * Sanitize question data for storage
 */
export const sanitizeQuestionForStorage = (question: unknown): any => {
  const transform = (value: any): any => {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(transform);
    }

    if (value && typeof value === 'object') {
      const result: Record<string, any> = {};
      Object.entries(value as Record<string, any>).forEach(([key, nestedValue]) => {
        const transformed = transform(nestedValue);
        if (transformed !== undefined) {
          result[key] = transformed;
        }
      });
      return result;
    }

    return value;
  };

  try {
    if (typeof structuredClone === 'function') {
      return transform(structuredClone(question));
    }
  } catch (error) {
    console.warn('structuredClone failed when sanitizing question data:', error);
  }

  try {
    return JSON.parse(
      JSON.stringify(question, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    );
  } catch (error) {
    console.warn('JSON serialization failed when sanitizing question data:', error);
    return transform(question);
  }
};

/**
 * Ensure value is array
 */
export const ensureArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

/**
 * Ensure value is string
 */
export const ensureString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

/**
 * Detect if question requires a figure
 */
export const requiresFigure = (question: any): boolean => {
  if (question.figure_required === true) return true;
  if (question.figure === true) return true;

  const questionText = ensureString(question.question_text || question.text || '').toLowerCase();
  const figureKeywords = ['diagram', 'figure', 'graph', 'chart', 'illustration', 'shown', 'image'];

  return figureKeywords.some(keyword => questionText.includes(keyword));
};

/**
 * Detect answer format from question
 * PRIORITY ORDER:
 * 1. Explicit answer_format field from JSON (highest priority)
 * 2. Presence of options array (MCQ detection)
 * 3. Question type indicators
 * 4. Question text analysis (fallback)
 */
export const detectAnswerFormat = (question: any): string => {
  // CRITICAL FIX: Prioritize explicit answer_format from JSON
  // This preserves the original format specified in imported questions
  if (question.answer_format && question.answer_format !== '' && question.answer_format !== 'undefined') {
    return question.answer_format;
  }

  // Check for MCQ indicators
  if (question.options && Array.isArray(question.options) && question.options.length > 0) {
    return 'mcq';
  }

  if (question.question_type === 'mcq' || question.type === 'multiple_choice') {
    return 'mcq';
  }

  // Analyze question text for format hints
  const questionText = ensureString(question.question_text || question.question_description || '').toLowerCase();

  if (questionText.includes('calculate') || questionText.includes('work out')) {
    return 'calculation';
  }

  if (questionText.includes('draw') || questionText.includes('sketch')) {
    return 'diagram';
  }

  if (questionText.includes('table') || questionText.includes('complete table')) {
    return 'table_completion';
  }

  if (questionText.includes('graph') || questionText.includes('plot')) {
    return 'graph';
  }

  if (questionText.includes('explain') || questionText.includes('describe')) {
    return 'multi_line';
  }

  if (questionText.includes('state') || questionText.includes('name') || questionText.includes('give')) {
    return 'single_line';
  }

  // Default fallback
  return 'single_line';
};

/**
 * Hook for question processing
 */
export function useQuestionProcessing(): UseQuestionProcessingReturn {
  const [questions, setQuestions] = useState<ProcessedQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const stats = useMemo<ProcessingStats>(() => {
    return {
      total: questions.length,
      processed: questions.filter(q => q.status !== 'error').length,
      withTopics: questions.filter(q => q.topic && q.topic !== '').length,
      withSubtopics: questions.filter(q => q.subtopic && q.subtopic !== '').length,
      withUnits: questions.filter(q => q.unit && q.unit !== '').length,
      errors: questions.filter(q => q.status === 'error').length
    };
  }, [questions]);

  const sanitizeQuestion = useCallback((question: any): ProcessedQuestion => {
    // CRITICAL FIX: Detect answer format while preserving JSON field priority
    const detectedAnswerFormat = detectAnswerFormat(question);

    // CRITICAL FIX: Preserve answer_requirement from JSON or provide meaningful default
    let answerRequirement = question.answer_requirement;
    if (!answerRequirement || answerRequirement === '' || answerRequirement === 'undefined') {
      // Derive based on answer format and correct answers presence
      if (question.correct_answers && Array.isArray(question.correct_answers) && question.correct_answers.length > 0) {
        if (question.correct_answers.length === 1) {
          answerRequirement = 'Single correct answer required';
        } else {
          answerRequirement = `Accept any valid answer from ${question.correct_answers.length} alternatives`;
        }
      } else if (detectedAnswerFormat === 'multi_line') {
        answerRequirement = 'Detailed explanation required';
      } else if (detectedAnswerFormat === 'calculation') {
        answerRequirement = 'Show working and final answer';
      } else {
        answerRequirement = 'Provide a clear and accurate answer';
      }
    }

    return {
      id: question.id || `q_${Date.now()}_${Math.random()}`,
      question_number: ensureString(question.question_number || question.number),
      question_text: ensureString(question.question_text || question.text),
      question_type: ensureString(question.question_type || question.type || 'standard'),
      marks: typeof question.marks === 'number' ? question.marks : parseInt(question.marks) || 0,
      unit: ensureString(question.unit || question.chapter || ''),
      unit_id: question.unit_id || null,
      topic: ensureString(question.topic || ''),
      topic_id: question.topic_id || null,
      subtopic: ensureString(question.subtopic || ''),
      subtopic_id: question.subtopic_id || null,
      difficulty: ensureString(question.difficulty || 'medium'),
      status: question.status || 'pending',
      figure: requiresFigure(question),
      figure_required: question.figure_required || false,
      attachments: ensureArray(question.attachments),
      hint: question.hint,
      explanation: question.explanation,
      answer_format: detectedAnswerFormat,
      answer_requirement: answerRequirement,
      total_alternatives: question.total_alternatives,
      parts: ensureArray(question.parts),
      correct_answers: ensureArray(question.correct_answers),
      options: ensureArray(question.options),
      mcq_type: question.mcq_type,
      original_topics: ensureArray(question.topics || question.topic),
      original_subtopics: ensureArray(question.subtopics || question.subtopic),
      original_unit: question.unit || question.chapter,
      simulation_flags: ensureArray(question.simulation_flags),
      simulation_notes: question.simulation_notes
    };
  }, []);

  const validateQuestion = useCallback((question: ProcessedQuestion): string[] => {
    const errors: string[] = [];

    if (!question.question_text || question.question_text.trim() === '') {
      errors.push('Question text is required');
    }

    if (!question.question_number || question.question_number.trim() === '') {
      errors.push('Question number is required');
    }

    if (question.marks <= 0) {
      errors.push('Marks must be greater than 0');
    }

    if (!question.topic || question.topic.trim() === '') {
      errors.push('Topic is required');
    }

    if (question.answer_format === 'mcq' && (!question.options || question.options.length === 0)) {
      errors.push('MCQ questions must have options');
    }

    return errors;
  }, []);

  const processQuestions = useCallback(async (rawQuestions: any[]): Promise<ProcessedQuestion[]> => {
    setIsProcessing(true);

    try {
      const processed = rawQuestions.map(q => {
        try {
          return sanitizeQuestion(q);
        } catch (error) {
          console.error('Error processing question:', error);
          toast.error(`Error processing question: ${q.question_number || 'Unknown'}`);
          return {
            ...sanitizeQuestion(q),
            status: 'error'
          };
        }
      });

      setQuestions(processed);
      return processed;
    } catch (error) {
      console.error('Error in processQuestions:', error);
      toast.error('Failed to process questions');
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [sanitizeQuestion]);

  const updateQuestion = useCallback((id: string, updates: Partial<ProcessedQuestion>) => {
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const getQuestionById = useCallback((id: string) => {
    return questions.find(q => q.id === id);
  }, [questions]);

  return {
    questions,
    stats,
    isProcessing,
    processQuestions,
    validateQuestion,
    sanitizeQuestion,
    updateQuestion,
    getQuestionById
  };
}
