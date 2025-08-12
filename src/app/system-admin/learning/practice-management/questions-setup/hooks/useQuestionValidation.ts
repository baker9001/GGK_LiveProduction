// src/app/system-admin/learning/practice-management/questions-setup/hooks/useQuestionValidation.ts
import { Question, SubQuestion } from '../page';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export function useQuestionValidation() {
  const validateForConfirmation = (question: Question): ValidationResult => {
    const errors: ValidationError[] = [];
    
    // Basic required fields
    if (!question.question_description || question.question_description.trim().length < 10) {
      errors.push({
        field: 'question_description',
        message: 'Question description must be at least 10 characters'
      });
    }
    
    if (!question.marks || question.marks <= 0) {
      errors.push({
        field: 'marks',
        message: 'Marks must be greater than 0'
      });
    }
    
    if (!question.difficulty) {
      errors.push({
        field: 'difficulty',
        message: 'Difficulty level is required'
      });
    }
    
    if (!question.topic_id) {
      errors.push({
        field: 'topic_id',
        message: 'Topic is required'
      });
    }
    
    if (!question.subtopics || question.subtopics.length === 0) {
      errors.push({
        field: 'subtopics',
        message: 'At least one subtopic is required'
      });
    }
    
    if (!question.hint || question.hint.trim().length < 5) {
      errors.push({
        field: 'hint',
        message: 'Hint is required (minimum 5 characters)'
      });
    }
    
    if (!question.explanation || question.explanation.trim().length < 10) {
      errors.push({
        field: 'explanation',
        message: 'Explanation is required (minimum 10 characters)'
      });
    }
    
    // Check for figure/attachment requirements
    const needsAttachment = question.question_description?.toLowerCase().includes('figure') || 
                           question.question_description?.toLowerCase().includes('diagram') ||
                           question.question_description?.toLowerCase().includes('graph') ||
                           question.question_description?.toLowerCase().includes('image');
    
    if (needsAttachment && (!question.attachments || question.attachments.length === 0)) {
      errors.push({
        field: 'attachments',
        message: 'Figure/diagram attachment is required for this question'
      });
    }
    
    // For MCQ/TF questions
    if (question.type === 'mcq' || question.type === 'tf') {
      if (!question.options || question.options.length < 1) {
        errors.push({
          field: 'options',
          message: 'At least one option is required'
        });
      } else {
        // Check if at least one correct answer is marked
        const hasCorrectAnswer = question.options.some(opt => opt.is_correct);
        if (!hasCorrectAnswer) {
          errors.push({
            field: 'options',
            message: 'At least one correct answer must be marked'
          });
        }
        
        // Check if all options have text
        question.options.forEach((opt, index) => {
          if (!opt.option_text || opt.option_text.trim().length === 0) {
            errors.push({
              field: `option_${index}`,
              message: `Option ${index + 1} text cannot be empty`
            });
          }
        });
      }
    }
    
    // Validate sub-questions if they exist
    if (question.parts && question.parts.length > 0) {
      question.parts.forEach((part, index) => {
        const partErrors = validateSubQuestion(part, index);
        errors.push(...partErrors);
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const validateSubQuestion = (subQuestion: SubQuestion, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const prefix = `parts[${index}]`;
    
    if (!subQuestion.question_description || subQuestion.question_description.trim().length < 10) {
      errors.push({
        field: `${prefix}.question_description`,
        message: `Part ${subQuestion.part_label || index + 1}: Description must be at least 10 characters`
      });
    }
    
    if (!subQuestion.marks || subQuestion.marks <= 0) {
      errors.push({
        field: `${prefix}.marks`,
        message: `Part ${subQuestion.part_label || index + 1}: Marks must be greater than 0`
      });
    }
    
    if (!subQuestion.topic_id) {
      errors.push({
        field: `${prefix}.topic_id`,
        message: `Part ${subQuestion.part_label || index + 1}: Topic is required`
      });
    }
    
    if (!subQuestion.subtopics || subQuestion.subtopics.length === 0) {
      errors.push({
        field: `${prefix}.subtopics`,
        message: `Part ${subQuestion.part_label || index + 1}: At least one subtopic is required`
      });
    }
    
    // Check for figure/attachment requirements in sub-questions
    const needsAttachment = subQuestion.question_description?.toLowerCase().includes('figure') || 
                           subQuestion.question_description?.toLowerCase().includes('diagram') ||
                           subQuestion.question_description?.toLowerCase().includes('graph') ||
                           subQuestion.question_description?.toLowerCase().includes('image');
    
    if (needsAttachment && (!subQuestion.attachments || subQuestion.attachments.length === 0)) {
      errors.push({
        field: `${prefix}.attachments`,
        message: `Part ${subQuestion.part_label || index + 1}: Figure/diagram attachment is required`
      });
    }
    
    // For MCQ sub-questions
    if (subQuestion.type === 'mcq' || subQuestion.type === 'tf') {
      if (!subQuestion.options || subQuestion.options.length < 1) {
        errors.push({
          field: `${prefix}.options`,
          message: `Part ${subQuestion.part_label || index + 1}: At least one option is required`
        });
      } else {
        const hasCorrectAnswer = subQuestion.options.some(opt => opt.is_correct);
        if (!hasCorrectAnswer) {
          errors.push({
            field: `${prefix}.options`,
            message: `Part ${subQuestion.part_label || index + 1}: At least one correct answer must be marked`
          });
        }
      }
    }
    
    return errors;
  };
  
  const canConfirmQuestion = (question: Question): boolean => {
    const result = validateForConfirmation(question);
    return result.isValid;
  };
  
  const canConfirmPaper = (questions: Question[]): boolean => {
    // All questions must be individually valid
    const allQuestionsValid = questions.every(q => canConfirmQuestion(q));
    
    // All questions must have active status
    const allQuestionsActive = questions.every(q => q.status === 'active');
    
    return allQuestionsValid && allQuestionsActive;
  };
  
  const getValidationSummary = (questions: Question[]): {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    errors: { questionId: string; questionNumber: string; errors: ValidationError[] }[];
  } => {
    const errorDetails: { questionId: string; questionNumber: string; errors: ValidationError[] }[] = [];
    let validCount = 0;
    
    questions.forEach(question => {
      const result = validateForConfirmation(question);
      if (result.isValid) {
        validCount++;
      } else {
        errorDetails.push({
          questionId: question.id,
          questionNumber: question.question_number,
          errors: result.errors
        });
      }
    });
    
    return {
      totalQuestions: questions.length,
      validQuestions: validCount,
      invalidQuestions: questions.length - validCount,
      errors: errorDetails
    };
  };
  
  return {
    validateForConfirmation,
    validateSubQuestion,
    canConfirmQuestion,
    canConfirmPaper,
    getValidationSummary
  };
}