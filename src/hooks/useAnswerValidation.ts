// src/hooks/useAnswerValidation.ts

import { useState, useCallback } from 'react';

interface Question {
  id: string;
  type: 'mcq' | 'tf' | 'descriptive';
  answer_format?: string;
  correct_answer?: string;
  correct_answers?: Array<{
    answer: string;
    marks: number;
    alternative_id: number;
    linked_to?: number | number[];
    context?: {
      type: string;
      value: string;
      label: string;
    };
  }>;
  answer_requirement?: string;
  marks: number;
  options?: Array<{ label: string; text: string; is_correct?: boolean }>;
}

interface ValidationResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback: string[];
  correctAnswers?: string[];
  partialCredit?: {
    earned: number;
    reason: string;
  }[];
}

interface UseAnswerValidationReturn {
  validateAnswer: (question: Question, userAnswer: any) => ValidationResult;
  calculateScore: (validations: ValidationResult[]) => {
    totalScore: number;
    maxScore: number;
    percentage: number;
  };
  getAnswerFeedback: (question: Question, userAnswer: any) => string[];
}

export const useAnswerValidation = (): UseAnswerValidationReturn => {
  // Normalize answer for comparison
  const normalizeAnswer = (answer: string): string => {
    return answer
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?]/g, '');
  };

  // Check if answers match (with some flexibility)
  const answersMatch = (userAnswer: string, correctAnswer: string, strict: boolean = false): boolean => {
    if (strict) {
      return userAnswer.trim() === correctAnswer.trim();
    }
    
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);
    
    // Exact match
    if (normalizedUser === normalizedCorrect) return true;
    
    // Check for alternative forms (e.g., "2+" vs "2⁺")
    const chemicalVariations: { [key: string]: string[] } = {
      '2+': ['2⁺', '2 +', '+2'],
      '2-': ['2⁻', '2 -', '-2'],
      '3+': ['3⁺', '3 +', '+3'],
      '3-': ['3⁻', '3 -', '-3'],
      'h2o': ['h₂o', 'water'],
      'co2': ['co₂', 'carbon dioxide'],
      'o2': ['o₂', 'oxygen'],
    };
    
    for (const [key, variations] of Object.entries(chemicalVariations)) {
      if (variations.includes(normalizedUser) && normalizedCorrect === key) return true;
      if (normalizedUser === key && variations.includes(normalizedCorrect)) return true;
    }
    
    return false;
  };

  // Validate MCQ answer
  const validateMCQ = (question: Question, userAnswer: any): ValidationResult => {
    const userSelections = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    let score = 0;
    const feedback: string[] = [];
    const correctAnswers: string[] = [];

    // First, check if options have is_correct flags (preferred method)
    if (question.options && question.options.length > 0) {
      const correctOptions = question.options
        .filter(opt => opt.is_correct)
        .map(opt => opt.label);

      correctAnswers.push(...correctOptions);

      if (correctOptions.length === 0) {
        // No options marked as correct, fallback to other methods
        // Continue to check correct_answer or correct_answers below
      } else {
        // Check user selections against correct options
        const normalizeLabel = (label: string) => label.trim().toLowerCase();
        const correctSelections = userSelections.filter((sel: string) =>
          correctOptions.some(correct => normalizeLabel(correct) === normalizeLabel(sel))
        );

        if (question.answer_requirement === 'both_required' || question.answer_requirement === 'all_required') {
          // All correct options must be selected
          const allCorrect = correctOptions.every(opt =>
            userSelections.some((sel: string) => normalizeLabel(sel) === normalizeLabel(opt))
          );
          if (allCorrect && userSelections.length === correctOptions.length) {
            score = question.marks;
            feedback.push('All correct answers selected!');
          } else {
            const missing = correctOptions.filter(opt =>
              !userSelections.some((sel: string) => normalizeLabel(sel) === normalizeLabel(opt))
            );
            const extra = userSelections.filter((sel: string) =>
              !correctOptions.some(correct => normalizeLabel(correct) === normalizeLabel(sel))
            );
            if (missing.length > 0) feedback.push(`Missing: ${missing.join(', ')}`);
            if (extra.length > 0) feedback.push(`Incorrect selections: ${extra.join(', ')}`);
          }
        } else if (question.answer_requirement?.includes('any_')) {
          // Any N from the correct options
          const required = parseInt(question.answer_requirement.match(/any_(\w+)_/)?.[1] || '1');

          if (correctSelections.length >= required) {
            score = question.marks;
            feedback.push(`Correct! You selected ${correctSelections.length} valid option(s).`);
          } else {
            const partialScore = (correctSelections.length / required) * question.marks;
            score = Math.round(partialScore * 10) / 10;
            feedback.push(`Partial credit: ${correctSelections.length} out of ${required} required.`);
          }
        } else {
          // Single correct answer (default MCQ behavior)
          if (correctSelections.length > 0) {
            score = question.marks;
            feedback.push('Correct answer!');
          } else {
            feedback.push(`Incorrect. The correct answer is ${correctOptions.join(', ')}.`);
          }
        }

        return {
          isCorrect: score === question.marks,
          score,
          maxScore: question.marks,
          feedback,
          correctAnswers
        };
      }
    }

    // Fallback: check correct_answer or correct_answers
    if (question.correct_answer) {
      // Single correct answer
      correctAnswers.push(question.correct_answer);
      if (userSelections.includes(question.correct_answer)) {
        score = question.marks;
        feedback.push('Correct answer!');
      } else {
        feedback.push(`Incorrect. The correct answer is ${question.correct_answer}.`);
      }
    } else if (question.correct_answers) {
      // Multiple correct answers
      const correctOptions = question.correct_answers.map(ca => ca.answer);
      correctAnswers.push(...correctOptions);

      if (question.answer_requirement === 'both_required' || question.answer_requirement === 'all_required') {
        const allCorrect = correctOptions.every(opt => userSelections.includes(opt));
        if (allCorrect && userSelections.length === correctOptions.length) {
          score = question.marks;
          feedback.push('All correct answers selected!');
        } else {
          const missing = correctOptions.filter(opt => !userSelections.includes(opt));
          const extra = userSelections.filter((sel: string) => !correctOptions.includes(sel));
          if (missing.length > 0) feedback.push(`Missing: ${missing.join(', ')}`);
          if (extra.length > 0) feedback.push(`Incorrect selections: ${extra.join(', ')}`);
        }
      } else if (question.answer_requirement?.includes('any_')) {
        const required = parseInt(question.answer_requirement.match(/any_(\w+)_/)?.[1] || '1');
        const correctSelections = userSelections.filter((sel: string) => correctOptions.includes(sel));

        if (correctSelections.length >= required) {
          score = question.marks;
          feedback.push(`Correct! You selected ${correctSelections.length} valid option(s).`);
        } else {
          const partialScore = (correctSelections.length / required) * question.marks;
          score = Math.round(partialScore * 10) / 10;
          feedback.push(`Partial credit: ${correctSelections.length} out of ${required} required.`);
        }
      }
    }

    return {
      isCorrect: score === question.marks,
      score,
      maxScore: question.marks,
      feedback,
      correctAnswers
    };
  };

  // Validate True/False answer
  const validateTrueFalse = (question: Question, userAnswer: any): ValidationResult => {
    const correctAnswer = question.correct_answer?.toLowerCase() === 'true' || 
                         question.correct_answer === 'T';
    const isCorrect = userAnswer === correctAnswer;
    
    return {
      isCorrect,
      score: isCorrect ? question.marks : 0,
      maxScore: question.marks,
      feedback: [isCorrect ? 'Correct!' : `Incorrect. The answer is ${correctAnswer ? 'True' : 'False'}.`],
      correctAnswers: [correctAnswer ? 'True' : 'False']
    };
  };

  // Validate descriptive answer
  const validateDescriptive = (question: Question, userAnswer: any): ValidationResult => {
    let score = 0;
    const feedback: string[] = [];
    const partialCredit: { earned: number; reason: string }[] = [];
    const correctAnswers: string[] = [];

    // Handle different answer formats
    if (question.answer_format === 'two_items_connected' && typeof userAnswer === 'object') {
      // Check two connected items
      if (question.correct_answers && question.correct_answers.length >= 2) {
        const item1Correct = question.correct_answers.some(ca => 
          answersMatch(userAnswer.item1 || '', ca.answer)
        );
        const item2Correct = question.correct_answers.some(ca => 
          answersMatch(userAnswer.item2 || '', ca.answer)
        );
        
        if (item1Correct && item2Correct) {
          score = question.marks;
          feedback.push('Both items correct!');
        } else {
          if (item1Correct) {
            partialCredit.push({ earned: question.marks / 2, reason: 'First item correct' });
            score += question.marks / 2;
          }
          if (item2Correct) {
            partialCredit.push({ earned: question.marks / 2, reason: 'Second item correct' });
            score += question.marks / 2;
          }
          if (!item1Correct && !item2Correct) {
            feedback.push('Both items incorrect.');
          }
        }
        correctAnswers.push(...question.correct_answers.map(ca => ca.answer));
      }
    } else if (question.answer_format === 'multi_line_labeled' && typeof userAnswer === 'object') {
      // Check labeled multi-line answers
      if (question.correct_answers) {
        for (const correctAns of question.correct_answers) {
          const label = correctAns.context?.value?.split('_').pop()?.toUpperCase() || '';
          if (label && userAnswer[label]) {
            if (answersMatch(userAnswer[label], correctAns.answer)) {
              score += correctAns.marks;
              partialCredit.push({ earned: correctAns.marks, reason: `${label} correct` });
            }
          }
          correctAnswers.push(`${label}: ${correctAns.answer}`);
        }
      }
    } else {
      // Single answer or general descriptive
      const userAnswerStr = typeof userAnswer === 'object' ? userAnswer.main : userAnswer;
      
      if (question.correct_answer) {
        if (answersMatch(userAnswerStr || '', question.correct_answer)) {
          score = question.marks;
          feedback.push('Correct answer!');
        } else {
          feedback.push('Incorrect answer.');
        }
        correctAnswers.push(question.correct_answer);
      } else if (question.correct_answers) {
        // Check if user answer matches any correct answer
        let matched = false;
        for (const correctAns of question.correct_answers) {
          if (answersMatch(userAnswerStr || '', correctAns.answer)) {
            score = question.marks;
            feedback.push('Correct answer!');
            matched = true;
            break;
          }
        }
        
        if (!matched && question.answer_requirement === 'both_required') {
          // Check if answer contains all required components
          const components = question.correct_answers.map(ca => ca.answer.toLowerCase());
          const userLower = (userAnswerStr || '').toLowerCase();
          const foundComponents = components.filter(comp => userLower.includes(comp));
          
          if (foundComponents.length > 0) {
            const partialScore = (foundComponents.length / components.length) * question.marks;
            score = Math.round(partialScore * 10) / 10;
            partialCredit.push({ 
              earned: score, 
              reason: `Found ${foundComponents.length} of ${components.length} required components` 
            });
          }
        }
        
        correctAnswers.push(...question.correct_answers.map(ca => ca.answer));
      }
    }

    // Generate comprehensive feedback
    if (score === question.marks) {
      feedback.push('Full marks awarded!');
    } else if (score > 0) {
      feedback.push(`Partial credit: ${score} out of ${question.marks} marks.`);
    } else {
      feedback.push('No marks awarded. Review the correct answer(s).');
    }

    return {
      isCorrect: score === question.marks,
      score,
      maxScore: question.marks,
      feedback,
      correctAnswers,
      partialCredit: partialCredit.length > 0 ? partialCredit : undefined
    };
  };

  // Main validation function
  const validateAnswer = useCallback((question: Question, userAnswer: any): ValidationResult => {
    if (!userAnswer || (typeof userAnswer === 'string' && !userAnswer.trim())) {
      return {
        isCorrect: false,
        score: 0,
        maxScore: question.marks,
        feedback: ['No answer provided.'],
        correctAnswers: []
      };
    }

    switch (question.type) {
      case 'mcq':
        return validateMCQ(question, userAnswer);
      case 'tf':
        return validateTrueFalse(question, userAnswer);
      case 'descriptive':
        return validateDescriptive(question, userAnswer);
      default:
        return {
          isCorrect: false,
          score: 0,
          maxScore: question.marks,
          feedback: ['Unknown question type.'],
          correctAnswers: []
        };
    }
  }, []);

  // Calculate total score from multiple validations
  const calculateScore = useCallback((validations: ValidationResult[]) => {
    const totalScore = validations.reduce((sum, v) => sum + v.score, 0);
    const maxScore = validations.reduce((sum, v) => sum + v.maxScore, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return {
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore,
      percentage
    };
  }, []);

  // Get specific feedback for an answer
  const getAnswerFeedback = useCallback((question: Question, userAnswer: any): string[] => {
    const validation = validateAnswer(question, userAnswer);
    const feedback = [...validation.feedback];

    // Add hints if answer is incorrect
    if (!validation.isCorrect && question.type === 'descriptive') {
      if (question.answer_format === 'single_word') {
        feedback.push('Remember: Only one word is required.');
      } else if (question.answer_format === 'two_items_connected') {
        feedback.push('Remember: Two items connected with AND are required.');
      } else if (question.answer_format === 'equation') {
        feedback.push('Check your chemical equation formatting and balancing.');
      }
    }

    return feedback;
  }, [validateAnswer]);

  return {
    validateAnswer,
    calculateScore,
    getAnswerFeedback
  };
};