import { z } from 'zod';

export const questionValidationSchemas = {
  question_description: z.string().min(3, 'Description must be at least 3 characters'),
  marks: z.coerce.number().min(0, 'Marks must be a positive number'),
  topic_id: z.string().uuid('Please select a valid topic'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'Medium-High', 'Medium', 'High', 'Easy'], {
    errorMap: () => ({ message: 'Please select a valid difficulty level' })
  }),
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  })
};

export const normalizeQuestionDifficulty = (difficulty: string): string => {
  const difficultyMap: Record<string, string> = {
    'easy': 'easy',
    'Easy': 'easy',
    'medium': 'medium',
    'Medium': 'medium',
    'Medium-High': 'medium-high',
    'medium-high': 'medium-high',
    'hard': 'hard',
    'High': 'hard'
  };
  
  return difficultyMap[difficulty] || 'medium';
};