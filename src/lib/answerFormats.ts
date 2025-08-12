// src/lib/answerFormats.ts
// Answer format detection and configuration

export interface AnswerFormat {
  type: string;
  label: string;
  description: string;
  validation?: (answer: string) => boolean;
  scoring?: (answer: string, correctAnswer: string) => number;
  normalizer?: (answer: string) => string;
}

export const answerFormats: Record<string, AnswerFormat> = {
  single_word: {
    type: 'single_word',
    label: 'Single Word',
    description: 'One word answer',
    validation: (answer) => answer.trim().split(/\s+/).length === 1,
    normalizer: (answer) => answer.trim().toLowerCase()
  },
  
  single_line: {
    type: 'single_line',
    label: 'Single Line',
    description: 'Short text answer',
    normalizer: (answer) => answer.trim()
  },
  
  two_items: {
    type: 'two_items',
    label: 'Two Items',
    description: 'Two separate answers',
    validation: (answer) => {
      const parts = answer.split(/[,;]/);
      return parts.length === 2 && parts.every(p => p.trim().length > 0);
    }
  },
  
  two_items_connected: {
    type: 'two_items_connected',
    label: 'Two Connected Items',
    description: 'Two items with connector (and/or)',
    validation: (answer) => {
      return /\s+(and|or)\s+/i.test(answer);
    }
  },
  
  multi_line: {
    type: 'multi_line',
    label: 'Multi Line',
    description: 'Multiple lines of text'
  },
  
  multi_line_labeled: {
    type: 'multi_line_labeled',
    label: 'Labeled Multi Line',
    description: 'Multiple labeled answers (A, B, C...)',
    validation: (answer) => {
      try {
        const parsed = JSON.parse(answer);
        return typeof parsed === 'object' && Object.keys(parsed).length > 0;
      } catch {
        return false;
      }
    }
  },
  
  calculation: {
    type: 'calculation',
    label: 'Calculation',
    description: 'Mathematical calculation with steps',
    scoring: (answer, correctAnswer) => {
      // Custom scoring for calculations - partial credit for correct method
      const answerSteps = answer.toLowerCase().split('\n');
      const correctSteps = correctAnswer.toLowerCase().split('\n');
      let score = 0;
      
      // Check for key calculation steps
      correctSteps.forEach(step => {
        if (answerSteps.some(aStep => aStep.includes(step))) {
          score += 1 / correctSteps.length;
        }
      });
      
      return Math.min(score, 1);
    }
  },
  
  equation: {
    type: 'equation',
    label: 'Equation',
    description: 'Mathematical or chemical equation',
    normalizer: (answer) => {
      // Remove extra spaces and normalize mathematical notation
      return answer.replace(/\s+/g, ' ').trim();
    }
  },
  
  diagram: {
    type: 'diagram',
    label: 'Diagram',
    description: 'Hand-drawn diagram',
    validation: (answer) => {
      return answer.startsWith('data:image/');
    }
  },
  
  structural_diagram: {
    type: 'structural_diagram',
    label: 'Structural Diagram',
    description: 'Chemical structure drawing',
    validation: (answer) => {
      try {
        const parsed = JSON.parse(answer);
        return parsed.atoms && parsed.bonds;
      } catch {
        return false;
      }
    }
  },
  
  chemical_structure: {
    type: 'chemical_structure',
    label: 'Chemical Structure',
    description: 'Molecular structure editor',
    validation: (answer) => {
      try {
        const parsed = JSON.parse(answer);
        return parsed.atoms && Array.isArray(parsed.atoms);
      } catch {
        return false;
      }
    }
  },
  
  table: {
    type: 'table',
    label: 'Table',
    description: 'Data table',
    validation: (answer) => {
      try {
        const parsed = JSON.parse(answer);
        return parsed.data && Array.isArray(parsed.data);
      } catch {
        return false;
      }
    }
  },
  
  code: {
    type: 'code',
    label: 'Code',
    description: 'Programming code',
    scoring: (answer, correctAnswer) => {
      // Remove comments and whitespace for comparison
      const normalizeCode = (code: string) => 
        code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
           .replace(/\s+/g, ' ')
           .trim();
      
      const normalizedAnswer = normalizeCode(answer);
      const normalizedCorrect = normalizeCode(correctAnswer);
      
      // Basic similarity check
      if (normalizedAnswer === normalizedCorrect) return 1;
      
      // Partial credit for containing key elements
      const keywords = normalizedCorrect.match(/\b(function|def|class|return|for|while|if)\b/g) || [];
      const matchedKeywords = keywords.filter(kw => normalizedAnswer.includes(kw));
      
      return matchedKeywords.length / Math.max(keywords.length, 1) * 0.8;
    }
  },
  
  audio: {
    type: 'audio',
    label: 'Audio Recording',
    description: 'Voice recording',
    validation: (answer) => {
      return answer.startsWith('blob:') || answer.startsWith('data:audio/');
    }
  },
  
  graph: {
    type: 'graph',
    label: 'Graph',
    description: 'Function graph',
    validation: (answer) => {
      try {
        const parsed = JSON.parse(answer);
        return parsed.equation && parsed.points;
      } catch {
        return false;
      }
    }
  },
  
  file_upload: {
    type: 'file_upload',
    label: 'File Upload',
    description: 'Document upload',
    validation: (answer) => {
      try {
        const parsed = JSON.parse(answer);
        return parsed.name && parsed.url;
      } catch {
        return false;
      }
    }
  }
};

// Auto-detect answer format from question text
export function detectAnswerFormat(questionText: string): string {
  const text = String(questionText || '').toLowerCase();
  
  // Check for specific patterns
  if (text.includes('draw') && (text.includes('structure') || text.includes('benzene') || text.includes('molecule'))) {
    return 'chemical_structure';
  }
  
  if (text.includes('draw') || text.includes('sketch') || text.includes('diagram')) {
    return 'diagram';
  }
  
  if (text.includes('table') || text.includes('tabulate')) {
    return 'table';
  }
  
  if (text.includes('calculate') || text.includes('solve') || text.includes('find the value')) {
    return 'calculation';
  }
  
  if (text.includes('equation') || text.includes('formula')) {
    return 'equation';
  }
  
  if (text.includes('code') || text.includes('function') || text.includes('program')) {
    return 'code';
  }
  
  if (text.includes('record') || text.includes('speak') || text.includes('explain verbally')) {
    return 'audio';
  }
  
  if (text.includes('graph') || text.includes('plot')) {
    return 'graph';
  }
  
  if (text.includes('upload') || text.includes('attach') || text.includes('submit')) {
    return 'file_upload';
  }
  
  // Check for dot patterns
  if (/\w+\s*\.{3,}/.test(questionText)) {
    const dotMatches = questionText.match(/\.{3,}/g) || [];
    
    if (dotMatches.length === 1) {
      return 'single_word';
    }
    
    if (questionText.includes(' and ') || questionText.includes(' or ')) {
      return 'two_items_connected';
    }
    
    if (/[A-Z]\s*\.{3,}/.test(questionText)) {
      return 'multi_line_labeled';
    }
    
    if (dotMatches.length === 2) {
      return 'two_items';
    }
  }
  
  // Default based on expected length
  if (text.includes('explain') || text.includes('describe') || text.includes('discuss')) {
    return 'multi_line';
  }
  
  if (text.includes('name') || text.includes('state') || text.includes('identify')) {
    return 'single_line';
  }
  
  return 'single_line';
}

// src/hooks/useAnswerValidation.ts
import { useState, useCallback } from 'react';
import { answerFormats } from '../lib/answerFormats';

interface ValidationResult {
  isValid: boolean;
  message?: string;
  score?: number;
}

export function useAnswerValidation() {
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  
  const validateAnswer = useCallback((
    questionId: string,
    answer: string,
    answerFormat: string,
    correctAnswer?: string
  ): ValidationResult => {
    const format = answerFormats[answerFormat];
    
    if (!format) {
      return { isValid: true };
    }
    
    // Check if answer is empty
    if (!answer || answer.trim() === '') {
      return { isValid: false, message: 'Please provide an answer' };
    }
    
    // Run format-specific validation
    if (format.validation) {
      const isValid = format.validation(answer);
      if (!isValid) {
        return { 
          isValid: false, 
          message: `Invalid format for ${format.label}` 
        };
      }
    }
    
    // Calculate score if correct answer is provided
    let score = 0;
    if (correctAnswer) {
      if (format.scoring) {
        score = format.scoring(answer, correctAnswer);
      } else {
        // Default scoring - exact match after normalization
        const normalizedAnswer = format.normalizer ? format.normalizer(answer) : answer.trim();
        const normalizedCorrect = format.normalizer ? format.normalizer(correctAnswer) : correctAnswer.trim();
        score = normalizedAnswer === normalizedCorrect ? 1 : 0;
      }
    }
    
    const result = { isValid: true, score };
    setValidationResults(prev => ({ ...prev, [questionId]: result }));
    
    return result;
  }, []);
  
  const clearValidation = useCallback((questionId?: string) => {
    if (questionId) {
      setValidationResults(prev => {
        const { [questionId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setValidationResults({});
    }
  }, []);
  
  return {
    validationResults,
    validateAnswer,
    clearValidation
  };
}

// src/components/exam/ExamInterface.tsx
import React, { useState, useEffect } from 'react';
import { DynamicAnswerForm } from './DynamicAnswerForm';
import { useAnswerValidation } from '../../hooks/useAnswerValidation';
import { detectAnswerFormat } from '../../lib/answerFormats';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Save, 
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Question {
  id: string;
  question_number: string;
  question_description: string;
  type: 'mcq' | 'tf' | 'descriptive';
  marks: number;
  answer_format?: string;
  options?: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    order: number;
  }>;
  correct_answer?: string;
  hint?: string;
  explanation?: string;
  subject?: string;
  topic_name?: string;
  attachments?: Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
  }>;
}

interface ExamInterfaceProps {
  examId: string;
  questions: Question[];
  duration: number; // in minutes
  onSubmit: (answers: Record<string, string>) => void;
  onSave?: (answers: Record<string, string>) => void;
  showResults?: boolean;
}

export function ExamInterface({
  examId,
  questions,
  duration,
  onSubmit,
  onSave,
  showResults = false
}: ExamInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // in seconds
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'answered' | 'flagged' | 'unanswered'>>({});
  
  const { validateAnswer, validationResults } = useAnswerValidation();
  
  const currentQuestion = questions[currentQuestionIndex];
  
  // Auto-detect answer format if not specified
  const questionWithFormat = {
    ...currentQuestion,
    answer_format: currentQuestion.answer_format || 
                   (currentQuestion.type === 'descriptive' ? detectAnswerFormat(currentQuestion.question_description) : undefined)
  };
  
  // Timer effect
  useEffect(() => {
    if (submitted || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);
  
  // Auto-save effect
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (onSave && !submitted) {
        onSave(answers);
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [answers, onSave, submitted]);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleAnswerChange = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
    
    // Update question status
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: answer ? 'answered' : 'unanswered'
    }));
    
    // Validate answer if in practice mode
    if (showResults && currentQuestion.correct_answer) {
      validateAnswer(
        currentQuestion.id,
        answer,
        questionWithFormat.answer_format || 'single_line',
        currentQuestion.correct_answer
      );
    }
  };
  
  const handleSubmit = () => {
    if (!submitted) {
      setSubmitted(true);
      onSubmit(answers);
    }
  };
  
  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      setShowHint(false);
    }
  };
  
  const getQuestionStatus = (questionId: string) => {
    return questionStatuses[questionId] || 'unanswered';
  };
  
  const getAnsweredCount = () => {
    return Object.values(questionStatuses).filter(status => status === 'answered').length;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Exam in Progress
            </h1>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className={`h-5 w-5 ${timeRemaining < 300 ? 'text-red-500' : 'text-gray-500'}`} />
                <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {getAnsweredCount()} of {questions.length} answered
              </div>
              
              {onSave && !submitted && (
                <button
                  onClick={() => onSave(answers)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Progress</span>
                </button>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={submitted}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span>Submit Exam</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Questions
              </h2>
              
              <div className="grid grid-cols-5 gap-2">
                {questions.map((question, index) => {
                  const status = getQuestionStatus(question.id);
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={question.id}
                      onClick={() => navigateToQuestion(index)}
                      className={`
                        relative p-2 rounded-lg text-sm font-medium transition-all
                        ${isCurrent ? 'ring-2 ring-blue-500' : ''}
                        ${status === 'answered' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : status === 'flagged'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }
                        hover:shadow-md
                      `}
                    >
                      {index + 1}
                      {status === 'answered' && (
                        <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Question Area */}
          <div className="col-span-9">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {/* Question Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {currentQuestion.hint && !submitted && (
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                    >
                      <AlertCircle className="h-5 w-5" />
                      <span>{showHint ? 'Hide' : 'Show'} Hint</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Question Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Attachments */}
                {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reference Materials:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.attachments.map(attachment => (
                        <a
                          key={attachment.id}
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {attachment.file_name}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Question Text */}
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-900 dark:text-white whitespace-pre-line">
                    {currentQuestion.question_description}
                  </p>
                </div>
                
                {/* Hint */}
                {showHint && currentQuestion.hint && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {currentQuestion.hint}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Answer Form */}
                <DynamicAnswerForm
                  question={questionWithFormat}
                  answer={answers[currentQuestion.id] || ''}
                  onAnswerChange={handleAnswerChange}
                  showResult={showResults && submitted}
                  isCorrect={validationResults[currentQuestion.id]?.score === 1}
                  disabled={submitted}
                />
                
                {/* Explanation (shown after submission in practice mode) */}
                {showResults && submitted && currentQuestion.explanation && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Explanation:
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Navigation Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span>Previous</span>
                  </button>
                  
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Press Enter to go to next question
                  </span>
                  
                  <button
                    onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/pages/student/ExamPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamInterface } from '../../components/exam/ExamInterface';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

export function StudentExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  useEffect(() => {
    loadExamData();
  }, [examId]);
  
  const loadExamData = async () => {
    try {
      // Load exam details
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      
      if (examError) throw examError;
      
      // Load questions with attachments
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select(`
          *,
          question:questions_master_admin(
            *,
            options:question_options(*),
            attachments:questions_attachments(*)
          )
        `)
        .eq('exam_id', examId)
        .order('order_index');
      
      if (questionsError) throw questionsError;
      
      // Transform questions for the interface
      const transformedQuestions = questionsData.map(eq => ({
        id: eq.question.id,
        question_number: eq.order_index.toString(),
        question_description: eq.question.question_description,
        type: eq.question.type,
        marks: eq.question.marks,
        answer_format: eq.question.answer_format,
        options: eq.question.options,
        correct_answer: eq.question.correct_answer,
        hint: eq.question.hint,
        explanation: eq.question.explanation,
        subject: eq.question.subject_name,
        topic_name: eq.question.topic_name,
        attachments: eq.question.attachments
      }));
      
      setExamData(exam);
      setQuestions(transformedQuestions);
    } catch (error) {
      console.error('Error loading exam:', error);
      showToast('Failed to load exam', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (answers: Record<string, string>) => {
    try {
      // Create exam attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          student_id: supabase.auth.user().id,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .select()
        .single();
      
      if (attemptError) throw attemptError;
      
      // Save answers
      const answersData = Object.entries(answers).map(([questionId, answer]) => ({
        attempt_id: attempt.id,
        question_id: questionId,
        answer_text: answer,
        answered_at: new Date().toISOString()
      }));
      
      const { error: answersError } = await supabase
        .from('exam_answers')
        .insert(answersData);
      
      if (answersError) throw answersError;
      
      showToast('Exam submitted successfully!', 'success');
      navigate(`/student/exams/${examId}/results/${attempt.id}`);
    } catch (error) {
      console.error('Error submitting exam:', error);
      showToast('Failed to submit exam', 'error');
    }
  };
  
  const handleSave = async (answers: Record<string, string>) => {
    try {
      // Save progress to local storage or temporary table
      localStorage.setItem(`exam_${examId}_progress`, JSON.stringify({
        answers,
        savedAt: new Date().toISOString()
      }));
      
      showToast('Progress saved', 'success');
    } catch (error) {
      console.error('Error saving progress:', error);
      showToast('Failed to save progress', 'error');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }
  
  if (!examData || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Exam not found or no questions available.</p>
          <button
            onClick={() => navigate('/student/exams')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <ExamInterface
      examId={examId}
      questions={questions}
      duration={examData.duration_minutes}
      onSubmit={handleSubmit}
      onSave={handleSave}
      showResults={examData.show_results_immediately}
    />
  );
}